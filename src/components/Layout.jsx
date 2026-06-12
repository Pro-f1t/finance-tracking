import { useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { STORAGE_KEY } from '../store';

function DataBackup() {
  const fileRef = useRef(null);

  const exportData = () => {
    const raw = localStorage.getItem(STORAGE_KEY) || '{}';
    const blob = new Blob([raw], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `finance-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.settings || !Array.isArray(parsed.transactions)) {
          alert("That file doesn't look like a Finance Tracker backup.");
          return;
        }
        if (!confirm('Replace ALL current data with this backup? This cannot be undone.')) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        window.location.reload();
      } catch {
        alert("Couldn't read that file — it isn't valid JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="mt-auto pt-4 border-t border-white/8 space-y-1">
      <button
        onClick={exportData}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-white/45 hover:text-white hover:bg-white/5 cursor-pointer"
      >
        <span className="w-4 text-center">⬇</span> Export data
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-white/45 hover:text-white hover:bg-white/5 cursor-pointer"
      >
        <span className="w-4 text-center">⬆</span> Import backup
      </button>
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={importData} className="hidden" />
    </div>
  );
}

const links = [
  { to: '/', label: 'Dashboard', icon: '◆' },
  { to: '/transactions', label: 'Transactions', icon: '⇄' },
  { to: '/subscriptions', label: 'Subscriptions', icon: '↻' },
  { to: '/accounts', label: 'Accounts', icon: '▤' },
  { to: '/investments', label: 'Investments', icon: '↗' },
  { to: '/budget', label: 'Budget', icon: '◎' },
  { to: '/reports', label: 'Reports', icon: '∿' },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r border-white/8 p-4 flex flex-col gap-1 sticky top-0 h-screen">
        <div className="px-3 py-4 mb-2">
          <p className="font-semibold text-lg tracking-tight">
            <span className="text-[#4d6bfe]">$</span> Finance Tracker
          </p>
          <p className="text-xs text-white/35">made by Jamie Hao</p>
        </div>
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[#2E5BFF]/15 text-[#8ea4ff] border border-[#2E5BFF]/30'
                  : 'text-white/55 hover:text-white hover:bg-white/5 border border-transparent'
              }`
            }
          >
            <span className="w-4 text-center opacity-80">{icon}</span>
            {label}
          </NavLink>
        ))}
        <DataBackup />
      </aside>
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
