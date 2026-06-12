import { useMemo, useState } from 'react';
import {
  useFinance, fmt, fmtDate, fmtMonth, todayStr,
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYDAY_CATEGORY,
} from '../store';
import { Card, PageTitle, Input, Select, Label, Button, EmptyState } from '../components/ui';
import DatePicker from '../components/DatePicker';

const blankForm = () => ({
  type: 'expense',
  amount: '',
  date: todayStr(),
  category: EXPENSE_CATEGORIES[0],
  note: '',
  accountId: '', // empty = main account
});

export default function Transactions() {
  const { state, actions } = useFinance();
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const setType = (type) =>
    setForm((f) => ({
      ...f,
      type,
      category: type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[1],
    }));

  const submit = (e) => {
    e.preventDefault();
    const tx = {
      type: form.type,
      amount: parseFloat(form.amount),
      date: form.date,
      category: form.category,
      note: form.note.trim(),
      accountId: form.accountId || state.settings.mainAccountId,
    };
    if (!tx.amount || tx.amount <= 0) return;
    if (editingId) {
      actions.updateTransaction(editingId, tx);
      setEditingId(null);
    } else {
      actions.addTransaction(tx);
    }
    setForm(blankForm());
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setForm({ type: t.type, amount: String(t.amount), date: t.date, category: t.category, note: t.note || '', accountId: t.accountId || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm());
  };

  const months = useMemo(() => {
    const set = new Set(state.transactions.map((t) => t.date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [state.transactions]);

  const visible = state.transactions
    .filter((t) => filterMonth === 'all' || t.date.startsWith(filterMonth))
    .filter((t) => filterCategory === 'all' || t.category === filterCategory)
    .sort((a, b) => b.date.localeCompare(a.date));

  const categories = form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div>
      <PageTitle sub="Log income and expenses — everything is saved on this device.">
        Transactions
      </PageTitle>

      <Card className="mb-4">
        <form onSubmit={submit}>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`px-4 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
                form.type === 'expense'
                  ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                  : 'bg-white/5 text-white/50 border border-white/10'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`px-4 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
                form.type === 'income'
                  ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                  : 'bg-white/5 text-white/50 border border-white/10'
              }`}
            >
              Income
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount} onChange={set('amount')} required />
            </div>
            <div>
              <Label>Date</Label>
              <DatePicker value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onChange={set('category')}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{form.type === 'expense' ? 'Paid from' : 'Paid into'}</Label>
              <Select value={form.accountId} onChange={set('accountId')}>
                {state.accounts.map((a) => (
                  <option key={a.id} value={a.isMain ? '' : a.id}>
                    {a.name}{a.isMain ? ' (main)' : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input type="text" placeholder="e.g. Chipotle" value={form.note} onChange={set('note')} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingId ? 'Save' : 'Add'}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>

      <div className="flex gap-3 mb-4">
        <Select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="!w-44">
          <option value="all">All months</option>
          {months.map((m) => (
            <option key={m} value={m}>{fmtMonth(m)}</option>
          ))}
        </Select>
        <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="!w-48">
          <option value="all">All categories</option>
          {[...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>

      <Card innerClassName="!p-2">
        {visible.length === 0 ? (
          <EmptyState>No transactions match.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-white/35">
                <th className="font-normal px-3 py-2">Date</th>
                <th className="font-normal px-3 py-2">Category</th>
                <th className="font-normal px-3 py-2">Account</th>
                <th className="font-normal px-3 py-2">Note</th>
                <th className="font-normal px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr
                  key={t.id}
                  className={`border-t border-white/5 hover:bg-white/[0.03] ${t.voided ? 'opacity-45' : ''}`}
                >
                  <td className="px-3 py-2.5 text-white/60 whitespace-nowrap">{fmtDate(t.date)}</td>
                  <td className="px-3 py-2.5">
                    {t.category === PAYDAY_CATEGORY ? '💰 ' : ''}{t.category}
                    {t.voided && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 align-middle">
                        voided
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-white/45 whitespace-nowrap">
                    {state.accounts.find((a) => a.id === (t.accountId || state.settings.mainAccountId))?.name || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-white/50">{t.note}</td>
                  <td
                    className={`px-3 py-2.5 text-right font-medium ${
                      t.voided
                        ? 'line-through text-white/40'
                        : t.type === 'income'
                          ? 'text-green-400'
                          : 'text-red-300'
                    }`}
                    title={t.voided ? 'Voided — not counted in balances or spending' : undefined}
                  >
                    {t.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => startEdit(t)}
                      className="text-xs text-white/40 hover:text-white mr-3 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => actions.toggleVoid(t.id)}
                      className="text-xs text-[#8ea4ff]/70 hover:text-[#b9c6ff] mr-3 cursor-pointer"
                      title="Voided payments stay visible but don't count — e.g. covered by parents"
                    >
                      {t.voided ? 'Unvoid' : 'Void'}
                    </button>
                    <button
                      onClick={() => actions.deleteTransaction(t.id)}
                      className="text-xs text-red-400/60 hover:text-red-300 cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
