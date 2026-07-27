import { Router } from 'express';
import * as c from '../controllers/voucher.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { tenant } from '../middleware/tenant.js';

const r = Router();
r.get('/verify/:number', c.verify);          // public
r.use(protect, tenant, authorize('admin', 'manager'));
r.get('/', c.list);
r.get('/disbursement', c.disbursement);
r.get('/disbursement/pdf', c.disbursementPdf);
r.post('/', c.create);
r.post('/:id/deliver', c.deliver);
r.put('/:id/approve', c.approve);
r.put('/:id/paid', c.markPaid);
r.get('/:id/pdf', c.pdf);
r.post('/:id/email', c.emailVoucher);
r.delete('/:id', authorize('admin'), c.remove);
export default r;
