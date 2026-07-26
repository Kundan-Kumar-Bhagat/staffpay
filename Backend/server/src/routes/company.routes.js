import { Router } from 'express';
import * as c from '../controllers/company.controller.js';
import { protect, authorize } from '../middleware/auth.js';
const r = Router();
r.get('/', c.get);
r.put('/', protect, authorize('admin'), c.update);
export default r;