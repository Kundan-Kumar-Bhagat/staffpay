import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true, sparse: true, unique: true },
  phone: { type: String, trim: true, sparse: true, unique: true },
  password: { type: String, select: false },
  googleId: { type: String, sparse: true, unique: true },
  role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'staff' },
  employeeId: { type: String, unique: true, sparse: true },
  department: String,
  designation: String,
  joinDate: { type: Date, default: Date.now },
  salary: { basic: { type: Number, default: 0 }, hra: { type: Number, default: 0 }, allowances: { type: Number, default: 0 } },
  bank: { name: String, accountNo: String, ifsc: String },
  pan: String,
  pfNo: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  color: { type: String, default: '#0F3D33' },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.match = function (p) { return bcrypt.compare(p, this.password); };
userSchema.methods.toJSON = function () { const o = this.toObject(); delete o.password; return o; };

export default mongoose.model('User', userSchema);