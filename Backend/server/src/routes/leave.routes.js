import { Router } from 'express';
import * as c from '../controllers/leave.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const r = Router();
r.use(protect);
r.get('/', c.list);
r.get('/balance', c.balance);
r.post('/', c.apply);
r.delete('/:id', c.cancel);
r.put('/:id/decide', authorize('admin', 'manager'), c.decide);
export default r;
