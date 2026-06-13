import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const pad = (n) => String(n).padStart(2, '0');
const toStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const POPUP_HEIGHT = 330;

export default function DatePicker({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const popRef = useRef(null);

  const [selY, selM, selD] = (value || '').split('-').map(Number);
  const selected = value ? new Date(selY, selM - 1, selD) : new Date();
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        popRef.current && !popRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onReposition = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  const openPicker = () => {
    setViewYear(selected.getFullYear());
    setViewMonth(selected.getMonth());
    // Fixed positioning so the popup isn't clipped by the card's scroll container.
    const r = btnRef.current.getBoundingClientRect();
    const top = r.bottom + POPUP_HEIGHT + 12 > window.innerHeight ? r.top - POPUP_HEIGHT - 6 : r.bottom + 6;
    setPos({ top, left: Math.min(r.left, window.innerWidth - 280) });
    setOpen(true);
  };

  const shiftMonth = (n) => {
    const d = new Date(viewYear, viewMonth + n, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const pick = (day) => {
    onChange(toStr(viewYear, viewMonth, day));
    setOpen(false);
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const numDays = new Date(viewYear, viewMonth + 1, 0).getDate();
  const now = new Date();
  const todayStr = toStr(now.getFullYear(), now.getMonth(), now.getDate());

  const label = value
    ? selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Pick a date';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-left outline-none focus:border-[#3A5BFF]/70 transition-colors cursor-pointer flex items-center justify-between gap-2 ${className}`}
      >
        <span>{label}</span>
        <span className="text-white/35 text-xs">▾</span>
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          className="fixed z-[100] p-3 rounded-2xl border border-white/12 bg-[#141927] shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
          style={{ top: pos.top, left: pos.left, width: 264 }}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="w-7 h-7 rounded-lg hover:bg-white/10 text-white/60 cursor-pointer"
            >
              ‹
            </button>
            <span className="text-sm font-medium">
              {new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="w-7 h-7 rounded-lg hover:bg-white/10 text-white/60 cursor-pointer"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <span key={w} className="h-7 flex items-center justify-center text-[11px] text-white/30">
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: numDays }, (_, i) => {
              const day = i + 1;
              const str = toStr(viewYear, viewMonth, day);
              const isSelected = str === value;
              const isToday = str === todayStr;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pick(day)}
                  className={`h-8 rounded-lg text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#2E5BFF] text-white font-medium'
                      : isToday
                        ? 'border border-[#2E5BFF]/50 text-[#8ea4ff] hover:bg-white/10'
                        : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              onChange(todayStr);
              setOpen(false);
            }}
            className="mt-2 w-full py-1.5 rounded-lg text-xs text-[#8ea4ff] hover:bg-white/5 cursor-pointer"
          >
            Today
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
