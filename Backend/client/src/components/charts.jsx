import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

const axis = { fontSize: 11, fill: '#5B6B64' };

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <b>{label}</b>
      {payload.map((p, i) => (
        <div key={i}><i style={{ background: p.color || p.payload?.fill }} /> {p.name}: <b>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</b></div>
      ))}
    </div>
  );
};

export function StatusDonut({ data }) {
  const clean = data.filter(d => d.value > 0);
  if (!clean.length) return <div className="chart-empty">No attendance data yet</div>;
  return (
    <ResponsiveContainer width="100%" height={238}>
      <PieChart>
        <Pie data={clean} dataKey="value" nameKey="name" innerRadius={56} outerRadius={86} paddingAngle={2} stroke="#fff">
          {clean.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip content={<ChartTip />} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DailyBars({ data }) {
  if (!data.length) return <div className="chart-empty">No attendance data yet</div>;
  return (
    <ResponsiveContainer width="100%" height={238}>
      <BarChart data={data} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#D8DED9" vertical={false} />
        <XAxis dataKey="date" tick={axis} interval="preserveStartEnd" />
        <YAxis tick={axis} width={26} allowDecimals={false} />
        <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(15,61,51,.06)' }} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="present" name="Present" stackId="a" fill="#2E9E6B" radius={[0, 0, 0, 0]} />
        <Bar dataKey="late" name="Late" stackId="a" fill="#E8A23C" />
        <Bar dataKey="half" name="Half" stackId="a" fill="#1E8E8E" />
        <Bar dataKey="leave" name="Leave" stackId="a" fill="#3E7CB1" />
        <Bar dataKey="absent" name="Absent" stackId="a" fill="#D64545" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PayrollLine({ data }) {
  if (!data.length) return <div className="chart-empty">No payroll history yet</div>;
  return (
    <ResponsiveContainer width="100%" height={238}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#D8DED9" vertical={false} />
        <XAxis dataKey="label" tick={axis} />
        <YAxis tick={axis} width={44} tickFormatter={v => new Intl.NumberFormat('en', { notation: 'compact' }).format(v)} />
        <Tooltip content={<ChartTip />} />
        <Line type="monotone" dataKey="payroll" name="Payroll (net)" stroke="#0F3D33" strokeWidth={2.5}
          dot={{ r: 3.5, fill: '#E8A23C', stroke: '#0F3D33' }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="rate" name="Attendance %" stroke="#E8A23C" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}