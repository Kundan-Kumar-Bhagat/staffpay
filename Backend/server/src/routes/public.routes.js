import { Router } from 'express';
import Workspace from '../models/Workspace.js';

const r = Router();

// Resolves the tenant from the subdomain — acme.staffpay.app → slug "acme".
// A ?slug= escape hatch keeps this demoable without DNS.
r.get('/brand', async (req, res) => {
  const host = (req.headers.host || '').split(':')[0];
  const sub = host.split('.')[0];
  let ws = null;
  if (sub && !['localhost', ''].includes(sub) && !/^\d+$/.test(sub))
    ws = await Workspace.findOne({ slug: sub, status: 'active' });
  if (!ws && req.query.slug)
    ws = await Workspace.findOne({ slug: req.query.slug, status: 'active' });
  if (!ws) return res.json({ whiteLabel: false });
  res.json({
    whiteLabel: true,
    name: ws.name,
    tagline: ws.settings?.tagline,
    logoUrl: ws.settings?.brand?.logoUrl,
    accent: ws.settings?.brand?.accent,
  });
});

export default r;
