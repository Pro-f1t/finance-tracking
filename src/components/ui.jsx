import BorderGlow from './BorderGlow';

export function Card({ children, className = '', innerClassName = '' }) {
  return (
    <BorderGlow
      className={className}
      backgroundColor="#0f1322"
      borderRadius={20}
      glowRadius={28}
      glowIntensity={0.8}
      glowColor="224 80 65"
      colors={['#2E5BFF', '#002FA7', '#4d6bfe']}
    >
      <div className={`p-5 ${innerClassName}`}>{children}</div>
    </BorderGlow>
  );
}

export function PageTitle({ children, sub }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {sub && <p className="text-sm text-white/40 mt-1">{sub}</p>}
    </div>
  );
}

export function Stat({ label, value, accent = 'text-white', sub }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wider text-white/40">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </Card>
  );
}

export function Label({ children }) {
  return <label className="block text-xs text-white/50 mb-1">{children}</label>;
}

const fieldClasses =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white ' +
  'placeholder-white/25 outline-none focus:border-[#3A5BFF]/70 transition-colors';

export function Input(props) {
  return <input {...props} className={`${fieldClasses} ${props.className || ''}`} />;
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`${fieldClasses} ${props.className || ''}`}>
      {children}
    </select>
  );
}

export function Button({ children, variant = 'primary', ...props }) {
  const styles = {
    primary:
      'bg-[#1c39bb] hover:bg-[#2949d6] text-white shadow-[0_0_20px_rgba(46,91,255,0.4)]',
    ghost: 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-400/20',
  };
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${props.className || ''}`}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value, max, overColor = '#f87171', color = '#4ade80' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = max > 0 && value > max;
  const warn = !over && max > 0 && value / max >= 0.8;
  return (
    <div className="h-2 w-full bg-white/8 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: over ? overColor : warn ? '#fbbf24' : color }}
      />
    </div>
  );
}

export function EmptyState({ children }) {
  return (
    <p className="text-sm text-white/35 text-center py-8">{children}</p>
  );
}

export const CHART_COLORS = [
  '#4d6bfe', '#4ade80', '#818cf8', '#f472b6', '#fbbf24',
  '#fb923c', '#a3e635', '#22d3ee', '#f87171', '#c084fc',
];

export const tooltipStyle = {
  background: '#1c1828',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  fontSize: 13,
  color: '#ece9f4',
};
