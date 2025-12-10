import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AddGameResultForAll({ players, onAdded }) {
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (playerId, field, value) => {
    setRows((prev) => ({
      ...prev,
      [playerId]: {
        played: prev[playerId]?.played ?? true,
        ...(prev[playerId] || {}),
        [field]: value,
      },
    }));
  };

  const handleTogglePlayed = (playerId) => {
    setRows((prev) => {
      const current = prev[playerId] || {};
      const played =
        typeof current.played === "boolean" ? !current.played : false;
      return {
        ...prev,
        [playerId]: { ...current, played },
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!players.length) return;

    const sessionsToInsert = players
      .map((p) => {
        const row = rows[p.id] || {};
        const played =
          typeof row.played === "boolean" ? row.played : true;

        if (!played) return null;

        const buyin = row.buyin;
        const cashout = row.cashout;

        if (
          buyin === undefined ||
          cashout === undefined ||
          buyin === "" ||
          cashout === ""
        ) {
          return null;
        }

        return {
          player_id: p.id,
          buyin: Number(buyin),
          cashout: Number(cashout),
          game_date: date,
        };
      })
      .filter(Boolean);

    if (!sessionsToInsert.length) {
      alert("Enter buy-in and final amount for at least one player who played.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("sessions")
        .insert(sessionsToInsert);

      if (error) {
        console.error("Error inserting game result", error);
        alert("Error saving game result. Check console.");
      } else {
        setRows({});
        onAdded?.();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!players.length) {
    return (
      <div className="text-xs text-slate-500">
        No players yet. Add some players first.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-200">
          Add Game Result (all players)
        </h3>
        {loading && (
          <span className="text-[10px] text-slate-500">
            Saving...
          </span>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-slate-400">Game date</label>
        <input
          type="date"
          className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs text-slate-100"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-950 text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Played</th>
              <th className="px-3 py-2 text-left font-medium">Player</th>
              <th className="px-3 py-2 text-right font-medium">Buy-in</th>
              <th className="px-3 py-2 text-right font-medium">
                Amount After Game
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const row = rows[p.id] || {};
              const played =
                typeof row.played === "boolean" ? row.played : true;
              return (
                <tr
                  key={p.id}
                  className="border-t border-slate-900/80 hover:bg-slate-900/50"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={played}
                      onChange={() => handleTogglePlayed(p.id)}
                      className="accent-emerald-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-slate-100">
                    {p.name}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      disabled={!played}
                      className="w-24 rounded bg-slate-950 border border-slate-700 px-1 py-1 text-[11px] text-slate-100 disabled:opacity-40"
                      value={row.buyin ?? ""}
                      onChange={(e) =>
                        handleChange(p.id, "buyin", e.target.value)
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      disabled={!played}
                      className="w-28 rounded bg-slate-950 border border-slate-700 px-1 py-1 text-[11px] text-slate-100 disabled:opacity-40"
                      value={row.cashout ?? ""}
                      onChange={(e) =>
                        handleChange(p.id, "cashout", e.target.value)
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="text-xs font-medium rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-1.5 disabled:opacity-50"
      >
        Save Game Result
      </button>
    </form>
  );
}
