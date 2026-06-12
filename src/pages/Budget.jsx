import { useFinance, fmt, fmtMonth, currentMonthKey, EXPENSE_CATEGORIES } from '../store';
import { Card, PageTitle, Input, ProgressBar } from '../components/ui';

export default function Budget() {
  const { state, actions } = useFinance();
  const mk = currentMonthKey();

  const spentByCategory = {};
  for (const t of state.transactions) {
    if (t.type !== 'expense' || t.voided || !t.date.startsWith(mk)) continue;
    spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount;
  }

  const totalBudget = Object.values(state.budgets).reduce((s, v) => s + v, 0);
  const totalSpent = EXPENSE_CATEGORIES.reduce((s, c) => s + (spentByCategory[c] || 0), 0);

  return (
    <div>
      <PageTitle sub={`Set monthly limits per category — tracking ${fmtMonth(mk)}.`}>
        Budget
      </PageTitle>

      {totalBudget > 0 && (
        <Card className="mb-4 max-w-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium">Overall</p>
            <p className="text-sm text-white/55">
              {fmt(totalSpent)} of {fmt(totalBudget)}
              {totalSpent > totalBudget && <span className="text-red-300 ml-2">over budget!</span>}
            </p>
          </div>
          <ProgressBar value={totalSpent} max={totalBudget} />
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {EXPENSE_CATEGORIES.map((cat) => {
          const limit = state.budgets[cat] || 0;
          const spent = spentByCategory[cat] || 0;
          const over = limit > 0 && spent > limit;
          const close = !over && limit > 0 && spent / limit >= 0.8;
          return (
            <Card key={cat}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="font-medium text-sm">{cat}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-white/35">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="no limit"
                    value={limit || ''}
                    onChange={(e) => actions.setBudget(cat, parseFloat(e.target.value) || 0)}
                    className="!w-24 !py-1 text-right"
                  />
                  <span className="text-xs text-white/35">/mo</span>
                </div>
              </div>
              {limit > 0 ? (
                <>
                  <ProgressBar value={spent} max={limit} />
                  <p className="text-xs mt-2 text-white/45">
                    {fmt(spent)} of {fmt(limit)}
                    {over && <span className="text-red-300 ml-2">⚠ {fmt(spent - limit)} over</span>}
                    {close && <span className="text-amber-300 ml-2">getting close</span>}
                    {!over && !close && <span className="text-white/30 ml-2">{fmt(limit - spent)} left</span>}
                  </p>
                </>
              ) : (
                <p className="text-xs text-white/30">
                  {spent > 0 ? `${fmt(spent)} spent — set a limit to track it` : 'No limit set'}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
