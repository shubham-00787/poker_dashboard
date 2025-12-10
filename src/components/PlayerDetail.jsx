import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function PlayerDetail({ player, onPhotoClick }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
  }, [player.id]);

  const sortedSessions = [...sessions].sort((a, b) => {
    const profitA = Number(a.cashout) - Number(a.buyin);
    const profitB = Number(b.cashout) - Number(b.buyin);
    return profitB - profitA;
  });

  const lastFive = sortedSessions.slice(0, 5);

  const totalProfit = lastFive.reduce(
    (acc, s) => acc + (Number(s.cashout) - Number(s.buyin)),
    0
  );
  const totalBuyin = lastFive.reduce(
    (acc, s) => acc + Number(s.buyin),
    0
  );
  const roi =
    totalBuyin > 0 ? ((totalProfit / totalBuyin) * 100).toFixed(1) : "0.0";

  const wins = lastFive.filter(
    (s) => Number(s.cashout) - Number(s.buyin) > 0
  ).length;
  const losses = lastFive.filter(
    (s) => Number(s.cashout) - Number(s.buyin) < 0
  ).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={player.name}
            onClick={() => onPhotoClick?.(player.photo_url)}
            className="w-12 h-12 rounded-full object-cover border border-slate-700 cursor-zoom-in hover:opacity-80"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-lg text-slate-300">
            {player.name?.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-slate-50">
            {player.name}
          </h2>
          <p className="text-xs text-slate-500">
            Last 5 highest-profit games
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Net Profit (top 5)"
          value={`${totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}`}
        />
        <StatCard label="ROI %" value={`${roi}%`} />
        <StatCard label="Wins" value={wins} />
        <StatCard label="Losses" value={losses} />
      </div>

      {/* Last 5 games table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
          <h3 className="text-xs font-medium text-slate-300">
            Top 5 games by profit
          </h3>
          {loading && (
            <span className="text-[10px] text-slate-500">
              Loading...
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-950/80 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium">Buy-in</th>
                <th className="px-3 py-2 text-right font-medium">Cash-out</th>
                <th className="px-3 py-2 text-right font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {lastFive.map((s) => {
                const profit =
                  Number(s.cashout) - Number(s.buyin);
                return (
                  <tr
                    key={s.id}
                    className="border-t border-slate-900/80 hover:bg-slate-900/50"
                  >
                    <td className="px-3 py-2">
                      {s.game_date}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {Number(s.buyin).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {Number(s.cashout).toFixed(2)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${
                        profit >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {profit >= 0 ? "+" : ""}
                      {profit.toFixed(2)}
                    </td>
                  </tr>
                );
              })}

              {lastFive.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-center text-slate-500"
                  >
                    No games yet. Add one below.
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
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-100 mt-0.5">
        {value}
      </div>
    </div>
  );
}
