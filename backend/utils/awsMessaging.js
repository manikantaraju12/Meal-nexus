const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { sendSms } = require('./otpService');

// Configure AWS SDK v3 clients
const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const SNS_NGO_TOPIC_ARN = process.env.SNS_NGO_TOPIC_ARN;
const SNS_VOLUNTEER_TOPIC_ARN = process.env.SNS_VOLUNTEER_TOPIC_ARN;
const NOTIFICATION_PHONE = process.env.NOTIFICATION_PHONE;

/**
 * Send a message to the SQS donation events queue
 */
async function sendDonationEvent(eventType, donationData) {
  if (!SQS_QUEUE_URL) {
    console.warn('SQS_QUEUE_URL not set, skipping SQS message');
    return null;
  }

  const message = {
    eventType,
    timestamp: new Date().toISOString(),
    data: donationData
  };

  const params = {
    QueueUrl: SQS_QUEUE_URL,
    MessageBody: JSON.stringify(message),
    MessageAttributes: {
      eventType: {
        DataType: 'String',
        StringValue: eventType
      }
    }
  };

  try {
    const result = await sqsClient.send(new SendMessageCommand(params));
    console.log(`SQS message sent: ${eventType}, MessageId: ${result.MessageId}`);
    return result;
  } catch (error) {
    console.error('Error sending SQS message:', error);
    throw error;
  }
}

/**
 * Publish notification to SNS topic for NGOs (email/Lambda)
 * Also send SMS via Fast2SMS for Indian numbers
 */
async function notifyNGOs(subject, message, attributes = {}) {
  const promises = [];

  // SNS for email and other subscribers
  if (SNS_NGO_TOPIC_ARN) {
    const params = {
      TopicArn: SNS_NGO_TOPIC_ARN,
      Subject: subject,
      Message: typeof message === 'string' ? message : JSON.stringify(message),
      MessageAttributes: {
        notificationType: {
          DataType: 'String',
          StringValue: attributes.type || 'general'
        }
      }
    };
    promises.push(
      snsClient.send(new PublishCommand(params))
        .then(result => console.log(`NGO SNS notification sent, MessageId: ${result.MessageId}`))
        .catch(err => console.error('Error publishing to NGO topic:', err))
    );
  } else {
    console.warn('SNS_NGO_TOPIC_ARN not set, skipping NGO SNS notification');
  }

  // Fast2SMS for Indian SMS delivery
  if (NOTIFICATION_PHONE) {
    const smsText = typeof message === 'string' ? message : `${subject}: ${message.type}`;
    promises.push(
      sendSms(NOTIFICATION_PHONE, `[MealNexus NGO] ${smsText}`)
        .then(() => console.log(`NGO SMS sent to ${NOTIFICATION_PHONE}`))
        .catch(err => console.error('Error sending NGO SMS:', err))
    );
  }

  await Promise.all(promises);
}

/**
 * Publish notification to SNS topic for volunteers (email/Lambda)
 * Also send SMS via Fast2SMS for Indian numbers
 */
async function notifyVolunteers(subject, message, attributes = {}) {
  const promises = [];

  // SNS for email and other subscribers
  if (SNS_VOLUNTEER_TOPIC_ARN) {
    const params = {
      TopicArn: SNS_VOLUNTEER_TOPIC_ARN,
      Subject: subject,
      Message: typeof message === 'string' ? message : JSON.stringify(message),
      MessageAttributes: {
        notificationType: {
          DataType: 'String',
          StringValue: attributes.type || 'general'
        }
      }
    };
    promises.push(
      snsClient.send(new PublishCommand(params))
        .then(result => console.log(`Volunteer SNS notification sent, MessageId: ${result.MessageId}`))
        .catch(err => console.error('Error publishing to Volunteer topic:', err))
    );
  } else {
    console.warn('SNS_VOLUNTEER_TOPIC_ARN not set, skipping volunteer SNS notification');
  }

  // Fast2SMS for Indian SMS delivery
  if (NOTIFICATION_PHONE) {
    const smsText = typeof message === 'string' ? message : `${subject}: ${message.type}`;
    promises.push(
      sendSms(NOTIFICATION_PHONE, `[MealNexus Volunteer] ${smsText}`)
        .then(() => console.log(`Volunteer SMS sent to ${NOTIFICATION_PHONE}`))
        .catch(err => console.error('Error sending Volunteer SMS:', err))
    );
  }

  await Promise.all(promises);
}

/**
 * Poll messages from SQS queue (for background workers)
 */
async function pollMessages(handler, options = {}) {
  if (!SQS_QUEUE_URL) {
    console.warn('SQS_QUEUE_URL not set, cannot poll messages');
    return;
  }

  const params = {
    QueueUrl: SQS_QUEUE_URL,
    MaxNumberOfMessages: options.maxMessages || 10,
    WaitTimeSeconds: options.waitTime || 20,
    VisibilityTimeout: options.visibilityTimeout || 300
  };

  try {
    const data = await sqsClient.send(new ReceiveMessageCommand(params));
    if (!data.Messages || data.Messages.length === 0) {
      return;
    }

    for (const message of data.Messages) {
      try {
        const body = JSON.parse(message.Body);
        await handler(body);

        // Delete message after successful processing
        await sqsClient.send(new DeleteMessageCommand({
          QueueUrl: SQS_QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle
        }));
      } catch (error) {
        console.error('Error processing SQS message:', error);
      }
    }
  } catch (error) {
    console.error('Error polling SQS:', error);
  }
}

/**
 * Send notification when a new donation is created
 */
async function notifyNewDonation(donation) {
  const subject = 'New Food Donation Available';
  const message = {
    type: 'new_donation',
    donationId: donation._id,
    foodType: donation.foodDetails?.foodType,
    category: donation.foodDetails?.category,
    quantity: donation.foodDetails?.quantity,
    pickupLocation: donation.pickupLocation,
    priority: donation.priority,
    expiryTime: donation.foodDetails?.expiryTime
  };

  await Promise.all([
    sendDonationEvent('DONATION_CREATED', donation),
    notifyNGOs(subject, message, { type: 'new_donation' })
  ]);
}

/**
 * Send notification when a donation is accepted by NGO
 */
async function notifyDonationAccepted(donation, ngoId) {
  const subject = 'Donation Accepted by NGO';
  const message = {
    type: 'donation_accepted',
    donationId: donation._id,
    ngoId,
    pickupLocation: donation.pickupLocation,
    deliveryLocation: donation.deliveryLocation
  };

  await Promise.all([
    sendDonationEvent('DONATION_ACCEPTED', { donation, ngoId }),
    notifyVolunteers(subject, message, { type: 'donation_accepted' })
  ]);
}

/**
 * Send notification when a volunteer is assigned
 */
async function notifyVolunteerAssigned(donation, volunteerId) {
  const subject = 'New Task Assigned';
  const message = {
    type: 'task_assigned',
    donationId: donation._id,
    volunteerId,
    pickupLocation: donation.pickupLocation,
    foodDetails: donation.foodDetails
  };

  await Promise.all([
    sendDonationEvent('VOLUNTEER_ASSIGNED', { donation, volunteerId }),
    notifyVolunteers(subject, message, { type: 'task_assigned' })
  ]);
}

/**
 * Send notification when donation is delivered
 */
async function notifyDonationDelivered(donation) {
  const subject = 'Donation Successfully Delivered';
  const message = {
    type: 'donation_delivered',
    donationId: donation._id,
    impact: donation.impact
  };

  await sendDonationEvent('DONATION_DELIVERED', donation);
}

module.exports = {
  sendDonationEvent,
  notifyNGOs,
  notifyVolunteers,
  pollMessages,
  notifyNewDonation,
  notifyDonationAccepted,
  notifyVolunteerAssigned,
  notifyDonationDelivered
};
