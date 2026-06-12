import { NavLink, Outlet } from 'react-router-dom';

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
      </aside>
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
