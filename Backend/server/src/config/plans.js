export const PLANS = {
  trial: { label: 'Trial', seats: 10, trialDays: 14, price: 0 },
  pro: { label: 'Pro', seats: Infinity, price: 1999, currency: 'INR', priceId: process.env.STRIPE_PRO_PRICE_ID || '' },
};
export const seatLimit = (ws) =>
  ws.plan === 'pro' ? (ws.billing?.seats ?? Infinity) : PLANS.trial.seats;
