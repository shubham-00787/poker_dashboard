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
import { Trophy, TrendingUp, TrendingDown, Zap, Star } from "lucide-react";

const PIE_COLORS = ["#10b981", "#6366f1"];
const DIST_COLORS = ["#f97373", "#fb7185", "#e5e7eb", "#4ade80", "#22c55e"];

/**
 * PlayerFullPage — polished:
 * - Removed sparklines from stat tiles
 * - Ensure 2× games aren't double-counted in 1.5× bucket
 * - Improved typography, hover/card lift, subtle gradients
 *
 * Updates in this version:
 * - Profit distribution thresholds changed: big loss <= -50, big win >= 50
 * - Best game display no longer prefixes + for negative values and uses red color for negative
 * - Added Rupee symbol (₹) to monetary values
 */

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

  // Basic stats: total games, profit, buyin, ROI
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
    const totalBuyin = sessions.reduce((sum, g) => sum + Number(g.buyin), 0);
    const roi = totalBuyin > 0 ? ((totalProfit / totalBuyin) * 100).toFixed(1) : "0.0";

    return {
      totalGames: sessions.length,
      totalProfit,
      totalBuyin,
      roi,
    };
  }, [sessions]);

  // Additional counts: wins, losses, 2x, 1.5x (non-overlapping), best game
  const extraStats = useMemo(() => {
    const res = {
      wins: 0,
      losses: 0,
      twoX: 0, // cashout >= 2 * buyin
      onePointFiveX: 0, // cashout >= 1.5 * buyin AND < 2*buyin
      bestGame: null, // { profit, date, buyin, cashout }
    };

    if (!sessions.length) return res;

    let bestProfit = -Infinity;
    sessions.forEach((g) => {
      const buy = Number(g.buyin);
      const cash = Number(g.cashout);
      const profit = cash - buy;

      if (profit > 0) res.wins += 1;
      if (profit < 0) res.losses += 1;

      // 2x check
      const is2x = buy > 0 && cash >= buy * 2;
      if (is2x) {
        res.twoX += 1;
      } else if (buy > 0 && cash >= buy * 1.5) {
        // only count 1.5x when NOT already 2x
        res.onePointFiveX += 1;
      }

      if (profit > bestProfit) {
        bestProfit = profit;
        res.bestGame = {
          profit,
          date: g.game_date,
          buyin: buy,
          cashout: cash,
        };
      }
    });

    return res;
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
    const totalBuyin = sessions.reduce((sum, g) => sum + Number(g.buyin), 0);
    const totalCashout = sessions.reduce((sum, g) => sum + Number(g.cashout), 0);
    return [
      { name: "Total Buy-in", value: totalBuyin },
      { name: "Total Cash-out", value: totalCashout },
    ];
  }, [sessions]);

  // Profit distribution buckets (updated thresholds: 50)
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
      if (profit <= -50) buckets.bigLoss += 1; // big loss: loss of 50 or more
      else if (profit < 0) buckets.loss += 1;
      else if (profit === 0) buckets.even += 1;
      else if (profit < 50) buckets.win += 1;
      else buckets.bigWin += 1; // big win: win of 50 or more
    });

    return [
      { label: "Big Loss (≤ -₹50)", count: buckets.bigLoss },
      { label: "Loss (< 0)", count: buckets.loss },
      { label: "Even (0)", count: buckets.even },
      { label: "Win (< ₹50)", count: buckets.win },
      { label: "Big Win (≥ ₹50)", count: buckets.bigWin },
    ];
  }, [sessions]);

  if (loading || !player) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-sm text-slate-400">Loading player data…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-slate-400 hover:text-emerald-400">
              ← Back to Dashboard
            </Link>
          </div>
          <div className="text-sm text-slate-500">Player dashboard</div>
        </div>

        {/* Header with avatar + big summary */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-5">
            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt={player.name}
                onClick={() => setImageModalUrl(player.photo_url)}
                className="w-20 h-20 rounded-full border border-slate-700 object-cover cursor-zoom-in hover:opacity-90 transition"
                style={{ width: 80, height: 80 }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center text-2xl text-slate-200 border border-slate-700"
                style={{ width: 80, height: 80 }}
              >
                {player.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-semibold text-slate-50 leading-tight">{player.name}</h1>
              <p className="text-sm text-slate-400 mt-1">
                Full performance overview · <span className="font-medium text-slate-200">{stats.totalGames}</span>{" "}
                games tracked
              </p>
            </div>
          </div>

          {/* Compact netprofit/roi box */}
          <div className="flex gap-4 items-center">
            <div className="rounded-xl p-4 border border-slate-800 bg-gradient-to-b from-slate-900/40 to-slate-900/25 text-right min-w-[150px] shadow-sm transform transition hover:-translate-y-1">
              <div className="text-xs text-slate-400">Net Profit</div>
              <div
                className={`text-lg font-bold ${
                  stats.totalProfit > 0 ? "text-emerald-400" : stats.totalProfit < 0 ? "text-rose-400" : "text-slate-200"
                }`}
              >
                {stats.totalProfit >= 0 ? "+" : ""}₹{stats.totalProfit.toFixed(2)}
              </div>
              <div className="text-[12px] text-slate-500 mt-1">Total cashflow across games</div>
            </div>

            <div className="rounded-xl p-4 border border-slate-800 bg-slate-900/30 text-right min-w-[120px] shadow-sm transform transition hover:-translate-y-1">
              <div className="text-xs text-slate-400">ROI</div>
              <div className="text-lg font-bold text-slate-100">{stats.roi}%</div>
              <div className="text-[12px] text-slate-500 mt-1">Return on buy-ins</div>
            </div>
          </div>
        </div>

        {/* Stat tile row (no sparklines) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total games"
            value={stats.totalGames}
            sub="All tracked games"
            icon={<Zap size={18} />}
            accent="bg-slate-800/40"
          />
          <StatCard
            label="Total wins"
            value={extraStats.wins}
            sub="Profit > 0"
            icon={<Trophy size={18} />}
            accent="bg-emerald-900/10"
          />
          <StatCard
            label="Total losses"
            value={extraStats.losses}
            sub="Loss < 0"
            icon={<TrendingDown size={18} />}
            accent="bg-rose-900/8"
          />
          <StatCard
            label="2× games"
            value={extraStats.twoX}
            sub="Cash-out ≥ 2× buy-in"
            icon={<TrendingUp size={18} />}
            accent="bg-amber-900/8"
          />
          <StatCard
            label="1.5× games"
            value={extraStats.onePointFiveX}
            sub="Cash-out ≥ 1.5× & < 2×"
            icon={<Star size={18} />}
            accent="bg-blue-900/8"
          />
        </div>

        {/* Best game & main trend row — bigger + polished */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/40 to-slate-900/25 p-6 shadow-sm transform transition hover:-translate-y-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-100">Profit trend</h3>
                <p className="text-sm text-slate-400 mt-1">Cumulative profit per game — see momentum</p>
              </div>
              <div className="text-sm text-slate-400">{stats.totalGames} games</div>
            </div>

            <div className="h-64 mt-5">
              {profitTrendData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profitTrendData}>
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #1f2937",
                        fontSize: 12,
                        color: "#e5e7eb",
                      }}
                      labelStyle={{ color: "#e5e7eb" }}
                      itemStyle={{ color: "#e5e7eb" }}
                    />
                    <Line type="monotone" dataKey="cumulative" stroke="#22c55e" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartPlaceholder />
              )}
            </div>
          </div>

          {/* Best game card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between shadow-sm transform transition hover:-translate-y-1">
            <div>
              <h3 className="text-2xl font-semibold text-slate-100">Best game</h3>
              {extraStats.bestGame ? (
                <>
                  <div className="mt-4">
                    <div className={`text-4xl font-extrabold ${extraStats.bestGame.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {extraStats.bestGame.profit >= 0 ? `+₹${extraStats.bestGame.profit.toFixed(2)}` : `₹${extraStats.bestGame.profit.toFixed(2)}`}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">{extraStats.bestGame.date}</div>

                    <div className="mt-4 text-sm text-slate-300 space-y-1">
                      <div>
                        <span className="text-slate-400">Buy-in:</span>{" "}
                        <span className="font-medium text-slate-100">₹{extraStats.bestGame.buyin.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Cash-out:</span>{" "}
                        <span className="font-medium text-slate-100">₹{extraStats.bestGame.cashout.toFixed(2)}</span>
                      </div>
                      <div className="mt-2">
                        <span className="inline-block text-xs px-2 py-1 rounded-full bg-slate-800/50 text-slate-200 border border-slate-700">
                          Top performance
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-3 text-sm text-slate-400">No games yet</div>
              )}
            </div>

            <div className="mt-6 text-sm text-slate-500">Tip: prioritize sessions that yield high multipliers — they improve ROI fastest.</div>
          </div>
        </div>

        {/* Charts row: pie + distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 lg:col-span-1 shadow-sm transform transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-slate-200">Buy-in vs Cash-out</h2>
            </div>
            <div className="h-44 flex items-center justify-center">
              {pieData[0].value + pieData[1].value > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={36} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
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
            <div className="mt-3 flex justify-center gap-4 text-[12px] text-slate-400">
              <LegendDot color={PIE_COLORS[0]} label="Total Buy-in (₹)" />
              <LegendDot color={PIE_COLORS[1]} label="Total Cash-out (₹)" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 lg:col-span-2 shadow-sm transform transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-slate-200">Profit distribution</h2>
              <span className="text-[13px] text-slate-500">Categories of game results</span>
            </div>

            <div className="h-44">
              {stats.totalGames ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitDistribution}>
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
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
                        <Cell key={index} fill={DIST_COLORS[index % DIST_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartPlaceholder />
              )}
            </div>
          </div>
        </div>

        {/* Raw table at bottom */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-sm transform transition hover:-translate-y-0.5">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200">Game history</h2>
            <span className="text-[13px] text-slate-500">{stats.totalGames} games</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Buy-in (₹)</th>
                  <th className="px-4 py-3 text-right">Cash-out (₹)</th>
                  <th className="px-4 py-3 text-right">Profit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {sessions
                  .slice()
                  .sort((a, b) => (a.game_date < b.game_date ? 1 : -1))
                  .map((g) => {
                    const profit = Number(g.cashout) - Number(g.buyin);
                    return (
                      <tr key={g.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                        <td className="px-4 py-3">{g.game_date}</td>
                        <td className="px-4 py-3 text-right">₹{Number(g.buyin).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">₹{Number(g.cashout).toFixed(2)}</td>
                        <td className={`px-4 py-3 text-right ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {profit >= 0 ? "+" : ""}₹{profit.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}

                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No games tracked yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ImageModal url={imageModalUrl} onClose={() => setImageModalUrl(null)} />
    </div>
  );
}

/* -------------------------
   Styling tokens & tiny UI components
   ------------------------- */

const COLORS = {
  primaryAccent: "#10b981",
  success: "#34d399",
  danger: "#f87171",
  gray: {
    light: "#e5e7eb",
    medium: "#9ca3af",
    dark: "#4b5563",
  },
};

// StatCard supports label, value, subtitle, icon, accent color (optional)
function StatCard({ label, value, sub, icon }) {
    return (
      <div
        className="
          p-5 rounded-xl border
          bg-slate-900/60
          border-slate-700/60
          shadow-[0_4px_12px_rgba(0,0,0,0.25)]
          hover:shadow-[0_6px_18px_rgba(0,0,0,0.35)]
          transition-all duration-300
          hover:-translate-y-1
          flex flex-col justify-between
        "
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[13px] text-slate-400 font-medium">{label}</div>
            <div className="text-3xl font-bold mt-1 text-slate-100">{value}</div>
          </div>
  
          <div
            className="
              p-2 rounded-lg
              bg-slate-800/70 border border-slate-700
              text-slate-300
            "
          >
            {icon}
          </div>
        </div>
  
        {sub && (
          <div className="text-[12px] text-slate-500 mt-3 leading-snug">
            {sub}
          </div>
        )}
      </div>
    );
  }
  

// LegendDot accepts a hex color string
function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span style={{ color: COLORS.gray.light }}>{label}</span>
    </span>
  );
}

// Empty chart placeholder
function EmptyChartPlaceholder() {
  return (
    <div
      className="w-full h-full flex items-center justify-center text-[13px]"
      style={{ color: COLORS.gray.medium }}
    >
      Not enough data yet. Play a few games!
    </div>
  );
}
