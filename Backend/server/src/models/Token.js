import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  type: { type: String, enum: ['otp', 'reset'], required: true },
  identifier: { type: String, required: true },
  token: { type: String, required: true },
  expiresAt: Date,
  used: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Token', tokenSchema);