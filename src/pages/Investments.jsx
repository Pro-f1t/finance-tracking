import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useFinance, fmt, uid } from '../store';
import { Card, PageTitle, Stat, Input, Select, Label, Button, EmptyState, tooltipStyle } from '../components/ui';
import { fetchSeries, fetchQuote, combineSeries, RANGE_KEYS } from '../lib/quotes';

const pctFmt = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const signFmt = (n) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;

function tickFormatter(rangeKey) {
  return (t) =>
    new Date(t).toLocaleDateString('en-US',
      rangeKey === '1Y' || rangeKey === '3Y'
        ? { month: 'short', year: '2-digit' }
        : { month: 'short', day: 'numeric' }
    );
}

function PortfolioChart({ data, rangeKey }) {
  const up = data.length >= 2 && data[data.length - 1].value >= data[0].value;
  const color = up ? '#4ade80' : '#f87171';
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={tickFormatter(rangeKey)}
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={50}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v)}`}
            width={56}
          />
          <Tooltip
            formatter={(v) => [fmt(v), 'Value']}
            labelFormatter={(t) =>
              new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
            }
            contentStyle={tooltipStyle}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const blankPosition = { symbol: '', shares: '', avgCost: '' };

function PositionsEditor({ account }) {
  const { actions } = useFinance();
  const [form, setForm] = useState(blankPosition);
  const [editingId, setEditingId] = useState(null);
  const positions = account.positions || [];

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const pos = {
      symbol: form.symbol.trim().toUpperCase(),
      shares: parseFloat(form.shares),
      avgCost: form.avgCost === '' ? null : parseFloat(form.avgCost),
    };
    if (!pos.symbol || isNaN(pos.shares) || pos.shares <= 0) return;
    const next = editingId
      ? positions.map((p) => (p.id === editingId ? { ...p, ...pos } : p))
      : [...positions, { ...pos, id: uid() }];
    actions.updateAccount(account.id, { positions: next });
    setForm(blankPosition);
    setEditingId(null);
  };

  return (
    <div>
      <form onSubmit={submit} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end mb-3">
        <div>
          <Label>Ticker symbol</Label>
          <Input type="text" placeholder="e.g. VOO, AAPL" value={form.symbol} onChange={set('symbol')} required />
        </div>
        <div>
          <Label>Shares</Label>
          <Input type="number" step="any" min="0.000001" placeholder="2.5" value={form.shares} onChange={set('shares')} required />
        </div>
        <div>
          <Label>Avg cost / share (optional)</Label>
          <Input type="number" step="0.01" min="0" placeholder="for gain tracking" value={form.avgCost} onChange={set('avgCost')} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">{editingId ? 'Save' : 'Add position'}</Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(blankPosition); }}>
              Cancel
            </Button>
          )}
        </div>
      </form>
      {positions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {positions.map((p) => (
            <span key={p.id} className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
              <span className="font-medium">{p.symbol}</span>
              <span className="text-white/45">{p.shares} sh</span>
              {p.avgCost != null && <span className="text-white/30">@ {fmt(p.avgCost)}</span>}
              <button
                onClick={() => {
                  setEditingId(p.id);
                  setForm({ symbol: p.symbol, shares: String(p.shares), avgCost: p.avgCost == null ? '' : String(p.avgCost) });
                }}
                className="text-[#8ea4ff] hover:text-[#b9c6ff] cursor-pointer"
              >
                edit
              </button>
              <button
                onClick={() => actions.updateAccount(account.id, { positions: positions.filter((x) => x.id !== p.id) })}
                className="text-red-400/60 hover:text-red-300 cursor-pointer"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Investments() {
  const { state, actions } = useFinance();
  const investmentAccounts = state.accounts.filter((a) => a.type === 'investment');

  const [scope, setScope] = useState('all');
  const [rangeKey, setRangeKey] = useState('1M');
  const [quotes, setQuotes] = useState({});
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const scopedAccounts = useMemo(
    () => (scope === 'all' ? investmentAccounts : investmentAccounts.filter((a) => a.id === scope)),
    [scope, investmentAccounts]
  );
  const singleAccount = scope !== 'all' ? scopedAccounts[0] : null;

  // Combined shares per ticker across the selected accounts.
  const holdings = useMemo(() => {
    const map = {};
    for (const a of scopedAccounts) {
      for (const p of a.positions || []) {
        if (!map[p.symbol]) map[p.symbol] = { shares: 0, cost: 0, hasCost: true };
        map[p.symbol].shares += p.shares;
        if (p.avgCost == null) map[p.symbol].hasCost = false;
        else map[p.symbol].cost += p.shares * p.avgCost;
      }
    }
    return map;
  }, [scopedAccounts]);

  const symbols = Object.keys(holdings);
  const holdingsKey = symbols.map((s) => `${s}:${holdings[s].shares}`).join(',');

  const load = useCallback(async () => {
    if (!symbols.length) {
      setChartData([]);
      setQuotes({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [seriesList, quoteList] = await Promise.all([
        Promise.all(symbols.map((s) => fetchSeries(s, rangeKey))),
        Promise.all(symbols.map((s) => fetchQuote(s))),
      ]);
      const q = {};
      symbols.forEach((s, i) => { q[s] = quoteList[i]; });
      setQuotes(q);
      setChartData(
        combineSeries(seriesList.map((d, i) => ({ points: d.points, shares: holdings[symbols[i]].shares })))
      );
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdingsKey, rangeKey]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    let value = 0, prevValue = 0, cost = 0, costKnown = true;
    for (const s of symbols) {
      const q = quotes[s];
      if (!q) { costKnown = false; continue; }
      value += holdings[s].shares * q.price;
      prevValue += holdings[s].shares * q.prevClose;
      if (holdings[s].hasCost) cost += holdings[s].cost;
      else costKnown = false;
    }
    return {
      value,
      dayChange: value - prevValue,
      dayPct: prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : 0,
      gain: costKnown && cost > 0 ? value - cost : null,
      gainPct: costKnown && cost > 0 ? ((value - cost) / cost) * 100 : null,
    };
  }, [quotes, holdingsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = symbols
    .map((s) => {
      const q = quotes[s];
      const h = holdings[s];
      return q
        ? {
            symbol: s, name: q.name, shares: h.shares, price: q.price,
            dayPct: q.prevClose > 0 ? ((q.price - q.prevClose) / q.prevClose) * 100 : 0,
            value: h.shares * q.price,
            gain: h.hasCost && h.cost > 0 ? h.shares * q.price - h.cost : null,
          }
        : { symbol: s, shares: h.shares };
    })
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  if (investmentAccounts.length === 0) {
    return (
      <div>
        <PageTitle sub="Live charts and stats for your investment accounts.">Investments</PageTitle>
        <Card>
          <EmptyState>
            No investment accounts yet — add one (e.g. your Roth IRA) on the{' '}
            <Link to="/accounts" className="text-[#8ea4ff] hover:text-[#b9c6ff]">Accounts page</Link> first.
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageTitle sub="Live prices from Yahoo Finance — add tickers to each account to track it.">
        Investments
      </PageTitle>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Select value={scope} onChange={(e) => setScope(e.target.value)} className="!w-56">
          <option value="all">All investment accounts</option>
          {investmentAccounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          {RANGE_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setRangeKey(k)}
              className={`px-3 py-1 rounded-md text-xs cursor-pointer transition-colors ${
                rangeKey === k ? 'bg-[#2E5BFF] text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-[#8ea4ff] hover:text-[#b9c6ff] cursor-pointer disabled:opacity-40"
        >
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
        {updatedAt && (
          <span className="text-[11px] text-white/30">
            updated {updatedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
      </div>

      {symbols.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Stat label="Total value" value={fmt(totals.value)} accent="text-white" />
          <Stat
            label="Today"
            value={signFmt(totals.dayChange)}
            accent={totals.dayChange >= 0 ? 'text-green-400' : 'text-red-300'}
            sub={pctFmt(totals.dayPct)}
          />
          <Stat
            label="Total return"
            value={totals.gain == null ? '—' : signFmt(totals.gain)}
            accent={totals.gain == null ? 'text-white/40' : totals.gain >= 0 ? 'text-green-400' : 'text-red-300'}
            sub={totals.gainPct == null ? 'add avg cost to track' : pctFmt(totals.gainPct)}
          />
          <Stat label="Positions" value={symbols.length} />
        </div>
      )}

      <Card className="mb-4">
        {error && (
          <p className="text-xs text-amber-300 mb-3">
            ⚠ {error} — check the ticker symbols, or try Refresh in a minute.
          </p>
        )}
        {symbols.length === 0 ? (
          <EmptyState>
            {singleAccount
              ? 'No positions in this account yet — add a ticker below to see its live chart.'
              : 'No positions yet — pick an account and add tickers to see live charts.'}
          </EmptyState>
        ) : loading && chartData.length === 0 ? (
          <EmptyState>Loading market data…</EmptyState>
        ) : chartData.length > 0 ? (
          <PortfolioChart data={chartData} rangeKey={rangeKey} />
        ) : null}
      </Card>

      {rows.length > 0 && (
        <Card className="mb-4" innerClassName="!p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-white/35">
                <th className="font-normal px-3 py-2">Symbol</th>
                <th className="font-normal px-3 py-2">Shares</th>
                <th className="font-normal px-3 py-2 text-right">Price</th>
                <th className="font-normal px-3 py-2 text-right">Today</th>
                <th className="font-normal px-3 py-2 text-right">Value</th>
                <th className="font-normal px-3 py-2 text-right">Gain</th>
                <th className="font-normal px-3 py-2 text-right">Weight</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol} className="border-t border-white/5">
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{r.symbol}</span>
                    {r.name && r.name !== r.symbol && (
                      <span className="text-white/35 text-xs ml-2">{r.name}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-white/60">{r.shares}</td>
                  <td className="px-3 py-2.5 text-right">{r.price != null ? fmt(r.price) : '…'}</td>
                  <td className={`px-3 py-2.5 text-right ${r.dayPct == null ? '' : r.dayPct >= 0 ? 'text-green-400' : 'text-red-300'}`}>
                    {r.dayPct != null ? pctFmt(r.dayPct) : '…'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium">{r.value != null ? fmt(r.value) : '…'}</td>
                  <td className={`px-3 py-2.5 text-right ${r.gain == null ? 'text-white/30' : r.gain >= 0 ? 'text-green-400' : 'text-red-300'}`}>
                    {r.gain == null ? '—' : signFmt(r.gain)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white/50">
                    {r.value != null && totals.value > 0 ? `${((r.value / totals.value) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {singleAccount ? (
        <Card>
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="font-medium">Positions in {singleAccount.name}</h2>
            {totals.value > 0 && (
              <Button
                variant="ghost"
                className="!py-1.5 text-xs"
                onClick={() =>
                  actions.logAccountEntry(singleAccount.id, {
                    kind: 'update',
                    amount: Math.round(totals.value * 100) / 100,
                    note: 'Synced from live prices',
                  })
                }
              >
                Sync {fmt(totals.value)} to account balance
              </Button>
            )}
          </div>
          <p className="text-xs text-white/40 mb-4">
            Add each holding's ticker and share count. Avg cost is optional but enables gain tracking.
          </p>
          <PositionsEditor account={singleAccount} />
        </Card>
      ) : (
        <p className="text-xs text-white/35">
          Select a single account above to edit its positions.
        </p>
      )}
    </div>
  );
}
