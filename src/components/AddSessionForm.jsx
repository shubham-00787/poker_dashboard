import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AddSessionForm({ player, onAdded }) {
  const [buyin, setBuyin] = useState("");
  const [cashout, setCashout] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);

  const handleAddSession = async (e) => {
    e.preventDefault();
    if (!buyin || !cashout) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("sessions").insert([
        {
          player_id: player.id,
          buyin: Number(buyin),
          cashout: Number(cashout),
          game_date: date,
        },
      ]);

      if (error) {
        console.error("Error adding session", error);
      } else {
        setBuyin("");
        setCashout("");
        onAdded?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleAddSession}
      className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-300">
          Add Game Result for {player.name}
        </h3>
        {loading && (
          <span className="text-[10px] text-slate-500">
            Saving...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400">
            Date
          </label>
          <input
            type="date"
            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs text-slate-100"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400">
            Buy-in
          </label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs text-slate-100"
            value={buyin}
            onChange={(e) => setBuyin(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400">
            Amount After Game (Cash-out)
          </label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs text-slate-100"
            value={cashout}
            onChange={(e) => setCashout(e.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="text-xs font-medium rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-1.5 disabled:opacity-50"
      >
        Add Game
      </button>
    </form>
  );
}
