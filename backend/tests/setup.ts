import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/User';
import { Tweet } from '../src/models/Tweet';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/twitter_analyzer_test';

/**
 * Test setup utility
 */
export const testSetup = {
  async connect() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to test database');
  },

  async disconnect() {
    await mongoose.disconnect();
    console.log('Disconnected from test database');
  },

  async clearCollections() {
    await User.deleteMany({});
    await Tweet.deleteMany({});
    console.log('Cleared test collections');
  }
};
