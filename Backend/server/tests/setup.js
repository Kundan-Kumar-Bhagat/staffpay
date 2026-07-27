import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-12345';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-12345';

let mongod;
export async function setupTestDB() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('staffpay-test'));
}
export async function teardownTestDB() {
  await mongoose.disconnect();
  await mongod?.stop();
}
export async function clearDB() {
  for (const c of await mongoose.connection.db.collections()) await c.deleteMany({});
}
