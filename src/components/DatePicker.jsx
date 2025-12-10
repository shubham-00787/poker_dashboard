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
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DatePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseDateString(value), [value]);
  const [currentMonth, setCurrentMonth] = useState(
    parsed || new Date()
  );

  useEffect(() => {
    if (parsed) {
      setCurrentMonth(parsed);
    }
  }, [parsed]);

  const daysGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay(); // 0 = Sunday
    const startDate = new Date(year, month, 1 - startDay);

    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + i
      );
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

  const goPrevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const goNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

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
        <label className="block text-[10px] text-slate-400 mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs text-slate-100 hover:border-emerald-500/70"
      >
        <span className={parsed ? "" : "text-slate-500"}>
          {displayText}
        </span>
        <span className="ml-2 text-slate-500 text-[11px]">
          📅
        </span>
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-950 shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={goPrevMonth}
              className="px-1.5 py-0.5 rounded-lg border border-slate-700 bg-slate-900 text-[11px] hover:bg-slate-800"
            >
              ‹
            </button>
            <div className="text-[11px] font-medium text-slate-100">
              {MONTH_NAMES[currentMonth.getMonth()]}{" "}
              {currentMonth.getFullYear()}
            </div>
            <button
              type="button"
              onClick={goNextMonth}
              className="px-1.5 py-0.5 rounded-lg border border-slate-700 bg-slate-900 text-[11px] hover:bg-slate-800"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 text-[10px] text-slate-400 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center py-0.5">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-[11px]">
            {daysGrid.map(({ date, inCurrentMonth }, idx) => {
              const iso = formatDate(date);
              const isSelected = value === iso;
              const isToday =
                iso === formatDate(new Date());

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(date)}
                  className={[
                    "w-7 h-7 flex items-center justify-center rounded-full border text-xs transition",
                    !inCurrentMonth
                      ? "text-slate-600 border-transparent"
                      : "text-slate-100 border-slate-800",
                    isToday && !isSelected
                      ? "border-emerald-500/60"
                      : "",
                    isSelected
                      ? "bg-emerald-500 text-slate-950 border-emerald-400"
                      : "hover:bg-slate-800",
                  ].join(" ")}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
