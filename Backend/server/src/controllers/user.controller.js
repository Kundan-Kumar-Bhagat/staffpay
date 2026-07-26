import User from '../models/User.js';
import { PLAN_LIMITS } from '../models/Workspace.js';
import { logActivity } from '../utils/log.js';

export const list = async (req, res) => res.json(await User.find().sort('employeeId'));

export const create = async (req, res) => {
  const limit = PLAN_LIMITS[req.workspace?.plan]?.staff ?? 10;
  if ((await User.countDocuments()) >= limit) {
    return res.status(402).json({ message: `Staff limit for the ${req.workspace?.plan || 'trial'} plan is ${limit}. Upgrade from the Workspaces console.` });
  }
  const { name, email, phone, role = 'staff', password = 'Change@123', ...rest } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  if (email && await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'Email already exists' });
  if (phone && await User.findOne({ phone })) return res.status(409).json({ message: 'Phone already exists' });
  const user = await User.create({ name, email, phone, role, password, employeeId: `EMP-${String((await User.countDocuments()) + 1).padStart(3, '0')}`, ...rest });
  logActivity(req.user, 'user', `added ${user.name} (${user.role})`);
  res.status(201).json(user);
};

export const update = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const allowed = ['name', 'email', 'phone', 'role', 'department', 'designation', 'salary', 'bank', 'pan', 'pfNo', 'status', 'joinDate', 'color'];
  allowed.forEach(k => { if (req.body[k] !== undefined) user[k] = req.body[k]; });
  if (req.body.password) user.password = req.body.password;
  await user.save();
  res.json(user);
};

export const remove = async (req, res) => {
  if (req.params.id === String(req.user._id)) return res.status(400).json({ message: 'You cannot deactivate yourself' });
  const user = await User.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User deactivated', user });
};