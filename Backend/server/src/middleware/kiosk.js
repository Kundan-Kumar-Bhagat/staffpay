import jwt from 'jsonwebtoken';
import Workspace from '../models/Workspace.js';
import { runInTenant } from '../utils/tenantContext.js';

export const kioskAuth = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.kiosk) return res.status(401).json({ message: 'Not a kiosk session' });
    const ws = await Workspace.findById(payload.wid);
    if (!ws || !ws.settings.kiosk?.enabled) return res.status(401).json({ message: 'Kiosk is disabled' });
    req.workspace = ws;
    req.wid = ws._id;
    runInTenant(ws._id, () => next());
  } catch {
    return res.status(401).json({ message: 'Kiosk session expired — re-enter the code' });
  }
};
