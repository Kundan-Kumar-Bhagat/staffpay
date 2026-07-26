import mongoose from 'mongoose';
import { currentTenant } from '../../utils/tenantContext.js';

const QUERY_OPS = ['find', 'findOne', 'countDocuments', 'distinct', 'updateOne', 'updateMany',
  'deleteOne', 'deleteMany', 'findOneAndUpdate', 'findOneAndDelete', 'findOneAndReplace'];
const UPDATE_OPS = ['findOneAndUpdate', 'updateOne', 'updateMany'];

export function tenantScope(schema) {
  schema.add({ workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true } });

  // Scope every read/write to the active workspace (unless the caller explicitly filters)
  schema.pre(QUERY_OPS, function (next) {
    const wid = currentTenant();
    if (wid) {
      const filter = this.getFilter();
      if (filter.workspace === undefined) this.where({ workspace: wid });
    }
    next();
  });

  // Stamp workspace on upserts
  schema.pre(UPDATE_OPS, function (next) {
    const wid = currentTenant();
    if (wid) {
      const upd = this.getUpdate();
      if (upd && !upd.workspace) {
        if (upd.$set || upd.$setOnInsert || upd.$inc) upd.$setOnInsert = { ...(upd.$setOnInsert || {}), workspace: wid };
        else upd.workspace = wid;
      }
    }
    next();
  });

  // Stamp workspace on inserts
  schema.pre('save', function (next) {
    if (!this.workspace) {
      const wid = currentTenant();
      if (wid) this.workspace = wid;
    }
    next();
  });
}
