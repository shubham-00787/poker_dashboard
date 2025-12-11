// src/components/PlayerDetail.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function PlayerDetail({ player, onPhotoClick }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!player) return;
    const fetchSessions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("player_id", player.id)
        .order("game_date", { ascending: false });

      if (error) {
        console.error("Error fetching sessions", error);
      } else {
        setSessions(data || []);
      }
      setLoading(false);
    };

    fetchSessions();
  }, [player?.id]);

  if (!player) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center text-slate-500">
        Select a player to see details.
      </div>
    );
  }

  // compute stats (use last 5 by profit as before)
  const sortedSessions = [...sessions].sort((a, b) => {
    const profitA = Number(a.cashout) - Number(a.buyin);
    const profitB = Number(b.cashout) - Number(b.buyin);
    return profitB - profitA;
  });

  const lastFive = sortedSessions.slice(0, 5);
  const totalProfit = lastFive.reduce((acc, s) => acc + (Number(s.cashout) - Number(s.buyin)), 0);
  const totalBuyin = lastFive.reduce((acc, s) => acc + Number(s.buyin), 0);
  const roi = totalBuyin > 0 ? ((totalProfit / totalBuyin) * 100).toFixed(1) : "0.0";
  const wins = lastFive.filter((s) => Number(s.cashout) - Number(s.buyin) > 0).length;
  const losses = lastFive.filter((s) => Number(s.cashout) - Number(s.buyin) < 0).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950/70 to-slate-900/60 p-4 flex items-center gap-4">
        <div>
          {player.photo_url ? (
            <button onClick={() => onPhotoClick?.(player.photo_url)} className="w-16 h-16 rounded-full overflow-hidden border border-slate-700">
              <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
            </button>
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-2xl text-slate-300 border border-slate-700">
              {player.name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-100">{player.name}</h2>
          <p className="text-xs text-slate-400 mt-1">Top 5 highest-profit games</p>
        </div>

        <div className="flex gap-2">
          {/* Placeholder edit/remove buttons can be wired from parent (Manage page) */}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Net Profit (top 5)" value={`${totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}`} />
        <StatCard label="ROI %" value={`${roi}%`} />
        <StatCard label="Wins" value={wins} />
        <StatCard label="Losses" value={losses} />
      </div>

      {/* Last 5 games */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
          <h3 className="text-xs font-medium text-slate-300">Top 5 games by profit</h3>
          {loading && <div className="text-xs text-slate-400">Loading…</div>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-transparent text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left text-xs">Date</th>
                <th className="px-3 py-2 text-right text-xs">Buy-in</th>
                <th className="px-3 py-2 text-right text-xs">Cash-out</th>
                <th className="px-3 py-2 text-right text-xs">Profit</th>
              </tr>
            </thead>
            <tbody>
              {lastFive.map((s) => {
                const profit = Number(s.cashout) - Number(s.buyin);
                return (
                  <tr key={s.id} className="border-t border-slate-900/80 hover:bg-slate-900/50">
                    <td className="px-3 py-3 text-slate-200">{s.game_date}</td>
                    <td className="px-3 py-3 text-right text-slate-200">{Number(s.buyin).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-slate-200">{Number(s.cashout).toFixed(2)}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {profit >= 0 ? "+" : ""}
                      {profit.toFixed(2)}
                    </td>
                  </tr>
                );
              })}

              {lastFive.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                    No games yet for this player.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/70 to-slate-950/60 px-3 py-3">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-lg font-semibold text-slate-100 mt-1">{value}</div>
    </div>
  );
}
