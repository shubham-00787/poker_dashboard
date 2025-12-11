// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";

import AddPlayerForm from "./components/AddPlayerForm";
import AddGameResultForAll from "./components/AddGameResultForAll";
import ImageModal from "./components/ImageModal";
import PlayerFullPage from "./pages/PlayerFullPage";

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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 bg-gradient-to-b from-slate-800/40 to-slate-900/20 border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-100 tracking-tight">Leaderboard</h1>
            <p className="mt-1 text-sm text-slate-400 max-w-xl">
              Sorted by net gains for the selected time range. Click a name to open the player dashboard with deep analytics.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800 min-w-[140px]">
              <div className="text-xs text-slate-400">Players</div>
              <div className="text-lg font-semibold text-slate-100">{summary.totalPlayers}</div>
            </div>
            <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800 min-w-[140px]">
              <div className="text-xs text-slate-400">Games</div>
              <div className="text-lg font-semibold text-slate-100">{summary.totalGames}</div>
            </div>
            {/* Removed Total profit and Avg ROI cards as requested */}
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
                <th className="px-4 py-3 text-left font-medium tracking-wide">Spark</th>
              </tr>
            </thead>

            <tbody>
              {leaderboardRows.map((row, idx) => {
                const profit = row.netProfit;
                const sparkPath = sparklinePath(row.lastFive || [], 90, 20);
                return (
                  <tr
                    key={row.player.id}
                    className={`border-t border-slate-800 hover:translate-y-[-2px] hover:shadow-md transition-transform duration-200 opacity-100`}
                    style={{ transitionDelay: `${idx * 25}ms` }}
                  >
                    <td className="px-4 py-3 text-slate-400">{idx + 1}</td>

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
                      <div className="flex items-center justify-center gap-1">
                        {(row.streak || []).length === 0 && <span className="text-[11px] text-slate-500">–</span>}
                        {(row.streak || []).map((s, i) => (
                          <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold border ${s === "W" ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-rose-500/10 border-rose-500 text-rose-400"}`}>
                            {s}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${profit > 0 ? "text-emerald-400" : profit < 0 ? "text-rose-400" : "text-slate-300"}`}>
                        {profit >= 0 ? "+" : ""}
                        {profit.toFixed(2)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <svg width="90" height="20" viewBox="0 0 90 20" className="rounded" preserveAspectRatio="none">
                          <path d={sparkPath} fill="none" stroke={row.lastFive && row.lastFive.reduce((a, b) => a + b, 0) >= 0 ? "#10b981" : "#ef4444"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="text-xs text-slate-400">{(row.lastFive || []).length} games</div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {leaderboardRows.length === 0 && !loadingBoard && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
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
        <h2 className="text-2xl font-semibold text-slate-100">Add Game Result</h2>
        <p className="text-sm text-slate-400">Enter buy-ins and final cashout for each player who played.</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <AddGameResultForAll players={players} onAdded={onAdded} />
      </div>
    </div>
  );
}

/* ---------- Manage Players Page ---------- */
function ManagePlayersPage({ players, onAdded, onEditStart, onDelete, setImageModalUrl }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-100">Manage Players</h2>
        <p className="text-sm text-slate-400">Add, edit, or remove player profiles.</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">Current players</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-transparent text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-t border-slate-800 hover:bg-slate-900/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.name} onClick={() => setImageModalUrl(p.photo_url)} className="w-8 h-8 rounded-full object-cover border border-slate-700 cursor-zoom-in transform transition hover:scale-110" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-300 border border-slate-700">
                          {p.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-slate-100">{p.name}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onEditStart(p)} className="text-[12px] px-3 py-1 rounded-lg bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700">Edit</button>
                      <button onClick={() => onDelete(p.id)} className="text-[12px] px-3 py-1 rounded-lg bg-rose-600/10 text-rose-400 border border-rose-600/30 hover:bg-rose-600/20">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}

              {players.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-slate-500">No players yet. Add one above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <AddPlayerForm onAdded={onAdded} />
      </div>
    </div>
  );
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

  // edit player
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingPhotoFile, setEditingPhotoFile] = useState(null);
  const [editingLoading, setEditingLoading] = useState(false);

  // image modal
  const [imageModalUrl, setImageModalUrl] = useState(null);

  // mount flag
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const searchState = { query, setQuery, sortBy, setSortBy, filterStreak, setFilterStreak, mounted };

  // summary derived later
  const summary = useMemo(() => {
    const totalPlayers = players.length;
    const totalGames = leaderboardRows.reduce((acc, r) => acc + r.totalGames, 0);
    const totalProfit = leaderboardRows.reduce((acc, r) => acc + r.netProfit, 0);
    const avgROI = (leaderboardRows.reduce((acc, r) => acc + (r.roi || 0), 0) / Math.max(leaderboardRows.length, 1)).toFixed(1);
    return { totalPlayers, totalGames, totalProfit, avgROI };
  }, [players, leaderboardRows]);

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

  const handlePlayersChanged = () => setRefreshFlag((f) => f + 1);

  // build leaderboard (shared)
  useEffect(() => {
    let alive = true;
    const build = async () => {
      if (!players.length) {
        setLeaderboardRows([]);
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
      let q = supabase.from("sessions").select("*");
      if (cutoff) q = q.gte("game_date", cutoff);
      const { data: sessions, error } = await q;
      if (!alive) return;
      if (error) {
        console.error("sessions err", error);
        setLeaderboardRows([]);
        setLoadingBoard(false);
        return;
      }

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
        const lastFive = sess.slice(-5).map((g) => Number(g.cashout) - Number(g.buyin));
        const lastFiveDisplay = lastFive.slice(-5).map((v) => (v >= 0 ? "W" : "L"));
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

  // delete player
  const handleDeletePlayer = async (playerId) => {
    if (!confirm("Remove this player and all their stats?")) return;
    const { error } = await supabase.from("players").delete().eq("id", playerId);
    if (error) console.error("delete player err", error);
    else handlePlayersChanged();
  };

  // edit player flows
  const startEditPlayer = (p) => {
    setEditingPlayer(p);
    setEditingName(p.name || "");
    setEditingPhotoFile(null);
    // scroll to top for edit if needed
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEditPlayer = () => {
    setEditingPlayer(null);
    setEditingName("");
    setEditingPhotoFile(null);
  };
  const saveEditPlayer = async (e) => {
    e.preventDefault();
    if (!editingPlayer) return;
    if (!editingName.trim()) {
      alert("Name cannot be empty.");
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
          alert("Error uploading photo");
        } else {
          const { data } = supabase.storage.from("player-photos").getPublicUrl(path);
          newPhotoUrl = data.publicUrl;
        }
      }
      const { error } = await supabase.from("players").update({ name: editingName.trim(), photo_url: newPhotoUrl }).eq("id", editingPlayer.id);
      if (error) {
        console.error("update err", error);
        alert("Error updating player");
      } else {
        cancelEditPlayer();
        handlePlayersChanged();
      }
    } finally {
      setEditingLoading(false);
    }
  };

  // helper for top nav active class
  const navClass = (route) =>
    `px-3 py-1.5 rounded-full ${path === route ? "bg-emerald-400/90 text-slate-900 font-medium shadow-sm" : "bg-transparent border border-slate-700 text-slate-200 hover:bg-slate-900/40"}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Poker Stats Dashboard</h1>
            <p className="text-sm text-slate-400">Track your home game results and see who's crushing.</p>
          </div>

          <nav className="flex items-center gap-3">
            <Link to="/" className={navClass("/")}>
              Home
            </Link>
            <Link to="/add-game" className={navClass("/add-game")}>
              Add Game Result
            </Link>
            <Link to="/manage-players" className={navClass("/manage-players")}>
              Manage Players
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route
            path="/"
            element={
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
            }
          />

          <Route path="/add-game" element={<AddGamePage players={players} onAdded={handlePlayersChanged} setImageModalUrl={setImageModalUrl} />} />

          <Route
            path="/manage-players"
            element={<ManagePlayersPage players={players} onAdded={handlePlayersChanged} onEditStart={startEditPlayer} onDelete={handleDeletePlayer} setImageModalUrl={setImageModalUrl} />}
          />

          <Route path="/player/:id" element={<PlayerFullPage />} />
        </Routes>

        {/* Edit modal area (simple inline edit) */}
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

              <button onClick={() => cancelEditPlayer()} className="text-xs text-slate-400">
                Close
              </button>
            </div>

            <form onSubmit={saveEditPlayer} className="mt-3 space-y-2 text-sm">
              <div>
                <label className="text-xs text-slate-400">Name</label>
                <input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
              </div>
              <div>
                <label className="text-xs text-slate-400">New profile photo (optional)</label>
                <input type="file" accept="image/*" className="w-full text-sm text-slate-400 file:text-sm" onChange={(e) => setEditingPhotoFile(e.target.files?.[0] || null)} />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => cancelEditPlayer()} className="px-3 py-1.5 rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-900/40">
                  Cancel
                </button>
                <button type="submit" disabled={editingLoading} className="px-3 py-1.5 rounded-lg bg-emerald-400 text-slate-900 text-sm font-medium hover:bg-emerald-500 disabled:opacity-60">
                  Save
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Global image modal */}
      {imageModalUrl && <ImageModal url={imageModalUrl} onClose={() => setImageModalUrl(null)} />}
    </div>
  );
}
