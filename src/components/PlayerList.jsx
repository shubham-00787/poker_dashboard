import React, { useEffect, useRef } from "react";

/**
 * PlayerList
 * - players: array
 * - selectedPlayer: object | null
 * - onSelect: fn(player)
 */
export default function PlayerList({ players, selectedPlayer, onSelect }) {
  const listRef = useRef(null);

  // When selectedPlayer changes, scroll it into view smoothly
  useEffect(() => {
    if (!selectedPlayer || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-player-id="${selectedPlayer.id}"]`);
    if (el && typeof el.scrollIntoView === "function") {
      // scroll with some offset so it isn't flush to the top
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedPlayer]);

  return (
    <div ref={listRef} className="space-y-1 overflow-y-auto max-h-[70vh] pr-2">
      {players.map((p) => {
        const isSelected = selectedPlayer && selectedPlayer.id === p.id;

        return (
          <button
            key={p.id}
            data-player-id={p.id}
            onClick={() => onSelect(p)}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm transform transition
              duration-250 ease-out
              ${isSelected ? "bg-slate-800/60 ring-1 ring-emerald-400/25 scale-[1.01] shadow-[0_6px_20px_rgba(2,6,23,0.6)]" : "hover:bg-slate-900/50"}
            `}
            style={{
              // slightly different elevation for selected item
              boxShadow: isSelected ? "0 10px 30px rgba(2,6,23,0.45)" : undefined,
            }}
            aria-pressed={isSelected}
          >
            {p.photo_url ? (
              <img
                src={p.photo_url}
                alt={p.name}
                className={`w-9 h-9 rounded-full object-cover border ${isSelected ? "border-emerald-300/40" : "border-slate-700"}`}
              />
            ) : (
              <div
                className={`w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 border ${isSelected ? "border-emerald-300/40" : "border-slate-700"}`}
              >
                {p.name?.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1">
              <div className={`text-slate-100 ${isSelected ? "font-semibold" : ""}`}>{p.name}</div>
              <div className="text-[11px] text-slate-400">Click to view details</div>
            </div>

            {/* little indicator dot */}
            <div className={`w-2 h-2 rounded-full ${isSelected ? "bg-emerald-400" : "bg-transparent border border-slate-700"}`} />
          </button>
        );
      })}

      {players.length === 0 && (
        <p className="text-xs text-slate-500">No players yet. Add one above.</p>
      )}
    </div>
  );
}
