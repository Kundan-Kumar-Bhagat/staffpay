import Workspace, { PLAN_LIMITS, genJoinCode, slugify, newTrial } from '../models/Workspace.js';
import User from '../models/User.js';
import Payslip from '../models/Payslip.js';
import { withWorkspaceInfo } from './auth.controller.js';

export const provision = async (req, res) => {
  const { name, plan = 'trial', ownerEmail } = req.body;
  if (!name) return res.status(400).json({ message: 'Workspace name required' });
  const ws = await Workspace.create({ name, slug: `${slugify(name)}-${Date.now().toString(36).slice(-4)}`, joinCode: genJoinCode(), plan, billing: newTrial() });
  if (ownerEmail) {
    const owner = await User.findOne({ email: ownerEmail.toLowerCase() });
    if (owner) {
      owner.workspace = ws._id; owner.activeWorkspace = ws._id; owner.role = 'admin';
      await owner.save();
      ws.owner = owner._id; await ws.save();
    }
  }
  res.status(201).json(ws);
};

export const list = async (req, res) => {
  const out = [];
  for (const ws of await Workspace.find().sort('-createdAt')) {
    const [staff, slips] = await Promise.all([
      User.countDocuments({ workspace: ws._id }),
      Payslip.countDocuments({ workspace: ws._id }),
    ]);
    out.push({ ...ws.toObject(), staff, slips, billingStatus: ws.billing?.status || 'trialing', seats: ws.billing?.seats });
  }
  res.json(out);
};

export const update = async (req, res) => {
  const { plan, status, name } = req.body;
  const ws = await Workspace.findById(req.params.id);
  if (!ws) return res.status(404).json({ message: 'Workspace not found' });
  if (plan && PLAN_LIMITS[plan]) ws.plan = plan;
  if (status) ws.status = status;
  if (name) ws.name = name;
  await ws.save();
  res.json(ws);
};

export const switchTo = async (req, res) => {
  const ws = await Workspace.findById(req.params.id);
  if (!ws) return res.status(404).json({ message: 'Workspace not found' });
  const isMember = String(req.user.workspace) === String(ws._id);
  if (!req.user.superAdmin && !isMember) return res.status(403).json({ message: 'Not a member of that workspace' });
  req.user.activeWorkspace = ws._id;
  await req.user.save();
  res.json({ user: await withWorkspaceInfo(req.user) });
};

export const rotateCode = async (req, res) => {
  req.workspace.joinCode = genJoinCode();
  await req.workspace.save();
  res.json({ joinCode: req.workspace.joinCode });
};
