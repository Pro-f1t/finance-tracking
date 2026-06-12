import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { useFinance, fmt, fmtMonth, currentMonthKey, TRANSFER_CATEGORY } from '../store';
import { Card, PageTitle, Select, EmptyState, CHART_COLORS, tooltipStyle } from '../components/ui';

function lastNMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export default function Reports() {
  const { state } = useFinance();
  const [month, setMonth] = useState(currentMonthKey());

  const monthly = useMemo(() => {
    return lastNMonths(6).map((mk) => {
      let income = 0;
      let expenses = 0;
      for (const t of state.transactions) {
        if (t.voided || t.category === TRANSFER_CATEGORY || !t.date.startsWith(mk)) continue;
        if (t.type === 'income') income += t.amount;
        else expenses += t.amount;
      }
      const [, m] = mk.split('-');
      const label = new Date(Number(mk.slice(0, 4)), Number(m) - 1, 1)
        .toLocaleDateString('en-US', { month: 'short' });
      return { month: label, Income: income, Expenses: expenses };
    });
  }, [state.transactions]);

  const months = useMemo(() => {
    const set = new Set(state.transactions.map((t) => t.date.slice(0, 7)));
    set.add(currentMonthKey());
    return [...set].sort().reverse();
  }, [state.transactions]);

  const pieData = useMemo(() => {
    const byCat = {};
    for (const t of state.transactions) {
      if (t.type !== 'expense' || t.voided || t.category === TRANSFER_CATEGORY || !t.date.startsWith(month)) continue;
      byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    }
    return Object.entries(byCat)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [state.transactions, month]);

  const hasAnyData = state.transactions.length > 0;

  return (
    <div>
      <PageTitle sub="How your money moves over time.">Reports</PageTitle>

      <Card className="mb-4">
        <h2 className="font-medium mb-4">Income vs. expenses — last 6 months</h2>
        {!hasAnyData ? (
          <EmptyState>Log some transactions to see your trends.</EmptyState>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  width={50}
                />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="Income" fill="#4ade80" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f472b6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Category breakdown</h2>
          <Select value={month} onChange={(e) => setMonth(e.target.value)} className="!w-44">
            {months.map((m) => (
              <option key={m} value={m}>{fmtMonth(m)}</option>
            ))}
          </Select>
        </div>
        {pieData.length === 0 ? (
          <EmptyState>No expenses in {fmtMonth(month)}.</EmptyState>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3} stroke="none">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2">
              {pieData.map((d, i) => {
                const total = pieData.reduce((s, x) => s + x.value, 0);
                return (
                  <li key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {d.name}
                    </span>
                    <span className="text-white/55">
                      {fmt(d.value)} <span className="text-white/30">({((d.value / total) * 100).toFixed(0)}%)</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
