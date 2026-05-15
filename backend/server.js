const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables FIRST before any module that needs them
dotenv.config();

const { MongoMemoryServer } = require('mongodb-memory-server');
const awsMessaging = require('./utils/awsMessaging');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection with in-memory fallback
async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mealnexus';
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');
  } catch (err) {
    console.warn('MongoDB Connection Error:', err.message);
    console.log('Starting in-memory MongoDB...');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('In-Memory MongoDB Connected');
  }
}

connectDatabase();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/tasks', require('./routes/tasks'));

app.use('/api/admin', require('./routes/admin'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/upload', require('./routes/upload'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'MealNexus API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Background SQS message consumer (runs every 30 seconds)
if (process.env.SQS_QUEUE_URL) {
  const startMessageConsumer = () => {
    awsMessaging.pollMessages(async (message) => {
      console.log('Processing SQS message:', message.eventType);
      // Handle different event types
      switch (message.eventType) {
        case 'DONATION_CREATED':
          console.log('New donation event processed:', message.data._id);
          break;
        case 'DONATION_ACCEPTED':
          console.log('Donation accepted event processed:', message.data._id);
          break;
        case 'VOLUNTEER_ASSIGNED':
          console.log('Volunteer assigned event processed');
          break;
        case 'DONATION_DELIVERED':
          console.log('Donation delivered event processed');
          break;
        default:
          console.log('Unknown event type:', message.eventType);
      }
    }).catch(err => console.error('SQS poll error:', err));
  };

  // Start polling immediately and every 30 seconds
  startMessageConsumer();
  setInterval(startMessageConsumer, 30000);
  console.log('SQS message consumer started');
}
