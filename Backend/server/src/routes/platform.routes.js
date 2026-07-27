import { Router } from 'express';
import * as c from '../controllers/platform.controller.js';
import { protect, superOnly } from '../middleware/auth.js';

const r = Router();
r.use(protect, superOnly);
r.get('/stats', c.stats);
r.get('/workspaces', c.listWorkspaces);
r.post('/workspaces/:id/impersonate', c.impersonate);
r.post('/workspaces/:id/delete', c.deleteWorkspace);
r.post('/exit-impersonation', c.exitImpersonation);
export default r;
