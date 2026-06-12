import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useFinance, fmt, fmtDate, currentMonthKey, daysInMonth, nextRenewal,
  PAYDAY_CATEGORY, TRANSFER_CATEGORY,
} from '../store';
import { Card, PageTitle, Stat, Input, Label, Select, Button, EmptyState, CHART_COLORS } from '../components/ui';

function nextPayday(paydayDay) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const dayThisMonth = Math.min(paydayDay, daysInMonth(y, m));
  let next = new Date(y, m, dayThisMonth);
  if (now.getDate() >= dayThisMonth) {
    next = new Date(y, m + 1, Math.min(paydayDay, daysInMonth(y, m + 1)));
  }
  const today = new Date(y, m, now.getDate());
  return { date: next, daysAway: Math.round((next - today) / 86400000) };
}

function SpendRing({ spent, cap }) {
  const pct = cap > 0 ? spent / cap : 0;
  const over = cap > 0 && spent > cap;
  const r = 84;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * Math.min(pct, 1);

  return (
    <div className="relative w-56 h-56 shrink-0">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="13" />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke={over ? '#f87171' : '#2E5BFF'}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          style={{
            transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease',
            filter: over
              ? 'drop-shadow(0 0 8px rgba(248,113,113,0.45))'
              : 'drop-shadow(0 0 8px rgba(46,91,255,0.55))',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-semibold ${over ? 'text-red-300' : 'text-[#8ea4ff]'}`}>
          {cap > 0 ? `${Math.round(pct * 100)}%` : '—'}
        </span>
        <span className="text-sm text-white/70 mt-1">{fmt(spent)}</span>
        <span className="text-[11px] text-white/35">spent this month</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { state, actions, derived } = useFinance();
  const mk = currentMonthKey();
  const [editingCap, setEditingCap] = useState(false);
  const [capInput, setCapInput] = useState('');
  const [acctFilter, setAcctFilter] = useState('all');

  const txAccount = (t) => t.accountId || state.settings.mainAccountId;
  const monthTx = state.transactions.filter(
    (t) => t.date.startsWith(mk) && !t.voided && t.category !== TRANSFER_CATEGORY
  );
  const spendTx = monthTx.filter(
    (t) => t.type === 'expense' && (acctFilter === 'all' || txAccount(t) === acctFilter)
  );
  const spent = spendTx.reduce((s, t) => s + t.amount, 0);
  const overallSpent = monthTx
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const cap = state.settings.spendingCap || state.settings.paydayAmount;
  const savingGoal = state.settings.paydayAmount - cap;

  const payday = nextPayday(state.settings.paydayDay);

  const upcoming = state.subscriptions
    .map((sub) => ({ ...sub, renewal: nextRenewal(sub.renewalDay) }))
    .filter((s) => s.renewal.daysAway <= 7)
    .sort((a, b) => a.renewal.daysAway - b.renewal.daysAway);

  const byCategory = {};
  for (const t of spendTx) {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  }
  const breakdown = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const maxCat = breakdown[0]?.value || 1;

  const recent = state.transactions
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const saveCap = (e) => {
    e.preventDefault();
    const value = parseFloat(capInput);
    if (!isNaN(value) && value >= 0) {
      actions.updateSettings({ spendingCap: value });
    }
    setEditingCap(false);
  };

  return (
    <div>
      <PageTitle sub={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}>
        Dashboard
      </PageTitle>

      {(() => {
        const now = new Date();
        const lastDay = daysInMonth(now.getFullYear(), now.getMonth());
        const showRollover =
          now.getDate() >= lastDay - 2 && derived.mainBalance > 0 && derived.otherAccounts.length > 0;
        if (!showRollover) return null;
        return (
          <div className="mb-4 px-4 py-3 rounded-xl bg-amber-400/10 border border-amber-400/25 text-sm flex items-center justify-between gap-3 flex-wrap">
            <span className="text-amber-200">
              Month-end rollover — you have <strong>{fmt(derived.mainBalance)}</strong> left in your
              payday account.
            </span>
            <Link to="/accounts" className="text-amber-300 hover:text-amber-100 font-medium shrink-0">
              Roll it over →
            </Link>
          </div>
        );
      })()}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Net worth" value={fmt(derived.netWorth)} accent="text-green-400" />
        <Stat label="Main account" value={fmt(derived.mainBalance)} />
        <Stat
          label="Left to spend"
          value={fmt(Math.max(cap - overallSpent, 0))}
          accent={overallSpent > cap ? 'text-red-300' : 'text-[#8ea4ff]'}
          sub={overallSpent > cap ? `${fmt(overallSpent - cap)} over your cap` : `of ${fmt(cap)} cap`}
        />
        <Stat
          label="Next payday"
          value={payday.daysAway === 0 ? 'Today!' : `${payday.daysAway} day${payday.daysAway === 1 ? '' : 's'}`}
          sub={`${fmt(state.settings.paydayAmount)} on ${payday.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        {/* Spending this month — the main event */}
        <Card className="lg:col-span-2" innerClassName="!p-6">
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-3">
              <h2 className="font-medium text-lg">Spending this month</h2>
              <Select
                value={acctFilter}
                onChange={(e) => setAcctFilter(e.target.value)}
                className="!w-44 !py-1 text-xs"
              >
                <option value="all">All accounts</option>
                {state.accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </div>
            {editingCap ? (
              <form onSubmit={saveCap} className="flex items-end gap-2">
                <div>
                  <Label>Monthly cap ($)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={capInput}
                    onChange={(e) => setCapInput(e.target.value)}
                    className="!w-28 !py-1"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="!py-1.5 text-xs">Save</Button>
                <Button type="button" variant="ghost" className="!py-1.5 text-xs" onClick={() => setEditingCap(false)}>
                  Cancel
                </Button>
              </form>
            ) : (
              <button
                onClick={() => { setCapInput(String(cap)); setEditingCap(true); }}
                className="text-xs text-[#8ea4ff] hover:text-[#b9c6ff] cursor-pointer"
              >
                Edit cap ({fmt(cap)})
              </button>
            )}
          </div>
          <p className="text-xs text-white/35 mb-4">
            {savingGoal > 0
              ? `Cap of ${fmt(cap)} means you're aiming to save ${fmt(savingGoal)} of your ${fmt(state.settings.paydayAmount)} payday.`
              : `Cap matches your full ${fmt(state.settings.paydayAmount)} payday — lower it to set a savings goal.`}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-8">
            <SpendRing spent={spent} cap={cap} />
            <div className="flex-1 w-full">
              {breakdown.length === 0 ? (
                <EmptyState>No expenses logged this month yet.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {breakdown.slice(0, 6).map((d, i) => (
                    <li key={d.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          {d.name}
                        </span>
                        <span className="text-white/55">{fmt(d.value)}</span>
                      </div>
                      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(d.value / maxCat) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>

        {/* Right column: subscriptions (compact) + recent */}
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-sm">Renewing soon</h2>
              <Link to="/subscriptions" className="text-xs text-[#8ea4ff] hover:text-[#b9c6ff]">
                All →
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-xs text-white/35 py-2">Nothing renewing in the next 7 days.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-xs">
                    <span>{s.name}</span>
                    <span className="text-white/50">
                      {fmt(s.amount)} ·{' '}
                      <span className={s.renewal.daysAway <= 2 ? 'text-amber-300' : ''}>
                        {s.renewal.daysAway === 0 ? 'today' : `${s.renewal.daysAway}d`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-sm">Recent transactions</h2>
              <Link to="/transactions" className="text-xs text-[#8ea4ff] hover:text-[#b9c6ff]">
                All →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-xs text-white/35 py-2">Nothing logged yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {recent.map((t) => (
                  <li key={t.id} className={`flex items-center justify-between text-xs ${t.voided ? 'opacity-40' : ''}`}>
                    <div className="min-w-0">
                      <p className="truncate">
                        {t.category === PAYDAY_CATEGORY ? '💰 Payday' : t.note || t.category}
                        {t.voided && <span className="text-white/40 ml-1">(voided)</span>}
                      </p>
                      <p className="text-white/30">{fmtDate(t.date)}</p>
                    </div>
                    <span className={`shrink-0 ml-3 ${t.voided ? 'line-through text-white/40' : t.type === 'income' ? 'text-green-400' : 'text-red-300'}`}>
                      {t.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
