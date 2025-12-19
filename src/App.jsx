// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LoginPage from "./pages/LoginPage";

import AddPlayerForm from "./components/AddPlayerForm";
import AddGameResultForAll from "./components/AddGameResultForAll";
import ImageModal from "./components/ImageModal";
import PlayerFullPage from "./pages/PlayerFullPage";
import PlayerList from "./components/PlayerList";

/* ---------- small helpers ---------- */
function sparklinePath(values = [], width = 90, height = 20) {
  if (!values || values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function isUnlocked() {
  const persistent = localStorage.getItem("poker_unlocked_persistent") === "1";
  const sessionOk = sessionStorage.getItem("poker_unlocked") === "1";
  return persistent || sessionOk;
}

/* ---------- Dashboard (Home) ---------- */
function DashboardPage({
  players,
  leaderboardRows,
  loadingBoard,
  timeRange,
  setTimeRange,
  setImageModalUrl,
  summary,
  searchState,
}) {
  const { query, setQuery, sortBy, setSortBy, filterStreak, setFilterStreak, mounted } = searchState;
  const [hoverTip, setHoverTip] = useState({ playerId: null, idx: null });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 bg-gradient-to-b from-slate-800/40 to-slate-900/20 border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-100 tracking-tight">Leaderboard</h1>
            <p className="mt-1 text-sm text-slate-400 max-w-xl">
              Ranked by net profit for the chosen timeframe — quickly see who's winning, who's losing, and click a player for session-level details, ROI, and performance charts.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-3 border border-emerald-500/20 min-w-[140px]">
              <div className="flex items-center justify-between">
                <div className="text-xs text-emerald-400/80">Players</div>
                <div className="text-emerald-400/60 text-xl">👥</div>
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{summary.totalPlayers}</div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-3 border border-blue-500/20 min-w-[140px]">
              <div className="flex items-center justify-between">
                <div className="text-xs text-blue-400/80">Games</div>
                <div className="text-blue-400/60 text-xl">🃏</div>
              </div>
              <div className="text-2xl font-bold text-blue-400 mt-1">{summary.totalGames}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              placeholder="Search players..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-full bg-slate-900 border border-slate-800 px-4 py-2 text-sm text-slate-100 w-64 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <div className="absolute right-3 top-2.5 text-slate-500 text-sm">⌘K</div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div>Sort</div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-sm text-slate-100">
              <option value="netProfit">Net profit</option>
              <option value="games">Games played</option>
              <option value="name">Name</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div>Filter</div>
            <select value={filterStreak} onChange={(e) => setFilterStreak(e.target.value)} className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-sm text-slate-100">
              <option value="all">All</option>
              <option value="winners">Winners</option>
              <option value="losers">Losers</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="3M">Last 3 months</option>
            <option value="6M">Last 6 months</option>
            <option value="1Y">Last 1 year</option>
            <option value="ALL">All time</option>
          </select>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/60 to-slate-950/40 shadow-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">Players overview</span>
          {loadingBoard && <span className="text-[11px] text-slate-500">Calculating…</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-transparent text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium tracking-wide">#</th>
                <th className="px-4 py-3 text-left font-medium tracking-wide">Player</th>
                <th className="px-4 py-3 text-right font-medium tracking-wide">Games</th>
                <th className="px-4 py-3 text-center font-medium tracking-wide">Form</th>
                <th className="px-4 py-3 text-right font-medium tracking-wide">Net</th>
              </tr>
            </thead>

            <tbody>
              {leaderboardRows.map((row, idx) => {
                const profit = row.netProfit;
                return (
                  <tr
                    key={row.player.id}
                    className={`
                      border-t border-slate-800/50
                      hover:bg-gradient-to-r hover:from-slate-800/40 hover:to-transparent
                      transition-all duration-200
                      ${idx % 2 === 0 ? "bg-slate-900/20" : "bg-transparent"}
                    `}
                    style={{ transitionDelay: `${idx * 25}ms` }}
                  >
                    <td className="px-4 py-3">
                      {idx < 3 ? (
                        <div
                          className={`
                            w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                            ${idx === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-950" : ""}
                            ${idx === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900" : ""}
                            ${idx === 2 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-orange-950" : ""}
                          `}
                        >
                          {idx + 1}
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
                          {idx + 1}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {row.player.photo_url ? (
                          <img
                            src={row.player.photo_url}
                            alt={row.player.name}
                            onClick={() => setImageModalUrl(row.player.photo_url)}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700 cursor-zoom-in transform transition hover:scale-110"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-300 border border-slate-700">
                            {row.player.name?.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <span
                          className="text-slate-100 underline hover:text-emerald-400 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/player/${row.player.id}`, "_blank");
                          }}
                        >
                          {row.player.name}
                        </span>

                        <span className="ml-2 text-[11px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-900/40 border border-slate-800">
                          ROI {row.roi ? `${row.roi.toFixed(1)}%` : "0.0%"}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right text-slate-200">{row.totalGames}</td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {(row.streak || []).length === 0 && <span className="text-[11px] text-slate-500">–</span>}
                        {(row.streak || []).map((s, i) => {
                          const game = row.lastFive?.[i];
                          const val = game?.value ?? null;
                          const date = game?.date ?? null;
                          
                          const positive = typeof val === "number" && val > 0;
                          const negative = typeof val === "number" && val < 0;
                          return (
                            <div
                              key={i}
                              className="relative"
                              onMouseEnter={() => setHoverTip({ playerId: row.player.id, idx: i })}
                              onMouseLeave={() => setHoverTip({ playerId: null, idx: null })}
                            >
                              <div
                                className={`
                                  w-7 h-7 rounded-full flex items-center justify-center 
                                  text-xs font-bold shadow-lg
                                  transition-transform hover:scale-110
                                  ${s === "W"
                                    ? "bg-gradient-to-br from-emerald-400 to-green-500 text-white border-2 border-emerald-300/50"
                                    : "bg-gradient-to-br from-rose-400 to-red-500 text-white border-2 border-rose-300/50"
                                  }
                                `}
                              >
                                {s}
                              </div>

                              {hoverTip.playerId === row.player.id && hoverTip.idx === i && typeof val === "number" && (
                                <div className="absolute left-1/2 -top-10 transform -translate-x-1/2">
                                  <div className="whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium shadow-md"
                                       style={{
                                         background: positive ? "rgba(16,185,129,0.12)" : negative ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.08)",
                                         color: positive ? "#4ade80" : negative ? "#fb7185" : "#94a3b8",
                                         border: "1px solid rgba(255,255,255,0.03)",
                                         backdropFilter: "blur(6px)"
                                       }}>
                                    {positive ? "+" : ""}
                                    {Number(val).toFixed(2)}
                                  </div>
                                  <div className="w-2 h-2 bg-transparent mx-auto mt-0.5" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span
                        className={`
                          font-semibold px-3 py-1 rounded-full
                          ${profit > 0
                            ? "text-emerald-400 bg-emerald-400/10"
                            : profit < 0
                            ? "text-rose-400 bg-rose-400/10"
                            : "text-slate-300"
                          }
                        `}
                      >
                        {profit >= 0 ? "+" : ""}
                        {profit.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {leaderboardRows.length === 0 && !loadingBoard && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No players match this filter/search.
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

/* ---------- Add Game Page ---------- */
function AddGamePage({ players, onAdded, setImageModalUrl }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-100">Add Game</h2>
        <p className="text-sm text-slate-400">Enter buy-ins and final cashout for each player who played.</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        {/* onAdded now should be the game-added handler from App (not the players-updated one) */}
        <AddGameResultForAll players={players} onAdded={onAdded} setImageModalUrl={setImageModalUrl} />
      </div>
    </div>
  );
}

/* ---------- Manage Players Page (two clear blocks on the right) ---------- */
function ManagePlayersPage({ players, onAdded, onEditStart, onDelete, setImageModalUrl }) {
  const [selected, setSelected] = useState(players?.[0] || null);
  const [query, setQuery] = useState("");
  const [confirmRemove, setConfirmRemove] = useState({ open: false, id: null, name: null });

  useEffect(() => {
    if (!players || players.length === 0) {
      setSelected(null);
      return;
    }
    setSelected((prev) => {
      if (!prev) return players[0];
      const found = players.find((p) => p.id === prev.id);
      return found || players[0];
    });
  }, [players]);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    let arr = (players || []).slice();
    if (q) arr = arr.filter((p) => p.name?.toLowerCase().includes(q));
    return arr;
  }, [players, query]);

  const askRemove = (p) => {
    if (!p) return;
    setConfirmRemove({ open: true, id: p.id, name: p.name });
  };

  const confirmRemoveNow = async () => {
    if (!confirmRemove.id) return;
    await onDelete(confirmRemove.id);
    setConfirmRemove({ open: false, id: null, name: null });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">Manage Players</h2>
          <p className="text-sm text-slate-400">Quickly add, edit, or remove players.</p>
        </div>

        <div className="flex items-center gap-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search players..." className="rounded-full bg-slate-900 border border-slate-800 px-4 py-2 text-sm text-slate-200 w-64 focus:outline-none" />
          {/* intentionally removed green Add player header button */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: players list */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 h-full">
            <div className="text-sm font-medium text-slate-300 mb-3">Players</div>
            <div className="rounded-xl border border-slate-800 p-2 bg-slate-950/80 h-[72vh] overflow-auto">
              <PlayerList players={filtered} selectedPlayer={selected} onSelect={(p) => setSelected(p)} />
            </div>
          </div>
        </div>

        {/* Right: selected player card + add player card (separate) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selected player card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 flex items-start justify-between">
            {!selected ? (
              <div className="text-center py-12 text-slate-500 w-full">No player selected. Choose one from the list to edit or remove.</div>
            ) : (
              <div className="flex items-center gap-4">
                {selected.photo_url ? (
                  <img src={selected.photo_url} alt={selected.name} onClick={() => setImageModalUrl(selected.photo_url)} className="w-16 h-16 rounded-full object-cover border border-slate-700 cursor-zoom-in hover:scale-105 transition" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl text-slate-300 border border-slate-700">{selected.name?.charAt(0).toUpperCase()}</div>
                )}

                <div>
                  <div className="text-xl font-semibold text-slate-100">{selected.name}</div>
                  <div className="text-xs text-slate-400">Selected player — edit or remove this profile.</div>
                </div>
              </div>
            )}

            {/* Edit & Remove buttons inside same card */}
            <div className="ml-6 flex flex-col gap-3">
              <button onClick={() => selected && onEditStart(selected)} disabled={!selected} className="px-4 py-2 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-900/40 disabled:opacity-50">
                Edit
              </button>
              <button onClick={() => selected && askRemove(selected)} disabled={!selected} className="px-4 py-2 rounded-md bg-rose-600/10 text-rose-400 border border-rose-600/30 hover:bg-rose-600/20 disabled:opacity-50">
                Remove
              </button>
            </div>
          </div>

          {/* Add player card (separate block) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-medium text-slate-300">Add Player</div>
                <div className="text-xs text-slate-400">Create a player profile (optional photo)</div>
              </div>
              <div className="text-xs text-slate-400">Ready</div>
            </div>

            {/* the AddPlayerForm itself has its own compact header; that's expected */}
            <AddPlayerForm onAdded={onAdded} showHeader={false} />
          </div>
        </div>
      </div>

      {/* Confirm remove modal */}
      {confirmRemove.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmRemove({ open: false, id: null, name: null })} />
          <div
            className="relative z-10 max-w-md w-full rounded-2xl border border-slate-800 bg-slate-950/90 p-5 transform transition duration-150 ease-out scale-100"
            style={{ animation: "none" }}
          >
            <h3 className="text-lg font-semibold text-slate-100">Remove player?</h3>
            <p className="text-sm text-slate-400 mt-2">This will remove <strong className="text-slate-100">{confirmRemove.name}</strong> and all their sessions. This action cannot be undone.</p>

            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setConfirmRemove({ open: false, id: null, name: null })} className="px-3 py-2 rounded-md border border-slate-700 text-slate-200">Cancel</button>
              <button onClick={confirmRemoveNow} className="px-4 py-2 rounded-md bg-rose-600 text-white">Confirm remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RequireAuth({ children }) {
  if (isUnlocked()) return children;
  return <Navigate to="/login" replace />;
}

/* ---------- App Root (manages data + routes) ---------- */
export default function App() {
  const location = useLocation();
  const path = location.pathname;

  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);

  // search / filters (shared state)
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("netProfit");
  const [filterStreak, setFilterStreak] = useState("all");
  const [timeRange, setTimeRange] = useState("1Y");

  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [loadingBoard, setLoadingBoard] = useState(false);

  // number of unique games (distinct game_id)
  const [uniqueGamesCount, setUniqueGamesCount] = useState(0);

  // edit player
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingPhotoFile, setEditingPhotoFile] = useState(null);
  const [editingLoading, setEditingLoading] = useState(false);

  // image modal
  const [imageModalUrl, setImageModalUrl] = useState(null);

  // toast/snackbar
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });

  // edit-confirm modal state (ask before saving edits)
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);

  // mount flag
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const searchState = { query, setQuery, sortBy, setSortBy, filterStreak, setFilterStreak, mounted };

  // summary
  const summary = useMemo(() => {
    const totalPlayers = players.length;
    // totalGames now counts unique game_id across fetched sessions
    const totalGames = uniqueGamesCount;
    const totalProfit = leaderboardRows.reduce((acc, r) => acc + r.netProfit, 0);
    const avgROI = (leaderboardRows.reduce((acc, r) => acc + (r.roi || 0), 0) / Math.max(leaderboardRows.length, 1)).toFixed(1);
    return { totalPlayers, totalGames, totalProfit, avgROI };
  }, [players, leaderboardRows, uniqueGamesCount]);

  // toast helper
  const showToast = (message, type = "success", duration = 3000) => {
    setToast({ open: true, message, type });
    setTimeout(() => {
      setToast((t) => ({ ...t, open: false }));
    }, duration);
  };

  // load players
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoadingPlayers(true);
      const { data, error } = await supabase.from("players").select("*").order("created_at", { ascending: true });
      if (!alive) return;
      if (error) console.error("Error fetching players:", error);
      else setPlayers(data || []);
      setLoadingPlayers(false);
    };
    load();
    return () => (alive = false);
  }, [refreshFlag]);

  // ======= two separate refresh handlers =========
  // called when players list changes (add/edit/remove)
  const handlePlayersChanged = () => {
    setRefreshFlag((f) => f + 1);
    showToast("Players updated", "success");
  };

  // called when a new game is added — refresh leaderboard & show game-specific toast
  const handleGameAdded = () => {
    setRefreshFlag((f) => f + 1);
    showToast("Game saved", "success");
  };
  // ===============================================

  // build leaderboard rows
  useEffect(() => {
    let alive = true;
    const build = async () => {
      if (!players.length) {
        setLeaderboardRows([]);
        setUniqueGamesCount(0);
        return;
      }
      setLoadingBoard(true);
      const cutoff = timeRange === "ALL" ? null : (() => {
        const now = new Date();
        const d = new Date(now);
        if (timeRange === "3M") d.setMonth(d.getMonth() - 3);
        if (timeRange === "6M") d.setMonth(d.getMonth() - 6);
        if (timeRange === "1Y") d.setFullYear(d.getFullYear() - 1);
        return d.toISOString().slice(0, 10);
      })();
      // NOTE: select all sessions in timeframe (we'll group by player and compute unique games via game_id)
      let q = supabase.from("sessions").select("*");
      if (cutoff) q = q.gte("game_date", cutoff);
      const { data: sessions, error } = await q;
      if (!alive) return;
      if (error) {
        console.error("sessions err", error);
        setLeaderboardRows([]);
        setUniqueGamesCount(0);
        setLoadingBoard(false);
        return;
      }

      // compute unique game ids (use game_id; fallback to game_date if game_id missing)
      const uniqueGameIds = new Set();
      (sessions || []).forEach((s) => {
        if (s.game_id) uniqueGameIds.add(String(s.game_id));
        else uniqueGameIds.add(String(s.game_date)); // backwards compatible
      });
      setUniqueGamesCount(uniqueGameIds.size);

      const per = new Map();
      (sessions || []).forEach((s) => {
        const pid = s.player_id;
        if (!per.has(pid)) per.set(pid, []);
        per.get(pid).push(s);
      });

      const rows = players.map((p) => {
        const sess = (per.get(p.id) || []).slice().sort((a, b) => (a.game_date < b.game_date ? 1 : -1));
        const totalGames = sess.length;
        const netProfit = sess.reduce((a, g) => a + (Number(g.cashout) - Number(g.buyin)), 0);
        const lastFive = sess.slice(0, 5).map((g) => ({
          value: Number(g.cashout) - Number(g.buyin),
          date: g.game_date,
        }));
        const lastFiveDisplay = lastFive.map((g) =>
          g.value >= 0 ? "W" : "L"
        );
        const totalBuyin = sess.reduce((a, g) => a + Number(g.buyin), 0);
        const roi = totalBuyin > 0 ? (netProfit / totalBuyin) * 100 : 0;
        return { player: p, totalGames, netProfit, lastFive, streak: lastFiveDisplay, roi };
      });

      // apply client search/filter/sort
      let filtered = rows.filter((r) => {
        if (!query.trim()) return true;
        return r.player.name.toLowerCase().includes(query.trim().toLowerCase());
      });
      if (filterStreak === "winners") filtered = filtered.filter((r) => r.netProfit > 0);
      if (filterStreak === "losers") filtered = filtered.filter((r) => r.netProfit < 0);
      if (filterStreak === "neutral") filtered = filtered.filter((r) => r.netProfit === 0);

      if (sortBy === "netProfit") filtered.sort((a, b) => b.netProfit - a.netProfit);
      if (sortBy === "games") filtered.sort((a, b) => b.totalGames - a.totalGames);
      if (sortBy === "name") filtered.sort((a, b) => a.player.name.localeCompare(b.player.name));

      setLeaderboardRows(filtered);
      setLoadingBoard(false);
    };

    build();
    return () => (alive = false);
  }, [players, timeRange, refreshFlag, query, sortBy, filterStreak]);

  // delete player (called by ManagePlayersPage)
  const handleDeletePlayer = async (playerId) => {
    const { error } = await supabase.from("players").delete().eq("id", playerId);
    if (error) {
      console.error("delete player err", error);
      showToast("Failed to remove player", "error");
    } else {
      handlePlayersChanged();
      showToast("Player removed", "success");
    }
  };

  // edit player flows
  const startEditPlayer = (p) => {
    setEditingPlayer(p);
    setEditingName(p.name || "");
    setEditingPhotoFile(null);
    setEditConfirmOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEditPlayer = () => {
    setEditingPlayer(null);
    setEditingName("");
    setEditingPhotoFile(null);
    setEditConfirmOpen(false);
  };

  // actual save implementation (called after user confirms)
  const saveEditPlayerActual = async () => {
    if (!editingPlayer) return;
    if (!editingName.trim()) {
      showToast("Name cannot be empty.", "error");
      return;
    }
    setEditingLoading(true);
    try {
      let newPhotoUrl = editingPlayer.photo_url;
      if (editingPhotoFile) {
        const ext = editingPhotoFile.name.split(".").pop();
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `players/${name}`;
        const { error: upErr } = await supabase.storage.from("player-photos").upload(path, editingPhotoFile);
        if (upErr) {
          console.error("upload err", upErr);
          showToast("Error uploading photo", "error");
        } else {
          const { data } = supabase.storage.from("player-photos").getPublicUrl(path);
          newPhotoUrl = data.publicUrl;
        }
      }
      const { error } = await supabase.from("players").update({ name: editingName.trim(), photo_url: newPhotoUrl }).eq("id", editingPlayer.id);
      if (error) {
        console.error("update err", error);
        showToast("Error updating player", "error");
      } else {
        cancelEditPlayer();
        handlePlayersChanged();
        showToast("Player updated", "success");
      }
    } finally {
      setEditingLoading(false);
      setEditConfirmOpen(false);
    }
  };

  // helper for top nav active class
  const navClass = (route) =>
    `px-3 py-1.5 rounded-full ${path === route ? "bg-emerald-400/90 text-slate-900 font-medium shadow-sm" : "bg-transparent border border-slate-700 text-slate-200 hover:bg-slate-900/40"}`;

  // appUnlocked state so UI shows header as soon as login succeeds
  const [appUnlocked, setAppUnlocked] = useState(isUnlocked());
  useEffect(() => {
    const onStorage = () => setAppUnlocked(isUnlocked());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 relative">
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.02] pointer-events-none" />

      {/* HEADER — only render when unlocked */}
      {appUnlocked && (
        <header className="border-b border-slate-700/50 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl z-10 relative">
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Poker Stats Dashboard</h1>
              <p className="text-sm text-slate-400">Track your home game results and see who's crushing.</p>
            </div>

            <nav className="flex items-center gap-3">
              <Link to="/" className={navClass("/")}>
                <span className="relative">
                  Home
                  {path === "/" && <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400" />}
                </span>
              </Link>
              <Link to="/add-game" className={navClass("/add-game")}>
                <span className="relative">
                  Add Game
                  {path === "/add-game" && <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400" />}
                </span>
              </Link>
              <Link to="/manage-players" className={navClass("/manage-players")}>
                <span className="relative">
                  Manage Players
                  {path === "/manage-players" && <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400" />}
                </span>
              </Link>
            </nav>
          </div>
        </header>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-0">
        <Routes>
          {/* public: login */}
          <Route
            path="/login"
            element={<LoginPage onUnlock={() => setAppUnlocked(true)} />}
          />

          {/* protected routes — wrap each element with RequireAuth */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardPage
                  players={players}
                  leaderboardRows={leaderboardRows}
                  loadingBoard={loadingBoard}
                  timeRange={timeRange}
                  setTimeRange={setTimeRange}
                  setImageModalUrl={setImageModalUrl}
                  summary={summary}
                  searchState={{ query, setQuery, sortBy, setSortBy, filterStreak, setFilterStreak, mounted }}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/add-game"
            element={
              <RequireAuth>
                {/* pass the game-added handler here so adding a game triggers the right toast */}
                <AddGamePage players={players} onAdded={handleGameAdded} setImageModalUrl={setImageModalUrl} />
              </RequireAuth>
            }
          />
          <Route
            path="/manage-players"
            element={
              <RequireAuth>
                <ManagePlayersPage players={players} onAdded={handlePlayersChanged} onEditStart={startEditPlayer} onDelete={handleDeletePlayer} setImageModalUrl={setImageModalUrl} />
              </RequireAuth>
            }
          />
          <Route
            path="/player/:id"
            element={
              <RequireAuth>
                <PlayerFullPage />
              </RequireAuth>
            }
          />
        </Routes>

        {/* Edit modal area */}
        {editingPlayer && (
          <div className="fixed bottom-6 right-6 z-50 w-[360px] rounded-xl bg-slate-900/80 border border-slate-800 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {editingPlayer.photo_url ? (
                  <img src={editingPlayer.photo_url} alt={editingPlayer.name} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm text-slate-300 border border-slate-700">{editingPlayer.name?.charAt(0).toUpperCase()}</div>
                )}
                <div>
                  <div className="text-sm font-medium text-slate-100">Edit player</div>
                  <div className="text-xs text-slate-400">{editingPlayer.email || ""}</div>
                </div>
              </div>

              <button onClick={() => cancelEditPlayer()} className="text-xs text-slate-400">Close</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setEditConfirmOpen(true); }} className="mt-3 space-y-2 text-sm">
              <div>
                <label className="text-xs text-slate-400">Name</label>
                <input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
              </div>
              <div>
                <label className="text-xs text-slate-400">New profile photo (optional)</label>
                <input type="file" accept="image/*" className="w-full text-sm text-slate-400 file:text-sm" onChange={(e) => setEditingPhotoFile(e.target.files?.[0] || null)} />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => cancelEditPlayer()} className="px-3 py-1.5 rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-900/40">Cancel</button>
                <button type="submit" disabled={editingLoading} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/30 transform transition-all hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/40 active:scale-95 disabled:opacity-60">Save</button>
              </div>
            </form>
          </div>
        )}

        {/* Edit confirmation modal (asks before actually saving edits) */}
        {editConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/50" onClick={() => setEditConfirmOpen(false)} />
            <div className="relative z-10 max-w-md w-full rounded-2xl border border-slate-800 bg-slate-950/90 p-5 transform transition duration-150 ease-out scale-100">
              <h3 className="text-lg font-semibold text-slate-100">Confirm save</h3>
              <p className="text-sm text-slate-400 mt-2">You're about to update this player to:</p>
              <div className="mt-3 px-3 py-2 rounded-md bg-slate-900 border border-slate-800">
                <div className="text-sm font-medium text-slate-100">{editingName}</div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setEditConfirmOpen(false)} className="px-3 py-2 rounded-md border border-slate-700 text-slate-200">Cancel</button>
                <button onClick={() => saveEditPlayerActual()} className="px-4 py-2 rounded-md bg-emerald-500 text-slate-900 font-medium">Confirm and Save</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global image modal */}
      {imageModalUrl && <ImageModal url={imageModalUrl} onClose={() => setImageModalUrl(null)} />}

      {/* Toast / Snackbar */}
      <div className="fixed right-6 bottom-6 z-60 flex flex-col gap-3 items-end">
        {toast.open && (
          <div
            className={`min-w-[220px] max-w-sm rounded-lg px-4 py-3 shadow-lg transform transition-all duration-200 ${
              toast.type === "success" ? "bg-emerald-600/95 text-white" : toast.type === "error" ? "bg-rose-600/95 text-white" : "bg-slate-800 text-slate-100"
            }`}
            role="status"
          >
            <div className="text-sm font-medium">{toast.message}</div>
          </div>
        )}
      </div>
    </div>
  );
}
