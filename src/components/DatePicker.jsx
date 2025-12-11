import React, { useEffect, useMemo, useState } from "react";

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateString(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DatePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseDateString(value), [value]);
  const [currentMonth, setCurrentMonth] = useState(parsed || new Date());

  useEffect(() => {
    if (parsed) setCurrentMonth(parsed);
  }, [parsed]);

  const daysGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay();
    const startDate = new Date(year, month, 1 - startDay);

    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const inCurrentMonth = date.getMonth() === month;
      days.push({ date, inCurrentMonth });
    }
    return days;
  }, [currentMonth]);

  const handleSelect = (date) => {
    const iso = formatDate(date);
    onChange?.(iso);
    setOpen(false);
  };

  const goPrevMonth = () =>
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));

  const goNextMonth = () =>
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const displayText = parsed
    ? parsed.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Select date";

  return (
    <div className="relative text-xs">
      {label && (
        <label className="block text-[11px] text-slate-400 mb-1 tracking-wide">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="
          w-full flex items-center justify-between rounded-lg
          bg-slate-950/80 border border-slate-700
          px-3 py-2 text-xs text-slate-100
          transition-all duration-150
          hover:border-emerald-400/60 hover:shadow-[0_0_8px_rgba(16,185,129,0.25)]
        "
      >
        <span className={parsed ? "" : "text-slate-500"}>{displayText}</span>

        <span className="ml-2 text-slate-400 text-[13px]">📅</span>
      </button>

      {/* Popup Calendar */}
      {open && (
        <div
          className="
            absolute z-40 mt-2 w-72 rounded-xl border border-slate-700
            bg-gradient-to-b from-slate-950 to-slate-900/90
            shadow-2xl shadow-black/40 p-4 backdrop-blur-xl
            animate-[scaleIn_0.15s_ease-out]
          "
          style={{
            transformOrigin: "top right",
          }}
        >
          {/* Month Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={goPrevMonth}
              className="
                w-7 h-7 flex items-center justify-center rounded-lg
                bg-slate-800 border border-slate-700
                text-slate-300 hover:bg-slate-700
                transition-all duration-150 hover:scale-105
              "
            >
              ‹
            </button>

            <div className="text-[12px] font-semibold text-slate-100 tracking-wide">
              {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>

            <button
              type="button"
              onClick={goNextMonth}
              className="
                w-7 h-7 flex items-center justify-center rounded-lg
                bg-slate-800 border border-slate-700
                text-slate-300 hover:bg-slate-700
                transition-all duration-150 hover:scale-105
              "
            >
              ›
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 text-[10px] text-slate-500 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-[11px]">
            {daysGrid.map(({ date, inCurrentMonth }, idx) => {
              const iso = formatDate(date);
              const isSelected = value === iso;
              const isToday = iso === formatDate(new Date());

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(date)}
                  className={[
                    "w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-all duration-150",
                    inCurrentMonth ? "text-slate-200" : "text-slate-600",
                    isToday && !isSelected ? "border border-emerald-500/40" : "",
                    isSelected
                      ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-900 font-semibold shadow-lg shadow-emerald-500/40 border border-emerald-300"
                      : "hover:bg-slate-800 hover:shadow-md hover:shadow-black/30",
                  ].join(" ")}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tiny animation keyframe */}
      <style>
        {`
          @keyframes scaleIn {
            0% { opacity: 0; transform: scale(0.92); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
    </div>
  );
}
