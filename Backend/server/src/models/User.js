import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { tenantScope } from './plugins/tenantScope.js';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  password: { type: String, select: false },
  googleId: { type: String, sparse: true, unique: true },
  role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'staff' },
  employeeId: { type: String },
  department: String,
  designation: String,
  joinDate: { type: Date, default: Date.now },
  salary: { basic: { type: Number, default: 0 }, hra: { type: Number, default: 0 }, allowances: { type: Number, default: 0 } },
  bank: { name: String, accountNo: String, ifsc: String },
  pan: String,
  pfNo: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  color: { type: String, default: '#0F3D33' },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
  activeWorkspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  superAdmin: { type: Boolean, default: false },
  impersonating: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.index({ workspace: 1, email: 1 }, { unique: true, sparse: true });
userSchema.index({ workspace: 1, phone: 1 }, { unique: true, sparse: true });
userSchema.index({ workspace: 1, employeeId: 1 }, { unique: true, sparse: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.match = function (p) { return bcrypt.compare(p, this.password); };
userSchema.methods.toJSON = function () { const o = this.toObject(); delete o.password; return o; };

userSchema.plugin(tenantScope);

export default mongoose.model('User', userSchema);