import { Router } from 'express';
import * as c from '../controllers/payslip.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { tenant } from '../middleware/tenant.js';

const r = Router();
r.get('/verify/:serial', c.verify);          // public
r.use(protect, tenant);
r.get('/', c.list);
r.post('/generate', authorize('admin', 'manager'), c.generate);
r.post('/generate-all', authorize('admin', 'manager'), c.generateAll);
r.get('/:id', c.getOne);
r.put('/:id/approve', authorize('admin', 'manager'), c.approve);
r.get('/:id/pdf', c.pdf);
r.get('/:id/xlsx', c.xlsx);
r.post('/:id/email', authorize('admin', 'manager'), c.emailSlip);
r.delete('/:id', authorize('admin'), c.remove);
export default r;