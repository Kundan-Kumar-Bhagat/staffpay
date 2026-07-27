import Workspace, { companyView } from '../models/Workspace.js';
import { runInTenant } from '../utils/tenantContext.js';

export const tenant = async (req, res, next) => {
  try {
    let wid = req.user?.activeWorkspace || req.user?.workspace;
    if (!wid) {
      // Auto-assign to default workspace or first available workspace
      let ws = await Workspace.findOne({ status: 'active' });
      if (!ws) ws = await Workspace.create({ name: 'Default Company', slug: 'default-co', joinCode: 'DEMO01' });
      wid = ws._id;
      if (req.user) {
        req.user.workspace = wid;
        req.user.activeWorkspace = wid;
        await req.user.save();
      }
    }
    const ws = await Workspace.findById(wid);
    if (!ws) return res.status(400).json({ message: 'Workspace not found' });
    if (ws.status !== 'active' && !req.user.superAdmin) return res.status(403).json({ message: 'This workspace is suspended' });
    req.workspace = ws;
    req.company = companyView(ws);
    req.wid = ws._id;
    runInTenant(ws._id, () => next());   // everything downstream runs inside the tenant context
  } catch (e) { next(e); }
};
