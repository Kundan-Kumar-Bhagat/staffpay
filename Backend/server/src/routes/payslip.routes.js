import { Router } from 'express';
import * as c from '../controllers/payslip.controller.js';
import { protect, authorize } from '../middleware/auth.js';
const r = Router();
r.get('/verify/:serial', c.verify);
r.use(protect);
r.get('/', c.list);
r.post('/generate', authorize('admin', 'manager'), c.generate);
r.post('/generate-all', authorize('admin', 'manager'), 
c.generateAll);
r.get('/:id', c.getOne);
r.get('/:id/pdf', c.pdf);
r.get('/:id/xlsx', c.xlsx);
r.delete('/:id', authorize('admin'), c.remove);
r.post('/:id/email', authorize('admin', 'manager'), c.emailSlip);
export default r;