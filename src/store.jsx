import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const STORAGE_KEY = 'finance-tracker-v1';

export const PAYDAY_CATEGORY = 'Payday';
// Transfers move money between accounts — they affect balances but never count as spending.
export const TRANSFER_CATEGORY = 'Transfer';

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Rent / Housing',
  'Transport',
  'Entertainment',
  'School Supplies',
  'Subscriptions',
  'Health',
  'Clothing',
  'Other',
];

export const INCOME_CATEGORIES = [PAYDAY_CATEGORY, 'Job / Side Hustle', 'Gift', 'Refund', 'Other'];

export const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'investment', label: 'Investment (Roth IRA, etc.)' },
  { value: 'cash', label: 'Cash' },
];

const defaultState = {
  settings: {
    setupComplete: false,
    paydayAmount: 0,
    paydayDay: 1,
    mainAccountId: null,
    spendingCap: 0,
    rolloverAccountId: null,
  },
  accounts: [],
  transactions: [],
  subscriptions: [],
  budgets: {},
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const pad = (n) => String(n).padStart(2, '0');

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const currentMonthKey = () => todayStr().slice(0, 7);

export const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

export const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

export const fmtDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const fmtMonth = (monthKey) => {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// Next renewal for a subscription that renews on `renewalDay` each month.
export function nextRenewal(renewalDay) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dayThisMonth = Math.min(renewalDay, daysInMonth(year, month));
  let next = new Date(year, month, dayThisMonth);
  if (now.getDate() > dayThisMonth) {
    const dayNextMonth = Math.min(renewalDay, daysInMonth(year, month + 1));
    next = new Date(year, month + 1, dayNextMonth);
  }
  const today = new Date(year, month, now.getDate());
  const daysAway = Math.round((next - today) / 86400000);
  return { date: next, daysAway };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultState, ...parsed, settings: { ...defaultState.settings, ...parsed.settings } };
    }
  } catch (e) {
    console.error('Failed to load saved data', e);
  }
  return defaultState;
}

const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Auto-apply payday: once the payday date passes, add the income for this month.
  useEffect(() => {
    setState((s) => {
      const { setupComplete, paydayAmount, paydayDay } = s.settings;
      if (!setupComplete || !paydayAmount) return s;
      const now = new Date();
      const day = Math.min(paydayDay, daysInMonth(now.getFullYear(), now.getMonth()));
      if (now.getDate() < day) return s;
      const mk = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
      const alreadyPaid = s.transactions.some(
        (t) => t.category === PAYDAY_CATEGORY && t.date.startsWith(mk)
      );
      if (alreadyPaid) return s;
      const tx = {
        id: uid(),
        type: 'income',
        amount: paydayAmount,
        date: `${mk}-${pad(day)}`,
        category: PAYDAY_CATEGORY,
        note: 'Monthly payday (auto)',
      };
      return { ...s, transactions: [tx, ...s.transactions] };
    });
  }, [state.settings.setupComplete, state.settings.paydayAmount, state.settings.paydayDay]);

  const actions = useMemo(
    () => ({
      completeSetup({ paydayAmount, paydayDay, startingBalance }) {
        const mainAccount = {
          id: uid(),
          name: 'Main Checking',
          type: 'checking',
          isMain: true,
          initialBalance: startingBalance,
          history: [],
        };
        setState((s) => ({
          ...s,
          settings: {
            ...s.settings,
            setupComplete: true,
            paydayAmount,
            paydayDay,
            spendingCap: paydayAmount,
            mainAccountId: mainAccount.id,
          },
          accounts: [...s.accounts, mainAccount],
        }));
      },
      updateSettings(patch) {
        setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
      },
      addTransaction(tx) {
        setState((s) => ({ ...s, transactions: [{ ...tx, id: uid() }, ...s.transactions] }));
      },
      updateTransaction(id, patch) {
        setState((s) => ({
          ...s,
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }));
      },
      deleteTransaction(id) {
        setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
      },
      // Voided transactions stay visible but don't count toward balances or spending
      // (e.g. a purchase that someone else covered).
      toggleVoid(id) {
        setState((s) => ({
          ...s,
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, voided: !t.voided } : t)),
        }));
      },
      // Moves money between accounts as a matched pair of Transfer transactions.
      transfer({ fromId, toId, amount, date, note }) {
        const transferId = uid();
        const d = date || todayStr();
        setState((s) => ({
          ...s,
          transactions: [
            {
              id: uid(), type: 'expense', amount, date: d,
              category: TRANSFER_CATEGORY, note: note || 'Transfer out',
              accountId: fromId, transferId,
            },
            {
              id: uid(), type: 'income', amount, date: d,
              category: TRANSFER_CATEGORY, note: note || 'Transfer in',
              accountId: toId, transferId,
            },
            ...s.transactions,
          ],
        }));
      },
      addSubscription(sub) {
        setState((s) => ({ ...s, subscriptions: [...s.subscriptions, { ...sub, id: uid() }] }));
      },
      updateSubscription(id, patch) {
        setState((s) => ({
          ...s,
          subscriptions: s.subscriptions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        }));
      },
      deleteSubscription(id) {
        setState((s) => ({ ...s, subscriptions: s.subscriptions.filter((x) => x.id !== id) }));
      },
      addAccount({ name, type, balance, date }) {
        const entryDate = date || todayStr();
        const account = {
          id: uid(),
          name,
          type,
          isMain: false,
          balance,
          history: [{ id: uid(), date: entryDate, balance, kind: 'initial', note: 'Starting balance' }],
        };
        setState((s) => ({ ...s, accounts: [...s.accounts, account] }));
      },
      deleteAccount(id) {
        setState((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) }));
      },
      updateAccount(id, patch) {
        setState((s) => ({
          ...s,
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }));
      },
      // Directly set the main account's real total by adjusting its starting balance,
      // since the visible balance is starting balance + all transactions.
      setMainBalance(newTotal) {
        setState((s) => {
          const mainId = s.settings.mainAccountId;
          const delta = s.transactions.reduce((sum, t) => {
            if (t.voided || (t.accountId || mainId) !== mainId) return sum;
            return sum + (t.type === 'income' ? t.amount : -t.amount);
          }, 0);
          return {
            ...s,
            accounts: s.accounts.map((a) =>
              a.id === mainId ? { ...a, initialBalance: newTotal - delta } : a
            ),
          };
        });
      },
      // kind: 'contribution' (adds amount) or 'update' (sets the account's real total)
      logAccountEntry(accountId, { date, kind, amount, note }) {
        setState((s) => {
          // Transactions assigned to this account sit on top of its manual base balance,
          // so a manual "update" to the real total must back those deltas out of the base.
          const txDelta = s.transactions.reduce((sum, t) => {
            if (t.voided || (t.accountId || s.settings.mainAccountId) !== accountId) return sum;
            return sum + (t.type === 'income' ? t.amount : -t.amount);
          }, 0);
          return {
            ...s,
            accounts: s.accounts.map((a) => {
              if (a.id !== accountId) return a;
              const newBase = kind === 'contribution' ? a.balance + amount : amount - txDelta;
              const effective = newBase + txDelta;
              const entry = { id: uid(), date: date || todayStr(), balance: effective, kind, note };
              const history = [...a.history, entry].sort((x, y) => x.date.localeCompare(y.date));
              return { ...a, balance: newBase, history };
            }),
          };
        });
      },
      setBudget(category, amount) {
        setState((s) => {
          const budgets = { ...s.budgets };
          if (!amount) delete budgets[category];
          else budgets[category] = amount;
          return { ...s, budgets };
        });
      },
    }),
    []
  );

  const derived = useMemo(() => {
    const mainId = state.settings.mainAccountId;
    const mainAccount = state.accounts.find((a) => a.id === mainId) || null;

    // Transactions without an accountId predate account selection — they belong to main.
    const deltas = {};
    for (const t of state.transactions) {
      if (t.voided) continue;
      const acctId = t.accountId || mainId;
      deltas[acctId] = (deltas[acctId] || 0) + (t.type === 'income' ? t.amount : -t.amount);
    }

    const balances = {};
    for (const a of state.accounts) {
      const base = a.isMain ? a.initialBalance : a.balance;
      balances[a.id] = base + (deltas[a.id] || 0);
    }

    const mainBalance = mainAccount ? balances[mainAccount.id] : 0;
    const otherAccounts = state.accounts.filter((a) => !a.isMain);
    const netWorth = state.accounts.reduce((sum, a) => sum + balances[a.id], 0);
    return { mainAccount, mainBalance, otherAccounts, netWorth, balances };
  }, [state.accounts, state.transactions, state.settings.mainAccountId]);

  return (
    <FinanceContext.Provider value={{ state, actions, derived }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider');
  return ctx;
}
