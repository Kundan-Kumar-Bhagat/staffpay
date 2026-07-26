import { dstr } from '../utils/format';
import { STATUS } from './ui';

export default function CalendarGrid({ month, records, workingDays = [1, 2, 3, 4, 5, 6], holidays = [], onPick, selected }) {
  const [y, m] = month.split('-').map(Number);
  const startIdx = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  const cells = [...Array(startIdx).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const today = dstr();

  return (
    <div>
      <div className="cal-head">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}</div>
      <div className="cal">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="cal-cell off" />;
          const ds = `${month}-${String(d).padStart(2, '0')}`;
          const recs = records[ds] || [];
          const wknd = !workingDays.includes(new Date(y, m - 1, d).getDay());
          const isHol = holidays.includes(ds);
          const top = recs[0];
          return (
            <div key={ds} onClick={() => onPick(ds)}
              className={`cal-cell ${wknd ? 'wknd' : ''} ${isHol ? 'holiday' : ''} ${ds === today ? 'today' : ''} ${selected === ds ? 'sel' : ''}`}>
              <span className="cal-day">{d}{isHol && <i className="cal-hol">H</i>}</span>
              {recs.length > 1 && <span className="cal-count">{recs.length}</span>}
              {top && <span className="cal-bar" style={{ background: STATUS[top.status]?.[2] }} />}
            </div>
          );
        })}
      </div>
      <div className="cal-legend">
        {Object.entries(STATUS).map(([k, [label, , color]]) => (
          <span key={k}><i style={{ background: color }} /> {label}</span>
        ))}
        <span><i className="hollow" /> Weekend</span>
      </div>
    </div>
  );
}