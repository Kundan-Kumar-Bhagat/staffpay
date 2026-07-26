import dotenv from 'dotenv';
dotenv.config();
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';

let appInstance = null;
let dbConnected = false;

const handler = async (req, res) => {
  try {
    if (!dbConnected) {
      await connectDB();
      dbConnected = true;
    }
    if (!appInstance) {
      appInstance = createApp();
    }
    return appInstance(req, res);
  } catch (err) {
    console.error('Serverless execution error:', err);
    return res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
};

export default handler;
