import Workspace from '../models/Workspace.js';
import User from '../models/User.js';
import Payslip from '../models/Payslip.js';
import Voucher from '../models/Voucher.js';
import Attendance from '../models/Attendance.js';
import KioskLog from '../models/KioskLog.js';
import Leave from '../models/Leave.js';
import Notification from '../models/Notification.js';
import Activity from '../models/Activity.js';
import { PLANS } from '../config/plans.js';
import { withWorkspaceInfo } from './auth.controller.js';
import { logActivity } from '../utils/log.js';

const DAY = 86400000;

export const stats = async (req, res) => {
  const workspaces = await Workspace.find();
  const now = Date.now();
  const pro = workspaces.filter(w => w.plan === 'pro' && w.status === 'active');
  const signupsByDay = [];
  for (let i = 29; i >= 0; i--) {
    const key = new Date(now - i * DAY).toISOString().slice(0, 10);
    signupsByDay.push({ day: key.slice(5), count: workspaces.filter(w => w.createdAt.toISOString().slice(0, 10) === key).length });
  }
  const [users, payslips, vouchers] = await Promise.all([User.countDocuments(), Payslip.countDocuments(), Voucher.countDocuments()]);
  res.json({
    workspaces: workspaces.length,
    active: workspaces.filter(w => w.status === 'active').length,
    pro: pro.length,
    trial: workspaces.filter(w => w.plan === 'trial' && w.status === 'active').length,
    mrr: pro.reduce((s, w) => s + (w.billing?.seats || 1) * PLANS.pro.price, 0),
    currency: PLANS.pro.currency,
    trialsExpiring: workspaces
      .filter(w => w.plan === 'trial' && w.status === 'active' && w.billing?.trialEndsAt &&
        new Date(w.billing.trialEndsAt) - now > 0 && new Date(w.billing.trialEndsAt) - now < 3 * DAY)
      .map(w => ({ id: w._id, name: w.name, daysLeft: Math.ceil((new Date(w.billing.trialEndsAt) - now) / DAY) })),
    signups30: signupsByDay.reduce((s, d) => s + d.count, 0),
    signupsByDay, users, payslips, vouchers,
  });
};

export const listWorkspaces = async (req, res) => {
  const out = [];
  for (const ws of await Workspace.find().sort('-createdAt')) {
    const [staff, slips, vouch, lastAct] = await Promise.all([
      User.countDocuments({ workspace: ws._id }),
      Payslip.countDocuments({ workspace: ws._id }),
      Voucher.countDocuments({ workspace: ws._id }),
      Activity.findOne({ workspace: ws._id }).sort('-createdAt'),
    ]);
    out.push({ ...ws.toObject(), staff, slips, vouch, lastActivity: lastAct?.createdAt });
  }
  res.json(out);
};

export const impersonate = async (req, res) => {
  const ws = await Workspace.findById(req.params.id);
  if (!ws) return res.status(404).json({ message: 'Workspace not found' });
  req.user.activeWorkspace = ws._id;
  req.user.impersonating = true;
  await req.user.save();
  logActivity(req.user, 'system', `impersonated workspace ${ws.name}`);
  res.json({ user: await withWorkspaceInfo(req.user) });
};

export const exitImpersonation = async (req, res) => {
  req.user.activeWorkspace = req.user.workspace;
  req.user.impersonating = false;
  await req.user.save();
  res.json({ user: await withWorkspaceInfo(req.user) });
};

export const deleteWorkspace = async (req, res) => {
  if (req.body.confirm !== 'DELETE') return res.status(400).json({ message: 'Send { confirm: "DELETE" } to confirm' });
  const ws = await Workspace.findById(req.params.id);
  if (!ws) return res.status(404).json({ message: 'Workspace not found' });
  if (String(req.user.activeWorkspace || '') === String(ws._id)) return res.status(400).json({ message: 'Exit this workspace before deleting it' });
  for (const M of [User, Payslip, Voucher, Attendance, KioskLog, Leave, Notification, Activity])
    await M.deleteMany({ workspace: ws._id });
  await ws.deleteOne();
  res.json({ message: `Workspace "${ws.name}" and all its data were permanently deleted` });
};
