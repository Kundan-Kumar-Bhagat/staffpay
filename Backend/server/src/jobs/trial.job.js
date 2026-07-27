import cron from 'node-cron';
import Workspace from '../models/Workspace.js';

export function startTrialJob() {
  cron.schedule('0 3 * * *', async () => {
    const expired = await Workspace.find({
      plan: 'trial', 'billing.status': 'trialing', 'billing.trialEndsAt': { $lt: new Date() },
    });
    for (const ws of expired) { ws.billing.status = 'expired'; await ws.save(); }
    if (expired.length) console.log(`✓ Marked ${expired.length} trial(s) as expired`);
  });
  console.log('◆ Trial sweep scheduled — daily 03:00');
}
