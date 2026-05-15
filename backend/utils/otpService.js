// In-memory OTP store (transient data, does not need persistence)
const otpStore = [];
let nextOtpId = 1;

// Load AWS SDK v3 for real SMS (optional — falls back to mock if not configured)
let snsClient = null;
try {
  const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
  snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1'
  });
} catch (err) {
  console.warn('AWS SNS SDK not available, SMS will be mocked');
}

// Load Twilio for real SMS (optional — preferred over AWS SNS for OTP)
let twilioClient = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('Twilio client initialized');
  }
} catch (err) {
  console.warn('Twilio not available:', err.message);
}

// Load Fast2SMS config for India-native SMS
const fast2smsApiKey = process.env.FAST2SMS_API_KEY || null;

// Generate 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Format phone number to E.164 format required by AWS SNS.
 * If number already starts with '+', return as-is.
 * Otherwise prepend default country code (default: +91 for India).
 */
const formatPhoneE164 = (phone) => {
  if (!phone) return '';
  // If already has + prefix, clean and return
  if (phone.startsWith('+')) {
    return '+' + phone.replace(/\D/g, '');
  }
  const cleaned = phone.replace(/\D/g, '');
  const countryCode = process.env.DEFAULT_COUNTRY_CODE || '91';
  // If number already includes country code (e.g., 91xxxxxxxxxx for 12 digits)
  if (cleaned.length > 10) return '+' + cleaned;
  return `+${countryCode}${cleaned}`;
};

// Real SMS sender via AWS SNS v3
const sendRealSms = async (phone, message) => {
  if (!snsClient) {
    throw new Error('AWS SNS not initialized');
  }
  const formattedPhone = formatPhoneE164(phone);
  const { PublishCommand } = require('@aws-sdk/client-sns');
  const params = {
    Message: message,
    PhoneNumber: formattedPhone,
    MessageAttributes: {
      'AWS.SNS.SMS.SenderID': {
        DataType: 'String',
        StringValue: process.env.SMS_SENDER_ID || 'MealNexus'
      },
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional'
      }
    }
  };
  const result = await snsClient.send(new PublishCommand(params));
  console.log(`[AWS SNS SMS] Sent to ${formattedPhone}, MessageId: ${result.MessageId}`);
  return result;
};

// Real SMS sender via Twilio
const sendTwilioSms = async (phone, message) => {
  if (!twilioClient) {
    throw new Error('Twilio client not initialized');
  }
  const formattedPhone = formatPhoneE164(phone);
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) {
    throw new Error('TWILIO_PHONE_NUMBER not set');
  }
  const result = await twilioClient.messages.create({
    body: message,
    from: fromNumber,
    to: formattedPhone
  });
  console.log(`[Twilio SMS] Sent to ${formattedPhone}, SID: ${result.sid}, Status: ${result.status}`);
  return result;
};

// Extract 10-digit Indian number for Fast2SMS
const getIndianNumber = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return cleaned;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return cleaned.slice(2);
  if (cleaned.length === 11 && cleaned.startsWith('0')) return cleaned.slice(1);
  return cleaned.slice(-10); // fallback: last 10 digits
};

// Real SMS sender via Fast2SMS (India-native)
const sendFast2Sms = async (phone, message) => {
  if (!fast2smsApiKey) {
    throw new Error('Fast2SMS API key not configured');
  }
  const indianNumber = getIndianNumber(phone);
  const https = require('https');
  const payload = JSON.stringify({
    route: 'q',
    message: message,
    language: 'english',
    flash: 0,
    numbers: indianNumber
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.fast2sms.com',
      path: '/dev/bulkV2',
      method: 'POST',
      headers: {
        'authorization': fast2smsApiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.return === true) {
            console.log(`[Fast2SMS] Sent to ${indianNumber}, MessageId: ${json.message_id || 'N/A'}`);
            resolve(json);
          } else {
            reject(new Error(json.message || 'Fast2SMS failed'));
          }
        } catch (e) {
          reject(new Error('Fast2SMS invalid response: ' + body));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

// Smart SMS sender: tries Fast2SMS → Twilio → AWS SNS → Mock
const sendSms = async (phone, message) => {
  const useRealSms = process.env.USE_REAL_SMS === 'true';

  // Try Fast2SMS first (India-native, preferred for Indian numbers)
  if (useRealSms && fast2smsApiKey) {
    try {
      await sendFast2Sms(phone, message);
      return true;
    } catch (error) {
      console.error('Fast2SMS failed, trying Twilio:', error.message);
    }
  }

  // Fallback to Twilio
  if (useRealSms && twilioClient) {
    try {
      await sendTwilioSms(phone, message);
      return true;
    } catch (error) {
      console.error('Twilio SMS failed, trying AWS SNS:', error.message);
    }
  }

  // Fallback to AWS SNS
  if (useRealSms && snsClient) {
    try {
      await sendRealSms(phone, message);
      return true;
    } catch (error) {
      console.error('AWS SNS SMS failed, falling back to mock:', error.message);
    }
  }

  // Final fallback: mock console log
  console.log(`[MOCK SMS] To: ${phone} | Message: ${message}`);
  return true;
};

// Internal helpers
const createOtp = (otpData) => {
  // Remove any existing OTP for same phone + purpose
  const existingIndex = otpStore.findIndex(
    (o) => o.phone === otpData.phone && o.purpose === otpData.purpose
  );
  if (existingIndex !== -1) {
    otpStore.splice(existingIndex, 1);
  }

  const otp = {
    _id: String(nextOtpId++),
    ...otpData,
    attempts: 0,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  };
  otpStore.push(otp);
  return otp;
};

const findOtp = (phone, purpose) => {
  return otpStore.find(
    (o) =>
      o.phone === phone &&
      o.purpose === purpose &&
      new Date(o.expiresAt) > new Date()
  );
};

const incrementOtpAttempts = (id) => {
  const otp = otpStore.find((o) => o._id === id);
  if (otp) {
    otp.attempts += 1;
    return otp;
  }
  return null;
};

const deleteOtp = (id) => {
  const index = otpStore.findIndex((o) => o._id === id);
  if (index !== -1) {
    otpStore.splice(index, 1);
    return true;
  }
  return false;
};

// Create and send OTP
const createAndSendOtp = async (phone, purpose) => {
  if (!phone) {
    throw new Error('Phone number is required');
  }

  const code = generateOtp();
  const otp = createOtp({
    phone,
    code,
    purpose
  });

  await sendSms(phone, `Your MealNexus OTP is: ${code}. Valid for 5 minutes.`);

  return { otpId: otp._id, code: otp.code, message: 'OTP sent successfully' };
};

// Verify OTP
const verifyOtp = async (phone, purpose, code) => {
  const otp = findOtp(phone, purpose);

  if (!otp) {
    return { valid: false, message: 'OTP expired or not found' };
  }

  if (otp.attempts >= 3) {
    deleteOtp(otp._id);
    return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  incrementOtpAttempts(otp._id);

  if (otp.code !== code) {
    const remaining = 3 - otp.attempts;
    return { valid: false, message: `Invalid OTP. ${remaining} attempts remaining.` };
  }

  // OTP verified - delete it
  deleteOtp(otp._id);
  return { valid: true, message: 'OTP verified successfully' };
};

module.exports = {
  createAndSendOtp,
  verifyOtp,
  generateOtp,
  sendSms
};
