import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import PlayerDetail from "./components/PlayerDetail";
import AddPlayerForm from "./components/AddPlayerForm";
import AddGameResultForAll from "./components/AddGameResultForAll";
import ImageModal from "./components/ImageModal";

export default function App() {
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const [view, setView] = useState("home"); // "home" | "game" | "players"
  const [timeRange, setTimeRange] = useState("1Y"); // default last 1 year

  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Edit player state
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingPhotoFile, setEditingPhotoFile] = useState(null);
  const [editingLoading, setEditingLoading] = useState(false);

  // Image modal state
  const [imageModalUrl, setImageModalUrl] = useState(null);

  // Close modal with Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setImageModalUrl(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  // ---------- Helpers ----------
  const getCutoffDate = (range) => {
    if (range === "ALL") return null;
    const now = new Date();
    const d = new Date(now);

    if (range === "3M") d.setMonth(d.getMonth() - 3);
    if (range === "6M") d.setMonth(d.getMonth() - 6);
    if (range === "1Y") d.setFullYear(d.getFullYear() - 1);

    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  };

  const handlePlayersChanged = () => {
    setRefreshFlag((f) => f + 1);
  };

  // ---------- Load players ----------
  useEffect(() => {
    const fetchPlayers = async () => {
      setLoadingPlayers(true);
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching players:", error);
      } else {
        setPlayers(data || []);
        if (selectedPlayer && data) {
          const still = data.find((p) => p.id === selectedPlayer.id);
          if (!still) setSelectedPlayer(null);
        }
      }
      setLoadingPlayers(false);
    };

    fetchPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshFlag]);

  // ---------- Build leaderboard ----------
  useEffect(() => {
    const buildLeaderboard = async () => {
      if (!players.length) {
        setLeaderboardRows([]);
        setSelectedPlayer(null);
        return;
      }

      setLoadingBoard(true);

      const cutoff = getCutoffDate(timeRange);
      let query = supabase.from("sessions").select("*");

      if (cutoff) {
        query = query.gte("game_date", cutoff);
      }

      const { data: sessions, error } = await query;

      if (error) {
        console.error("Error fetching sessions for leaderboard:", error);
        setLeaderboardRows([]);
        setLoadingBoard(false);
        return;
      }

      const statsMap = new Map();

      for (const s of sessions) {
        const pid = s.player_id;
        if (!statsMap.has(pid)) {
          statsMap.set(pid, {
            totalGames: 0,
            netProfit: 0,
            games: [],
          });
        }
        const stat = statsMap.get(pid);
        const profit = Number(s.cashout) - Number(s.buyin);

        stat.totalGames += 1;
        stat.netProfit += profit;
        stat.games.push({
          date: s.game_date,
          profit,
        });
      }

      const rows = players.map((p) => {
        const stat = statsMap.get(p.id) || {
          totalGames: 0,
          netProfit: 0,
          games: [],
        };

        const lastFiveGames = [...stat.games]
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .slice(0, 5);

        const streak = lastFiveGames.map((g) =>
          g.profit >= 0 ? "W" : "L"
        );

        return {
          player: p,
          totalGames: stat.totalGames,
          netProfit: stat.netProfit,
          streak,
        };
      });

      rows.sort((a, b) => b.netProfit - a.netProfit);

      setLeaderboardRows(rows);
      if (!selectedPlayer && rows.length) {
        setSelectedPlayer(rows[0].player);
      }
      setLoadingBoard(false);
    };

    buildLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, timeRange, refreshFlag]);

  // ---------- Player delete ----------
  const handleDeletePlayer = async (playerId) => {
    const ok = window.confirm(
      "Remove this player and all their stats?"
    );
    if (!ok) return;

    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", playerId);

    if (error) {
      console.error("Error deleting player:", error);
    } else {
      handlePlayersChanged();
    }
  };

  // ---------- Edit player ----------
  const startEditPlayer = (player) => {
    setEditingPlayer(player);
    setEditingName(player.name || "");
    setEditingPhotoFile(null);
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
        const fileExt = editingPhotoFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExt}`;
        const filePath = `players/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("player-photos")
          .upload(filePath, editingPhotoFile);

        if (uploadError) {
          console.error("Photo upload error (edit)", uploadError);
          alert("Error uploading new photo: " + uploadError.message);
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage
            .from("player-photos")
            .getPublicUrl(filePath);
          newPhotoUrl = publicUrl;
        }
      }

      const { error } = await supabase
        .from("players")
        .update({
          name: editingName.trim(),
          photo_url: newPhotoUrl,
        })
        .eq("id", editingPlayer.id);

      if (error) {
        console.error("Error updating player", error);
        alert("Error updating player details.");
      } else {
        cancelEditPlayer();
        handlePlayersChanged();
      }
    } finally {
      setEditingLoading(false);
    }
  };

  // ---------- Render helpers ----------
  const renderNavButton = (id, label) => {
    const active = view === id;
    return (
      <button
        onClick={() => setView(id)}
        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition
        ${
          active
            ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow"
            : "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
        }`}
      >
        {label}
      </button>
    );
  };

  const renderHome = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">
            Leaderboard
          </h2>
          <p className="text-xs text-slate-500">
            Sorted by net gains for the selected time range.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">
            Time range
          </span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-100 px-2 py-1"
          >
            <option value="3M">Last 3 months</option>
            <option value="6M">Last 6 months</option>
            <option value="1Y">Last 1 year</option>
            <option value="ALL">All time</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
          <span className="text-xs font-medium text-slate-300">
            Players overview
          </span>
          {loadingBoard && (
            <span className="text-[10px] text-slate-500">
              Calculating…
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Sl. no.</th>
                <th className="px-3 py-2 text-left font-medium">
                  Player
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  Total games
                </th>
                <th className="px-3 py-2 text-center font-medium">
                  Last 5 games
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  Net gains
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboardRows.map((row, idx) => {
                const profit = row.netProfit;
                const isSelected =
                  selectedPlayer && selectedPlayer.id === row.player.id;
                return (
                  <tr
                    key={row.player.id}
                    onClick={() => setSelectedPlayer(row.player)}
                    className={`border-t border-slate-900/80 cursor-pointer transition
                      ${
                        isSelected
                          ? "bg-slate-900/80"
                          : "hover:bg-slate-900/50"
                      }`}
                  >
                    <td className="px-3 py-2 text-left text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {row.player.photo_url ? (
                          <img
                            src={row.player.photo_url}
                            alt={row.player.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              setImageModalUrl(row.player.photo_url);
                            }}
                            className="w-7 h-7 rounded-full object-cover border border-slate-700 cursor-zoom-in hover:opacity-80"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-[11px] text-slate-300 border border-slate-700">
                            {row.player.name
                              ?.charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                        <span className="text-slate-100">
                          {row.player.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-200">
                      {row.totalGames}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-center gap-1">
                        {row.streak.length === 0 && (
                          <span className="text-[10px] text-slate-500">
                            –
                          </span>
                        )}
                        {row.streak.map((result, i) => (
                          <div
                            key={i}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold border
                              ${
                                result === "W"
                                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                                  : "bg-rose-500/10 border-rose-500 text-rose-400"
                              }`}
                          >
                            {result}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`font-semibold ${
                          profit > 0
                            ? "text-emerald-400"
                            : profit < 0
                            ? "text-rose-400"
                            : "text-slate-300"
                        }`}
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
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-center text-slate-500"
                  >
                    No games in this time range yet. Add a game result to
                    see the leaderboard.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPlayer && (
        <div className="mt-4">
          <PlayerDetail
            player={selectedPlayer}
            onPhotoClick={(url) => setImageModalUrl(url)}
          />
        </div>
      )}
    </div>
  );

  const renderGame = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-50">
          Add Game Result
        </h2>
      </div>
      <AddGameResultForAll
        players={players}
        onAdded={handlePlayersChanged}
      />
    </div>
  );

  const renderPlayers = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-50">
          Manage Players
        </h2>
        <p className="text-xs text-slate-500">
          Add new players, edit their profile, or remove them.
        </p>
      </div>

      <AddPlayerForm onAdded={handlePlayersChanged} />

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
          <span className="text-xs font-medium text-slate-300">
            Current players
          </span>
          {loadingPlayers && (
            <span className="text-[10px] text-slate-500">
              Loading…
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-slate-900/80 hover:bg-slate-900/50"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {p.photo_url ? (
                        <img
                          src={p.photo_url}
                          alt={p.name}
                          onClick={() => setImageModalUrl(p.photo_url)}
                          className="w-7 h-7 rounded-full object-cover border border-slate-700 cursor-zoom-in hover:opacity-80"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-[11px] text-slate-300 border border-slate-700">
                          {p.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-slate-100">
                        {p.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEditPlayer(p)}
                        className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 text-slate-100 border border-slate-600 hover:bg-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePlayer(p.id)}
                        className="text-[11px] px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/40 hover:bg-rose-500/20"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {players.length === 0 && !loadingPlayers && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-3 py-4 text-center text-slate-500"
                  >
                    No players yet. Add one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingPlayer && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editingPlayer.photo_url ? (
                <img
                  src={editingPlayer.photo_url}
                  alt={editingPlayer.name}
                  onClick={() =>
                    setImageModalUrl(editingPlayer.photo_url)
                  }
                  className="w-8 h-8 rounded-full object-cover border border-slate-700 cursor-zoom-in hover:opacity-80"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-xs text-slate-300 border border-slate-700">
                  {editingPlayer.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="text-xs font-medium text-slate-200">
                Edit player
              </h3>
            </div>
            {editingLoading && (
              <span className="text-[10px] text-slate-500">
                Saving...
              </span>
            )}
          </div>

          <form onSubmit={saveEditPlayer} className="space-y-3 text-xs">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">
                  Name
                </label>
                <input
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs text-slate-100"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">
                  New profile photo (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-[11px] text-slate-400 file:text-[11px]"
                  onChange={(e) =>
                    setEditingPhotoFile(e.target.files?.[0] || null)
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelEditPlayer}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editingLoading}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-[11px] font-medium hover:bg-emerald-400 disabled:opacity-50"
              >
                Save changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-4 md:px-8 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">
            Poker Stats Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Track your home game results and see who&apos;s crushing.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-700 rounded-full px-2 py-1">
          {renderNavButton("home", "Home")}
          {renderNavButton("game", "Add Game Result")}
          {renderNavButton("players", "Manage Players")}
        </div>
      </header>

      <main className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
        {view === "home" && renderHome()}
        {view === "game" && renderGame()}
        {view === "players" && renderPlayers()}
      </main>

      <ImageModal
        url={imageModalUrl}
        onClose={() => setImageModalUrl(null)}
      />
    </div>
  );
}
