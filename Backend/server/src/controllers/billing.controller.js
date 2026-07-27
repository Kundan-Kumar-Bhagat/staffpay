import { createCheckout, createPortal, setSeats, billingLive, handleWebhookEvent } from '../services/billing.service.js';
import { PLANS, seatLimit } from '../config/plans.js';
import User from '../models/User.js';
import Payslip from '../models/Payslip.js';
import { currentMonth } from '../utils/helpers.js';

export const usage = async (req, res) => {
  const ws = req.workspace;
  const [staff, slipsMonth, slipsAll] = await Promise.all([
    User.countDocuments(),                        // auto-scoped to the tenant
    Payslip.countDocuments({ month: currentMonth() }),
    Payslip.countDocuments(),
  ]);
  const b = ws.billing || {};
  res.json({
    plan: ws.plan, status: b.status,
    seats: b.seats || PLANS.trial.seats, seatLimit: seatLimit(ws) === Infinity ? null : seatLimit(ws),
    staff, slipsMonth, slipsAll,
    trialDaysLeft: b.trialEndsAt ? Math.max(0, Math.ceil((new Date(b.trialEndsAt) - Date.now()) / 86400000)) : 0,
    trialEndsAt: b.trialEndsAt, renewsAt: b.renewsAt,
    live: billingLive(),
    price: PLANS.pro.price, currency: PLANS.pro.currency, trialLength: PLANS.trial.trialDays,
  });
};

export const checkout = async (req, res) => {
  const base = process.env.CLIENT_URL || 'http://localhost:5173';
  res.json(await createCheckout(req.workspace, `${base}/billing?upgraded=1`, `${base}/billing`));
};

export const portal = async (req, res) => {
  const base = process.env.CLIENT_URL || 'http://localhost:5173';
  res.json(await createPortal(req.workspace, `${base}/billing`));
};

export const seats = async (req, res) => {
  if (req.workspace.plan !== 'pro') return res.status(402).json({ message: 'Seat control is a Pro feature' });
  const ws = await setSeats(req.workspace, req.body.seats);
  res.json({ seats: ws.billing.seats });
};

export const webhook = async (req, res) => {
  let event = req.body;
  if (process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY) {
    const Stripe = (await import('stripe')).default;
    try {
      event = new Stripe(process.env.STRIPE_SECRET_KEY).webhooks
        .constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    } catch { return res.status(400).send('Bad signature'); }
  }
  await handleWebhookEvent(typeof event === 'object' ? event : JSON.parse(event));
  res.json({ received: true });
};
