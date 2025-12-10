import React from "react";

export default function PlayerList({ players, selectedPlayer, onSelect }) {
  return (
    <div className="space-y-1">
      {players.map((p) => {
        const isSelected = selectedPlayer && selectedPlayer.id === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm
              ${isSelected ? "bg-slate-800" : "hover:bg-slate-900/70"}`}
          >
            {p.photo_url ? (
              <img
                src={p.photo_url}
                alt={p.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                {p.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-slate-100 truncate">{p.name}</span>
          </button>
        );
      })}

      {players.length === 0 && (
        <p className="text-xs text-slate-500">
          No players yet. Add one above.
        </p>
      )}
    </div>
  );
}
