// src/components/AddGameResultForAll.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import DatePicker from "./DatePicker";

export default function AddGameResultForAll({ players = [], onAdded, setImageModalUrl }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(false);

  // confirmation modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toSavePayload, setToSavePayload] = useState(null);
  const [modalAnimateIn, setModalAnimateIn] = useState(false);

  // toast/snackbar
  const [toast, setToast] = useState({ visible: false, msg: "", type: "info" });
  const toastTimer = useRef(null);
  const autoTimersRef = useRef({});

  const showToast = (msg, type = "info", ms = 3000) => {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, msg, type });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), ms);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setConfirmOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // animate modal entrance when confirmOpen flips to true
  useEffect(() => {
    if (confirmOpen) {
      setModalAnimateIn(false);
      const t = setTimeout(() => setModalAnimateIn(true), 15);
      return () => clearTimeout(t);
    } else {
      setModalAnimateIn(false);
    }
  }, [confirmOpen]);

  const handleChange = (playerId, field, value) => {
    const normalized = value === null || value === undefined ? "" : String(value);
    setRows((prev) => ({
      ...prev,
      [playerId]: {
        played: prev[playerId]?.played ?? true,
        ...(prev[playerId] || {}),
        [field]: normalized,
      },
    }));
  };

  const numericOrZero = (v) => {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  const handleInc = (playerId, field, delta) => {
    setRows((prev) => {
      const current = prev[playerId] || {};
      const curVal = numericOrZero(current[field]);
      const next = curVal + delta;
      return {
        ...prev,
        [playerId]: { ...current, [field]: String(next) },
      };
    });
  };

  const handlePreset = (playerId, field, add) => {
    handleInc(playerId, field, add);
  };

  const handleTogglePlayed = (playerId) => {
    setRows((prev) => {
      const current = prev[playerId] || {};
      const played = typeof current.played === "boolean" ? !current.played : false;
      return {
        ...prev,
        [playerId]: { ...current, played },
      };
    });
  };

  // rowsCount used in remarks
  const rowsCount = useMemo(() => {
    let count = 0;
    players.forEach((p) => {
      const r = rows[p.id] || {};
      const played = typeof r.played === "boolean" ? r.played : true;
      if (!played) return;
      const buyin = r.buyin === "" || r.buyin === undefined ? null : Number(r.buyin);
      const cashout = r.cashout === "" || r.cashout === undefined ? null : Number(r.cashout);
      if (buyin === null || cashout === null || Number.isNaN(buyin) || Number.isNaN(cashout)) return;
      count++;
    });
    return count;
  }, [players, rows]);

  // prepare sessions to insert given current rows
  const buildSessionsToInsert = () => {
    if (!players.length) return [];

    // generate ONE gameId for this save operation
    const gameId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8);

    return players
      .map((p) => {
        const row = rows[p.id] || {};
        const played = typeof row.played === "boolean" ? row.played : true;
        if (!played) return null;

        const buyin = row.buyin;
        const cashout = row.cashout;

        if (buyin === undefined || cashout === undefined || buyin === "" || cashout === "") {
          return null;
        }

        return {
          player_id: p.id,
          buyin: Number(buyin),
          cashout: Number(cashout),
          game_date: date,
          game_id: gameId, // <-- same game_id for all players in this save
        };
      })
      .filter(Boolean);
  };

  const performSave = async (sessionsToInsert) => {
    if (!sessionsToInsert?.length) {
      showToast("No valid rows to save.", "error", 3500);
      return;
    }
    setConfirmOpen(false);
    setLoading(true);
    try {
      const { error } = await supabase.from("sessions").insert(sessionsToInsert);
      if (error) {
        console.error("Error inserting game result", error);
        showToast("Error saving game result. Check console.", "error", 4500);
      } else {
        setRows({});
        onAdded?.();
        // changed message to be game-centric
        showToast("Game saved.", "success", 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const sessionsToInsert = buildSessionsToInsert();
    if (!sessionsToInsert.length) {
      showToast("Enter buy-in and final amount for at least one player who played.", "error", 4500);
      return;
    }
    const playerObjs = sessionsToInsert.map((s) => {
      const p = players.find((pp) => pp.id === s.player_id);
      return p ? { id: p.id, name: p.name, photo_url: p.photo_url } : { id: s.player_id, name: String(s.player_id) };
    });
    setToSavePayload({ sessionsToInsert, players: playerObjs });
    setConfirmOpen(true);
  };

  if (!players.length) {
    return <div className="text-xs text-slate-500">No players yet. Add some players first.</div>;
  }

  const startAuto = (playerId, field, delta) => {
    const key = `${playerId}-${field}`;
    // cancel if already running
    stopAuto(playerId, field);

    let delay = 350; // initial delay before first auto-step
    let stepDelay = 150; // repeating delay
    let minDelay = 40; // min delay for acceleration
    let accelFactor = 0.88; // multiplier to accelerate
    let running = { cancelled: false };
    autoTimersRef.current[key] = running;

    // first step immediately (gives snappy response)
    handleInc(playerId, field, delta);

    const loop = () => {
      if (running.cancelled) return;
      handleInc(playerId, field, delta);
      stepDelay = Math.max(minDelay, Math.round(stepDelay * accelFactor));
      running.timeout = setTimeout(loop, stepDelay);
    };

    // start after short delay to allow single clicks
    running.timeout = setTimeout(loop, delay);
  };

  const stopAuto = (playerId, field) => {
    const key = `${playerId}-${field}`;
    const running = autoTimersRef.current[key];
    if (running) {
      running.cancelled = true;
      if (running.timeout) clearTimeout(running.timeout);
      delete autoTimersRef.current[key];
    }
  };

  // small helper: render numeric input with custom steppers, presets, keyboard, long-press
  const NumericControl = ({ p, field, placeholder = "0", width = "w-28" }) => {
    const row = rows[p.id] || {};
    const played = typeof row.played === "boolean" ? row.played : true;
    const missingInputs =
      played &&
      (row.buyin === undefined || row.cashout === undefined || row[field] === undefined || row[field] === "" || Number.isNaN(Number(row[field])));

    const onKeyDown = (e) => {
      if (!played) return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleInc(p.id, field, 1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleInc(p.id, field, -1);
      }
    };

    // handlers for mouse/touch long press
    const onPointerDownDec = (e) => {
      e.preventDefault();
      if (!played) return;
      startAuto(p.id, field, -1);
    };
    const onPointerDownInc = (e) => {
      e.preventDefault();
      if (!played) return;
      startAuto(p.id, field, 1);
    };

    const onPointerUp = () => stopAuto(p.id, field);

    return (
      <div className="flex items-center gap-2 justify-end">
        <div className="flex items-center gap-1 mr-1">
          <motion.button
            type="button"
            onClick={() => handlePreset(p.id, field, 50)}
            disabled={!played}
            whileTap={{ scale: 0.96 }}
            className="text-xs px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-transform"
            aria-label="add 50"
            title="+50"
          >
            +50
          </motion.button>
          <motion.button
            type="button"
            onClick={() => handlePreset(p.id, field, 100)}
            disabled={!played}
            whileTap={{ scale: 0.96 }}
            className="text-xs px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-transform"
            aria-label="add 100"
            title="+100"
          >
            +100
          </motion.button>
        </div>

        <motion.button
          type="button"
          onMouseDown={onPointerDownDec}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDownDec}
          onTouchEnd={onPointerUp}
          onPointerDown={onPointerDownDec}
          onPointerUp={onPointerUp}
          disabled={!played}
          whileTap={{ scale: 0.96 }}
          className="flex items-center justify-center h-8 w-8 rounded-md bg-slate-800/60 border border-slate-700 text-slate-200 text-lg font-medium transition-transform disabled:opacity-40"
          aria-label={`decrease ${field}`}
        >
          −
        </motion.button>

        <input
          type="number"
          step="1"
          inputMode="numeric"
          disabled={!played}
          onKeyDown={onKeyDown}
          className={`no-arrows ${width} rounded-md bg-slate-950/60 border px-2 py-1 text-right text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-40
            ${missingInputs ? "ring-rose-400/30 border-rose-600/20" : "border-slate-700"}`}
          placeholder={placeholder}
          value={row[field] ?? ""}
          onChange={(e) => handleChange(p.id, field, e.target.value)}
          aria-label={field}
        />

        <motion.button
          type="button"
          onMouseDown={onPointerDownInc}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDownInc}
          onTouchEnd={onPointerUp}
          onPointerDown={onPointerDownInc}
          onPointerUp={onPointerUp}
          disabled={!played}
          whileTap={{ scale: 0.96 }}
          className="flex items-center justify-center h-8 w-8 rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-lg font-medium hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 shadow-md"
          aria-label={`increase ${field}`}
        >
          +
        </motion.button>
      </div>
    );
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950/80 to-slate-900/80 p-5 space-y-4 relative">
        {/* header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Add Game Result</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Mark who played, enter buy-ins and final cashout. Rows with missing inputs are ignored when saving.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <DatePicker label="Game date" value={date} onChange={setDate} />
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400 text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Played</th>
                <th className="px-3 py-2 text-left font-medium">Player</th>
                <th className="px-3 py-2 text-right font-medium">Buy-in</th>
                <th className="px-3 py-2 text-right font-medium">Amount After Game</th>
              </tr>
            </thead>

            <tbody>
              {players.map((p) => {
                const row = rows[p.id] || {};
                const played = typeof row.played === "boolean" ? row.played : true;
                const missingInputs =
                  played &&
                  (row.buyin === undefined || row.cashout === undefined || row.buyin === "" || row.cashout === "" || Number.isNaN(Number(row.buyin)) || Number.isNaN(Number(row.cashout)));

                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`border-t border-slate-900/80 transform transition-all duration-150 hover:scale-[1.001] ${missingInputs ? "opacity-80" : ""}`}
                  >
                    <td className="px-3 py-3 align-middle">
                      <button
                        type="button"
                        onClick={() => handleTogglePlayed(p.id)}
                        aria-pressed={played}
                        aria-label={played ? `Exclude ${p.name}` : `Include ${p.name}`}
                        className={`relative inline-flex items-center h-8 w-14 rounded-full transition-all transform focus:outline-none ${
                          played ? "bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_6px_18px_rgba(34,197,94,0.12)]" : "bg-slate-800/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                        }`}
                      >
                        <span className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white/95 transform transition-all shadow-md ${played ? "translate-x-6" : "translate-x-0"}`}>
                          <span className="block h-full w-full rounded-full" />
                        </span>

                        <span className={`absolute inset-y-0 left-1 flex items-center pl-1 transition-opacity ${played ? "opacity-100" : "opacity-0"}`} aria-hidden>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-emerald-700" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 13L10 18L20 6" stroke="rgba(6,95,70,0.95)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>

                        <span className={`absolute inset-y-0 right-1 flex items-center pr-1 transition-opacity ${played ? "opacity-0" : "opacity-100"}`} aria-hidden>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="stroke-slate-300" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 12H19" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </button>
                    </td>

                    <td className="px-3 py-3 text-slate-100">
                      <div className="flex items-center gap-3">
                        {p.photo_url ? (
                          <button
                            type="button"
                            onClick={() => setImageModalUrl?.(p.photo_url)}
                            className="w-8 h-8 rounded-full overflow-hidden object-cover border border-slate-700 cursor-zoom-in p-0"
                            aria-label={`Open photo for ${p.name}`}
                          >
                            <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover rounded-full" />
                          </button>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-300 border border-slate-700">
                            {p.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="text-sm">{p.name}</div>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-right align-middle">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <span className="text-xs text-slate-400 self-start mt-1">₹</span>
                        <NumericControl p={p} field="buyin" placeholder="0" width="w-28" />
                      </div>
                    </td>

                    <td className="px-3 py-3 text-right align-middle">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <span className="text-xs text-slate-400 self-start mt-1">₹</span>
                        <NumericControl p={p} field="cashout" placeholder="0" width="w-32" />
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            <strong className="text-slate-200">Remarks:</strong>{' '}
            <span className="text-slate-400">{rowsCount > 0 ? `${rowsCount} valid entries ready to save.` : "No complete rows yet — enter buy-in & cashout to include a row."}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRows({})}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-md bg-transparent border border-slate-700 text-slate-200 hover:bg-slate-900/40 disabled:opacity-50"
            >
              Clear
            </button>

            <button
              type="submit"
              disabled={loading}
              className="text-sm font-medium rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-4 py-2 disabled:opacity-60 shadow-lg shadow-emerald-500/20 transform transition-all hover:scale-105 active:scale-95"
            >
              {loading ? "Saving…" : "Save Game Result"}
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Modal (unchanged from previous) */}
      {confirmOpen && toSavePayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />

          <div
            className={`relative max-w-lg w-full bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl z-10 transform transition-all duration-180 ease-out
              ${modalAnimateIn ? "scale-100 opacity-100" : "scale-95 opacity-0"}
            `}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
          >
            <h4 id="confirm-modal-title" className="text-lg font-semibold text-slate-100">Confirm save</h4>

            <p className="mt-2 text-sm text-slate-400">You're about to save game result for date <span className="font-medium text-slate-100">{date}</span>.</p>

            <div className="mt-4">
              <div className="text-xs text-slate-400 mb-2">Players included</div>
              <div className="flex flex-wrap gap-2">
                {toSavePayload.players && (() => {
                  const list = toSavePayload.players;
                  const max = 6;
                  const shown = list.slice(0, max);
                  return (
                    <>
                      {shown.map((pl) => (
                        <div key={pl.id} className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700 text-sm text-slate-100">
                          {pl.photo_url ? (
                            <button type="button" onClick={() => setImageModalUrl?.(pl.photo_url)} className="w-6 h-6 rounded-full overflow-hidden object-cover border border-slate-700 p-0" aria-label={`Open photo for ${pl.name}`}>
                              <img src={pl.photo_url} alt={pl.name} className="w-full h-full object-cover rounded-full" />
                            </button>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-200 border border-slate-600">{pl.name?.charAt(0).toUpperCase()}</div>
                          )}

                          <button type="button" onClick={() => window.open(`/player/${pl.id}`, "_blank")} className="text-sm text-slate-100 hover:underline">{pl.name}</button>
                        </div>
                      ))}
                      {list.length > max && <div className="px-3 py-1 rounded-full bg-slate-800/40 border border-slate-700 text-sm text-slate-300">+{list.length - max} more</div>}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button onClick={() => setConfirmOpen(false)} className="px-3 py-2 rounded-md bg-transparent border border-slate-700 text-slate-200 hover:bg-slate-800/50">Cancel</button>

              <button onClick={() => performSave(toSavePayload.sessionsToInsert)} disabled={loading} className="px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium shadow-md hover:scale-[1.02] transform transition-all disabled:opacity-60">{loading ? "Saving…" : `Confirm and Save`}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast / Snackbar */}
      <div aria-live="polite" className="fixed bottom-6 right-6 z-50 flex items-end pointer-events-none">
        <div
          className={`pointer-events-auto max-w-xs w-full rounded-md p-3 text-sm shadow-lg transform transition-all duration-300
            ${toast.visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
            ${toast.type === "success" ? "bg-emerald-700/95 text-white" : toast.type === "error" ? "bg-rose-600/95 text-white" : "bg-slate-800/95 text-white"}
          `}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {toast.type === "success" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="stroke-white" xmlns="http://www.w3.org/2000/svg"><path d="M5 13L10 18L20 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : toast.type === "error" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="stroke-white" xmlns="http://www.w3.org/2000/svg"><path d="M10 10L14 14M14 10L10 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="stroke-white" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.6" /></svg>
              )}
            </div>

            <div className="flex-1"><div className="font-medium">{toast.msg}</div></div>

            <div className="flex-shrink-0">
              <button onClick={() => setToast((t) => ({ ...t, visible: false }))} className="text-white/80 hover:text-white" aria-label="dismiss">✕</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
