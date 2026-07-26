import dotenv from 'dotenv';
dotenv.config();
import { createApp } from './app.js';
import { connectDB } from './config/db.js';

let dbConnected = false;

const handler = async (req, res) => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
  const app = createApp();
  return app(req, res);
};

export default handler;
