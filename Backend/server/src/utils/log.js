import Activity from '../models/Activity.js';

export const logActivity = (actor, action, detail) =>
  Activity.create({ actor: actor?._id, action, detail }).catch(() => { });  