import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

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
