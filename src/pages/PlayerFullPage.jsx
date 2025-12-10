// src/pages/PlayerFullPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import ImageModal from "../components/ImageModal";

const PIE_COLORS = ["#10b981", "#6366f1"];
const DIST_COLORS = ["#f97373", "#fb7185", "#e5e7eb", "#4ade80", "#22c55e"];

export default function PlayerFullPage() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // subtle image magnify
  const [imageModalUrl, setImageModalUrl] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const { data: p, error: pErr } = await supabase
        .from("players")
        .select("*")
        .eq("id", id)
        .single();

      const { data: s, error: sErr } = await supabase
        .from("sessions")
        .select("*")
        .eq("player_id", id)
        .order("game_date", { ascending: true });

      if (pErr) console.error("Error loading player", pErr);
      if (sErr) console.error("Error loading sessions", sErr);

      setPlayer(p);
      setSessions(s || []);
      setLoading(false);
    };

    loadData();
  }, [id]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setImageModalUrl(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const stats = useMemo(() => {
    if (!sessions.length) {
      return {
        totalGames: 0,
        totalProfit: 0,
        totalBuyin: 0,
        roi: "0.0",
      };
    }

    const totalProfit = sessions.reduce(
      (sum, g) => sum + (Number(g.cashout) - Number(g.buyin)),
      0
    );
    const totalBuyin = sessions.reduce(
      (sum, g) => sum + Number(g.buyin),
      0
    );
    const roi =
      totalBuyin > 0 ? ((totalProfit / totalBuyin) * 100).toFixed(1) : "0.0";

    return {
      totalGames: sessions.length,
      totalProfit,
      totalBuyin,
      roi,
    };
  }, [sessions]);

  // Profit trend line data (cumulative)
  const profitTrendData = useMemo(() => {
    let cumulative = 0;
    return sessions.map((g) => {
      const profit = Number(g.cashout) - Number(g.buyin);
      cumulative += profit;
      return {
        date: g.game_date,
        profit,
        cumulative,
      };
    });
  }, [sessions]);

  // Pie chart: total buy-in vs cash-out
  const pieData = useMemo(() => {
    const totalBuyin = sessions.reduce(
      (sum, g) => sum + Number(g.buyin),
      0
    );
    const totalCashout = sessions.reduce(
      (sum, g) => sum + Number(g.cashout),
      0
    );
    return [
      { name: "Total Buy-in", value: totalBuyin },
      { name: "Total Cash-out", value: totalCashout },
    ];
  }, [sessions]);

  // Profit distribution buckets
  const profitDistribution = useMemo(() => {
    const buckets = {
      bigLoss: 0,
      loss: 0,
      even: 0,
      win: 0,
      bigWin: 0,
    };

    sessions.forEach((g) => {
      const profit = Number(g.cashout) - Number(g.buyin);
      if (profit <= -200) buckets.bigLoss += 1;
      else if (profit < 0) buckets.loss += 1;
      else if (profit === 0) buckets.even += 1;
      else if (profit < 200) buckets.win += 1;
      else buckets.bigWin += 1;
    });

    return [
      { label: "Big Loss (≤ -200)", count: buckets.bigLoss },
      { label: "Loss (< 0)", count: buckets.loss },
      { label: "Even (0)", count: buckets.even },
      { label: "Win (< 200)", count: buckets.win },
      { label: "Big Win (≥ 200)", count: buckets.bigWin },
    ];
  }, [sessions]);

  // Heatmap-like data: each played day becomes a colored square
  const heatmapCells = useMemo(() => {
    const byDate = new Map();
    sessions.forEach((g) => {
      const profit = Number(g.cashout) - Number(g.buyin);
      const existing = byDate.get(g.game_date) || 0;
      byDate.set(g.game_date, existing + profit);
    });

    return Array.from(byDate.entries())
      .sort(([d1], [d2]) => (d1 < d2 ? -1 : 1))
      .map(([date, profit]) => ({
        date,
        profit,
      }));
  }, [sessions]);

  if (loading || !player) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-sm text-slate-400">Loading player data…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 px-4 md:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-[11px] text-slate-400 hover:text-emerald-400"
            >
              ← Back to Dashboard
            </Link>
          </div>
          <div className="text-[11px] text-slate-500">
            Player dashboard
          </div>
        </div>

        {/* Header with avatar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt={player.name}
                onClick={() => setImageModalUrl(player.photo_url)}
                className="w-16 h-16 rounded-full border border-slate-700 object-cover cursor-zoom-in hover:opacity-80"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-xl text-slate-200 border border-slate-700">
                {player.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-slate-50">
                {player.name}
              </h1>
              <p className="text-xs text-slate-500">
                Full performance overview · {stats.totalGames} games tracked
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-right text-xs">
            <div>
              <div className="text-[10px] text-slate-400">
                Net Profit
              </div>
              <div
                className={`text-base font-semibold ${
                  stats.totalProfit > 0
                    ? "text-emerald-400"
                    : stats.totalProfit < 0
                    ? "text-rose-400"
                    : "text-slate-200"
                }`}
              >
                {stats.totalProfit >= 0 ? "+" : ""}
                {stats.totalProfit.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">
                ROI
              </div>
              <div className="text-base font-semibold text-slate-100">
                {stats.roi}%
              </div>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Games"
            value={stats.totalGames}
          />
          <StatCard
            label="Total Buy-in"
            value={stats.totalBuyin.toFixed(2)}
          />
          <StatCard
            label="Total Cash-out"
            value={(
              stats.totalBuyin + stats.totalProfit
            ).toFixed(2)}
          />
          <StatCard label="ROI" value={`${stats.roi}%`} />
        </div>

        {/* Charts row: profit trend + pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-slate-200">
                Profit trend (per game)
              </h2>
              <span className="text-[10px] text-slate-500">
                Cumulative profit over time
              </span>
            </div>
            <div className="h-56">
              {profitTrendData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profitTrendData}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #1f2937",
                        fontSize: 11,
                        color: "#e5e7eb",
                      }}
                      labelStyle={{ color: "#e5e7eb" }}
                      itemStyle={{ color: "#e5e7eb" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartPlaceholder />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-slate-200">
                Buy-in vs Cash-out
              </h2>
            </div>
            <div className="h-56 flex items-center justify-center">
              {pieData[0].value + pieData[1].value > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #1f2937",
                        fontSize: 11,
                        color: "#e5e7eb",
                      }}
                      labelStyle={{ color: "#e5e7eb" }}
                      itemStyle={{ color: "#e5e7eb" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartPlaceholder />
              )}
            </div>
            <div className="mt-2 flex justify-center gap-4 text-[10px] text-slate-400">
              <LegendDot color={PIE_COLORS[0]} label="Total Buy-in" />
              <LegendDot color={PIE_COLORS[1]} label="Total Cash-out" />
            </div>
          </div>
        </div>

        {/* Second charts row: distribution + heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-slate-200">
                Profit distribution
              </h2>
              <span className="text-[10px] text-slate-500">
                Categories of game results
              </span>
            </div>
            <div className="h-56">
              {stats.totalGames ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitDistribution}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #1f2937",
                        fontSize: 11,
                        color: "#e5e7eb",
                      }}
                      labelStyle={{ color: "#e5e7eb" }}
                      itemStyle={{ color: "#e5e7eb" }}
                    />
                    <Bar dataKey="count">
                      {profitDistribution.map((_, index) => (
                        <Cell
                          key={index}
                          fill={DIST_COLORS[index % DIST_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartPlaceholder />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-slate-200">
                Profit heatmap
              </h2>
              <span className="text-[10px] text-slate-500">
                Each square is a day played (green = win, red = loss)
              </span>
            </div>
            <div className="h-56">
              {heatmapCells.length ? (
                <div className="h-full flex flex-col justify-between">
                  <div className="grid auto-rows-[18px] grid-flow-col auto-cols-[18px] gap-1 overflow-x-auto pb-1">
                    {heatmapCells.map((cell) => {
                      const profit = cell.profit;
                      let bg = "bg-slate-800";
                      if (profit > 0 && profit < 100) bg = "bg-emerald-500/60";
                      else if (profit >= 100) bg = "bg-emerald-400";
                      else if (profit < 0 && profit > -100) bg = "bg-rose-500/60";
                      else if (profit <= -100) bg = "bg-rose-400";

                      return (
                        <div
                          key={cell.date}
                          className={`w-[18px] h-[18px] rounded-sm ${bg} border border-slate-900`}
                          title={`${cell.date}: ${
                            profit >= 0 ? "+" : ""
                          }${profit.toFixed(2)}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400">
                    <span>Older</span>
                    <span>Newer</span>
                  </div>
                </div>
              ) : (
                <EmptyChartPlaceholder />
              )}
            </div>
          </div>
        </div>

        {/* Raw table at bottom */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-200">
              Game history
            </h2>
            <span className="text-[10px] text-slate-500">
              {stats.totalGames} games
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-right">Buy-in</th>
                  <th className="px-3 py-2 text-right">Cash-out</th>
                  <th className="px-3 py-2 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {sessions
                  .slice()
                  .sort((a, b) =>
                    a.game_date < b.game_date ? 1 : -1
                  )
                  .map((g) => {
                    const profit =
                      Number(g.cashout) - Number(g.buyin);
                    return (
                      <tr
                        key={g.id}
                        className="border-t border-slate-800 hover:bg-slate-900/60"
                      >
                        <td className="px-3 py-2">{g.game_date}</td>
                        <td className="px-3 py-2 text-right">
                          {Number(g.buyin).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {Number(g.cashout).toFixed(2)}
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

                {sessions.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-4 text-center text-slate-500"
                    >
                      No games tracked yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ImageModal
        url={imageModalUrl}
        onClose={() => setImageModalUrl(null)}
      />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="text-lg font-semibold mt-1 text-slate-100">
        {value}
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </span>
  );
}

function EmptyChartPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-500">
      Not enough data yet. Play a few games!
    </div>
  );
}
