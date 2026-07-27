import Stripe from 'stripe';
import Workspace from '../models/Workspace.js';
import { PLANS } from '../config/plans.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
export const billingLive = () => !!stripe;

export async function createCheckout(ws, successUrl, cancelUrl) {
  if (!stripe) {
    // Simulation mode — the whole flow stays testable without keys
    ws.plan = 'pro';
    ws.billing = { ...ws.billing, status: 'demo', renewsAt: new Date(Date.now() + 30 * 86400000) };
    await ws.save();
    return { demo: true, message: 'Stripe keys not set — upgrade simulated. Add STRIPE_SECRET_KEY + STRIPE_PRO_PRICE_ID for live billing.' };
  }
  let customerId = ws.billing.customerId;
  if (!customerId) {
    const cust = await stripe.customers.create({
      name: ws.name, email: ws.settings.email || undefined, metadata: { workspaceId: String(ws._id) },
    });
    customerId = cust.id;
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: PLANS.pro.priceId, quantity: Math.max(1, ws.billing.seats || 1) }],
    subscription_data: { metadata: { workspaceId: String(ws._id) } },
    metadata: { workspaceId: String(ws._id) },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  ws.billing.customerId = customerId;
  await ws.save();
  return { url: session.url };
}

export async function createPortal(ws, returnUrl) {
  if (!stripe || !ws.billing.customerId) return { demo: true, message: 'No Stripe customer on record yet' };
  const s = await stripe.billingPortal.sessions.create({ customer: ws.billing.customerId, return_url: returnUrl });
  return { url: s.url };
}

export async function setSeats(ws, seats) {
  seats = Math.max(1, Math.min(999, +seats || 1));
  ws.billing.seats = seats;
  if (stripe && ws.billing.subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(ws.billing.subscriptionId);
    await stripe.subscriptions.update(ws.billing.subscriptionId, {
      items: [{ id: sub.items.data[0].id, quantity: seats }],
    });
  }
  await ws.save();
  return ws;
}

export async function handleWebhookEvent(event) {
  const obj = event.data.object || {};
  const wid = obj.metadata?.workspaceId || obj.subscription_details?.metadata?.workspaceId;
  const bySub = id => Workspace.findOne({ 'billing.subscriptionId': id });

  switch (event.type) {
    case 'checkout.session.completed': {
      const ws = await Workspace.findById(wid); if (!ws) return;
      ws.plan = 'pro';
      ws.billing.subscriptionId = obj.subscription;
      ws.billing.status = 'active';
      ws.billing.renewsAt = new Date(Date.now() + 30 * 86400000);
      await ws.save();
      break;
    }
    case 'customer.subscription.updated': {
      const ws = await bySub(obj.id); if (!ws) return;
      ws.billing.status = { active: 'active', trialing: 'trialing', past_due: 'past_due', canceled: 'canceled' }[obj.status] || 'active';
      if (obj.current_period_end) ws.billing.renewsAt = new Date(obj.current_period_end * 1000);
      await ws.save();
      break;
    }
    case 'customer.subscription.deleted': {
      const ws = await bySub(obj.id); if (!ws) return;
      ws.plan = 'trial';
      ws.billing.status = 'canceled';
      await ws.save();
      break;
    }
    case 'invoice.payment_failed': {
      const ws = await Workspace.findOne({ 'billing.customerId': obj.customer }); if (!ws) return;
      ws.billing.status = 'past_due';
      await ws.save();
      break;
    }
  }
}
