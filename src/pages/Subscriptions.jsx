import { useState } from 'react';
import { useFinance, fmt, nextRenewal } from '../store';
import { Card, PageTitle, Input, Label, Button, Stat, EmptyState } from '../components/ui';

const blankForm = { name: '', amount: '', renewalDay: '1' };

export default function Subscriptions() {
  const { state, actions } = useFinance();
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const sub = {
      name: form.name.trim(),
      amount: parseFloat(form.amount),
      renewalDay: Math.min(Math.max(parseInt(form.renewalDay) || 1, 1), 31),
    };
    if (!sub.name || !sub.amount || sub.amount <= 0) return;
    if (editingId) {
      actions.updateSubscription(editingId, sub);
      setEditingId(null);
    } else {
      actions.addSubscription(sub);
    }
    setForm(blankForm);
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setForm({ name: s.name, amount: String(s.amount), renewalDay: String(s.renewalDay) });
  };

  const subs = state.subscriptions
    .map((s) => ({ ...s, renewal: nextRenewal(s.renewalDay) }))
    .sort((a, b) => a.renewal.daysAway - b.renewal.daysAway);

  const monthlyTotal = subs.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div>
      <PageTitle sub="Track recurring charges and never get surprised by a renewal.">
        Subscriptions
      </PageTitle>

      <div className="grid grid-cols-2 gap-4 mb-4 max-w-md">
        <Stat label="Monthly total" value={fmt(monthlyTotal)} accent="text-[#8ea4ff]" />
        <Stat label="Per year" value={fmt(monthlyTotal * 12)} />
      </div>

      <Card className="mb-4">
        <form onSubmit={submit} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Name</Label>
            <Input type="text" placeholder="e.g. Spotify" value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <Label>Amount / month</Label>
            <Input type="number" step="0.01" min="0.01" placeholder="9.99" value={form.amount} onChange={set('amount')} required />
          </div>
          <div>
            <Label>Renews on day (1–31)</Label>
            <Input type="number" min="1" max="31" value={form.renewalDay} onChange={set('renewalDay')} required />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {editingId ? 'Save' : 'Add subscription'}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(blankForm); }}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      {subs.length === 0 ? (
        <Card>
          <EmptyState>No subscriptions yet — add Netflix, Spotify, etc. above.</EmptyState>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subs.map((s) => {
            const soon = s.renewal.daysAway <= 7;
            return (
              <Card key={s.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xl font-semibold mt-1 text-[#8ea4ff]">
                      {fmt(s.amount)}
                      <span className="text-xs text-white/35 font-normal"> /mo</span>
                    </p>
                  </div>
                  {soon && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/20">
                      Soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/50 mt-3">
                  Renews{' '}
                  <span className="text-white/80">
                    {s.renewal.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </span>{' '}
                  {s.renewal.daysAway === 0 ? '(today)' : `(in ${s.renewal.daysAway} day${s.renewal.daysAway === 1 ? '' : 's'})`}
                </p>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => startEdit(s)} className="text-xs text-white/40 hover:text-white cursor-pointer">
                    Edit
                  </button>
                  <button
                    onClick={() => actions.deleteSubscription(s.id)}
                    className="text-xs text-red-400/60 hover:text-red-300 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
