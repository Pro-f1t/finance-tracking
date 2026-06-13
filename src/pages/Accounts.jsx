import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFinance, fmt, todayStr, ACCOUNT_TYPES } from '../store';
import { Card, PageTitle, Input, Select, Label, Button, Stat } from '../components/ui';
import DatePicker from '../components/DatePicker';

function EditableBalance({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = parseFloat(input);
          if (!isNaN(v)) onSave(v);
          setEditing(false);
        }}
        className="flex items-center gap-1.5"
      >
        <Input
          type="number"
          step="0.01"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="!w-28 !py-1 text-right"
          autoFocus
        />
        <Button type="submit" className="!py-1 !px-2 text-xs">Save</Button>
        <Button type="button" variant="ghost" className="!py-1 !px-2 text-xs" onClick={() => setEditing(false)}>
          ✕
        </Button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setInput(String(Math.round(value * 100) / 100));
        setEditing(true);
      }}
      title="Click to edit balance"
      className="group text-2xl font-semibold cursor-pointer hover:text-[#b9c6ff] transition-colors"
    >
      {fmt(value)}
      <span className="text-xs align-middle ml-1.5 opacity-0 group-hover:opacity-50">✎</span>
    </button>
  );
}

function RolloverCard() {
  const { state, actions, derived } = useFinance();
  const [fromId, setFromId] = useState(state.settings.mainAccountId);
  const [toId, setToId] = useState(state.settings.rolloverAccountId || '');
  const [amount, setAmount] = useState('');
  const remaining = derived.balances[fromId] ?? 0;
  const fromName = state.accounts.find((a) => a.id === fromId)?.name || 'account';

  const submit = (e) => {
    e.preventDefault();
    const value = amount === '' ? remaining : parseFloat(amount);
    if (!toId || toId === fromId || isNaN(value) || value <= 0) return;
    const dest = state.accounts.find((a) => a.id === toId);
    actions.transfer({
      fromId,
      toId,
      amount: value,
      note: `Rollover: ${fromName} → ${dest?.name || 'account'}`,
    });
    actions.updateSettings({ rolloverAccountId: toId });
    setAmount('');
  };

  return (
    <Card className="mb-4">
      <h2 className="font-medium">Month-end rollover</h2>
      <p className="text-xs text-white/40 mt-1 mb-4">
        Move leftover money between accounts — e.g. what's left of your payday into checking at
        the end of the month. This logs a transfer, not spending.
      </p>
      <form onSubmit={submit} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div>
          <Label>From</Label>
          <Select value={fromId} onChange={(e) => setFromId(e.target.value)}>
            {state.accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Available in {fromName}</Label>
          <p className="text-xl font-semibold text-[#8ea4ff] py-0.5">{fmt(remaining)}</p>
        </div>
        <div>
          <Label>To</Label>
          <Select value={toId} onChange={(e) => setToId(e.target.value)} required>
            <option value="" disabled>Choose account…</option>
            {state.accounts.filter((a) => a.id !== fromId).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Amount (blank = all of it)</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max={remaining > 0 ? remaining : undefined}
            placeholder={fmt(remaining)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={remaining <= 0 || !toId || toId === fromId}>
          Roll over
        </Button>
      </form>
    </Card>
  );
}

function EditableName({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) onSave(input.trim());
          setEditing(false);
        }}
        className="flex items-center gap-1.5"
      >
        <Input value={input} onChange={(e) => setInput(e.target.value)} className="!w-44 !py-1" autoFocus />
        <Button type="submit" className="!py-1 !px-2 text-xs">Save</Button>
        <Button type="button" variant="ghost" className="!py-1 !px-2 text-xs" onClick={() => setEditing(false)}>✕</Button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setInput(value); setEditing(true); }}
      title="Click to rename"
      className="group font-medium cursor-pointer hover:text-[#b9c6ff] transition-colors text-left"
    >
      {value}
      <span className="text-xs ml-1.5 opacity-0 group-hover:opacity-50">✎</span>
    </button>
  );
}

function EditableNote({ value, placeholder, onSave }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(input.trim());
          setEditing(false);
        }}
        className="mt-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          autoFocus
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-[#3A5BFF]/70 transition-colors resize-y"
        />
        <div className="flex gap-2 mt-1.5">
          <Button type="submit" className="!py-1 !px-3 text-xs">Save</Button>
          <Button type="button" variant="ghost" className="!py-1 !px-3 text-xs" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setInput(value || ''); setEditing(true); }}
      className="group block w-full text-left mt-3 cursor-pointer"
      title="Click to edit note"
    >
      {value ? (
        <p className="text-sm text-white/45 whitespace-pre-wrap group-hover:text-white/65 transition-colors">
          {value}
          <span className="text-xs ml-1.5 opacity-0 group-hover:opacity-50">✎</span>
        </p>
      ) : (
        <p className="text-xs text-white/25 group-hover:text-white/45 transition-colors">+ Add a note</p>
      )}
    </button>
  );
}


function LogEntryForm({ account, onDone }) {
  const { actions } = useFinance();
  const [kind, setKind] = useState('contribution');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (isNaN(value)) return;
    actions.logAccountEntry(account.id, {
      kind,
      amount: value,
      date,
      note: note.trim() || (kind === 'contribution' ? 'Contribution' : 'Balance update'),
    });
    onDone();
  };

  return (
    <form onSubmit={submit} className="mt-4 p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setKind('contribution')}
          className={`px-3 py-1 rounded-lg text-xs cursor-pointer ${
            kind === 'contribution'
              ? 'bg-green-500/20 text-green-300 border border-green-400/30'
              : 'bg-white/5 text-white/50 border border-white/10'
          }`}
        >
          Contribution
        </button>
        <button
          type="button"
          onClick={() => setKind('update')}
          className={`px-3 py-1 rounded-lg text-xs cursor-pointer ${
            kind === 'update'
              ? 'bg-[#2E5BFF]/20 text-[#8ea4ff] border border-[#2E5BFF]/40'
              : 'bg-white/5 text-white/50 border border-white/10'
          }`}
        >
          Balance update
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>{kind === 'contribution' ? 'Amount added' : 'New total balance'}</Label>
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required autoFocus />
        </div>
        <div>
          <Label>Date</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>
      </div>
      <div>
        <Label>Note (optional)</Label>
        <Input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'contribution' ? 'e.g. Monthly Roth contribution' : 'e.g. Market gains'} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="!py-1.5 text-xs">Log it</Button>
        <Button type="button" variant="ghost" className="!py-1.5 text-xs" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export default function Accounts() {
  const { state, actions, derived } = useFinance();
  const [logFor, setLogFor] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', type: 'savings', balance: '' });
  const [payday, setPayday] = useState(null); // null = not editing

  const submitAdd = (e) => {
    e.preventDefault();
    const balance = parseFloat(addForm.balance);
    if (!addForm.name.trim() || isNaN(balance)) return;
    actions.addAccount({ name: addForm.name.trim(), type: addForm.type, balance });
    setAddForm({ name: '', type: 'savings', balance: '' });
    setShowAdd(false);
  };

  const savePayday = (e) => {
    e.preventDefault();
    actions.updateSettings({
      paydayAmount: parseFloat(payday.amount) || 0,
      paydayDay: Math.min(Math.max(parseInt(payday.day) || 1, 1), 31),
    });
    setPayday(null);
  };

  const typeLabel = (t) => ACCOUNT_TYPES.find((x) => x.value === t)?.label || t;

  return (
    <div>
      <PageTitle sub="Your full financial picture — main checking, savings, investments.">
        Accounts
      </PageTitle>

      <div className="grid grid-cols-2 gap-4 mb-4 max-w-md">
        <Stat label="Net worth" value={fmt(derived.netWorth)} accent="text-green-400" />
        <Stat label="Accounts" value={state.accounts.length} />
      </div>

      {derived.otherAccounts.length > 0 && <RolloverCard />}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Main account */}
        {derived.mainAccount && (
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <EditableName
                  value={derived.mainAccount.name}
                  onSave={(name) => actions.updateAccount(derived.mainAccount.id, { name })}
                />
                <p className="text-[11px] text-[#8ea4ff]/80 uppercase tracking-wider mt-0.5">
                  Main · payday account
                </p>
              </div>
              <EditableBalance value={derived.mainBalance} onSave={(v) => actions.setMainBalance(v)} />
            </div>
            <EditableNote
              value={
                derived.mainAccount.note ??
                `${fmt(state.settings.paydayAmount)} lands on day ${state.settings.paydayDay} of each month. Transactions default to this account, and leftovers can roll over below.`
              }
              placeholder="Notes — account number, bank, reminders…"
              onSave={(note) => actions.updateAccount(derived.mainAccount.id, { note })}
            />
            {payday ? (
              <form onSubmit={savePayday} className="mt-4 grid grid-cols-3 gap-2 items-end">
                <div>
                  <Label>Payday amount</Label>
                  <Input type="number" step="0.01" value={payday.amount} onChange={(e) => setPayday((p) => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <Label>Day of month</Label>
                  <Input type="number" min="1" max="31" value={payday.day} onChange={(e) => setPayday((p) => ({ ...p, day: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="!py-1.5 text-xs">Save</Button>
                  <Button type="button" variant="ghost" className="!py-1.5 text-xs" onClick={() => setPayday(null)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setPayday({ amount: String(state.settings.paydayAmount), day: String(state.settings.paydayDay) })}
                className="text-xs text-[#8ea4ff] hover:text-[#b9c6ff] mt-4 cursor-pointer"
              >
                Edit payday settings
              </button>
            )}
          </Card>
        )}

        {/* Other accounts */}
        {derived.otherAccounts.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between">
              <div>
                <EditableName value={a.name} onSave={(name) => actions.updateAccount(a.id, { name })} />
                <p className="text-[11px] text-white/35 uppercase tracking-wider mt-0.5">{typeLabel(a.type)}</p>
              </div>
              <EditableBalance
                value={derived.balances[a.id] ?? a.balance}
                onSave={(v) => actions.logAccountEntry(a.id, { kind: 'update', amount: v, note: 'Manual balance edit' })}
              />
            </div>
            <EditableNote
              value={a.note}
              placeholder="Notes — account number, bank, goals…"
              onSave={(note) => actions.updateAccount(a.id, { note })}
            />

            {a.type === 'investment' && (
              <Link
                to="/investments"
                className="inline-block text-xs text-[#8ea4ff] hover:text-[#b9c6ff] mt-3"
              >
                View chart & positions in Investments →
              </Link>
            )}

            {logFor === a.id ? (
              <LogEntryForm account={a} onDone={() => setLogFor(null)} />
            ) : (
              <div className="flex gap-3 mt-4">
                <button onClick={() => setLogFor(a.id)} className="text-xs text-[#8ea4ff] hover:text-[#b9c6ff] cursor-pointer">
                  {a.type === 'investment' ? 'Log contribution / update' : 'Update balance'}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${a.name}? Its history will be lost.`)) actions.deleteAccount(a.id);
                  }}
                  className="text-xs text-red-400/60 hover:text-red-300 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}
          </Card>
        ))}

        {/* Add account */}
        <Card>
          {showAdd ? (
            <form onSubmit={submitAdd} className="space-y-3">
              <p className="font-medium">New account</p>
              <div>
                <Label>Name</Label>
                <Input type="text" placeholder="e.g. Roth IRA" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Type</Label>
                  <Select value={addForm.type} onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value }))}>
                    {ACCOUNT_TYPES.filter((t) => t.value !== 'checking').map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                    <option value="checking">Checking (extra)</option>
                  </Select>
                </div>
                <div>
                  <Label>Current balance</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={addForm.balance} onChange={(e) => setAddForm((f) => ({ ...f, balance: e.target.value }))} required />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Add account</Button>
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full h-full min-h-24 flex items-center justify-center text-white/40 hover:text-white text-sm cursor-pointer"
            >
              + Add account (Roth IRA, savings, cash…)
            </button>
          )}
        </Card>
      </div>
    </div>
  );
}
