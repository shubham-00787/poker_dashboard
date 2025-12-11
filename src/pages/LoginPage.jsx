// src/pages/LoginPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ---------- SHA-256 helper (browser crypto) ---------- */
async function sha256Hex(text) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- Final cinematic login page ---------- */
export default function LoginPage({ onUnlock }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const unlockAudioRef = useRef(null);

  const [passkey, setPasskey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(false);
  const [shake, setShake] = useState(false);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [unlockedAnim, setUnlockedAnim] = useState(false);

  useEffect(() => {
    // if already unlocked in this browser session/device, go to /
    const persistent = localStorage.getItem("poker_unlocked_persistent") === "1";
    const session = sessionStorage.getItem("poker_unlocked") === "1";
    if (persistent || session) navigate("/", { replace: true });
  }, [navigate]);

  useEffect(() => {
    // try to load optional unlock sound silently (no errors if missing)
    try {
      const snd = new Audio("/assets/unlock.wav");
      snd.volume = 0.14;
      unlockAudioRef.current = snd;
    } catch (e) {
      unlockAudioRef.current = null;
    }
  }, []);

  // parallax — update mouse position normalized [0..1]
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      setMouse({ x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);

    try {
      const candidateHash = await sha256Hex(passkey || "");
      const envHash = import.meta.env.VITE_PASSKEY_HASH || "";

      if (!envHash) {
        setError("Passkey not configured (VITE_PASSKEY_HASH).");
        setLoading(false);
        return;
      }

      if (candidateHash === envHash) {
        // play unlock sound if available
        if (unlockAudioRef.current) {
          try {
            unlockAudioRef.current.currentTime = 0;
            await unlockAudioRef.current.play();
          } catch (_) {}
        }

        // mark session/persistent
        sessionStorage.setItem("poker_unlocked", "1");
        if (remember) localStorage.setItem("poker_unlocked_persistent", "1");

        // trigger a small unlock animation before navigating
        setUnlockedAnim(true);
        setTimeout(() => {
          onUnlock?.();
          navigate("/", { replace: true });
        }, 520);
      } else {
        setError("Incorrect passkey — try again.");
        setShake(true);
        setTimeout(() => setShake(false), 650);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong — try again.");
    } finally {
      setLoading(false);
    }
  };

  // small transforms for parallax & tilt
  const bgTx = (mouse.x - 0.5) * 28; // px
  const bgTy = (mouse.y - 0.5) * 16; // px
  const panelTiltY = (mouse.x - 0.5) * 4; // deg
  const panelTiltX = (0.5 - mouse.y) * 2; // deg

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-slate-900"
      role="main"
      aria-label="Poker dashboard login"
    >
      {/* Inline keyframes & small helper styles */}
      <style>{`
        @keyframes shakeX {
          0% { transform: translateX(0) }
          25% { transform: translateX(-8px) }
          50% { transform: translateX(8px) }
          75% { transform: translateX(-5px) }
          100% { transform: translateX(0) }
        }
        @keyframes popIn {
          0% { transform: translateY(8px) scale(.98); opacity: 0 }
          60% { transform: translateY(-6px) scale(1.02); opacity: 1 }
          100% { transform: translateY(0) scale(1); opacity: 1 }
        }
        @keyframes unlockPulse {
          0% { box-shadow: 0 10px 40px rgba(16,185,129,0.06) }
          50% { box-shadow: 0 24px 80px rgba(16,185,129,0.12) }
          100% { box-shadow: 0 10px 40px rgba(16,185,129,0.06) }
        }
      `}</style>

      {/* -------------------- Cinematic Rounded Frame (glass + glow + shadow) -------------------- */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center"
        style={{ zIndex: 0 }}
      >
        <div
          className="relative w-[96%] h-[94%] rounded-3xl overflow-hidden"
          style={{
            transform: `translate(${bgTx}px, ${bgTy}px) scale(1.028)`,
            transition: "transform 120ms linear",
            boxShadow: "0 28px 80px rgba(0,0,0,0.6)",
            borderRadius: 28,
          }}
        >
          {/* subtle glass border + neon halo */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 0 60px rgba(16,185,129,0.06)",
              zIndex: 10,
            }}
          />

          {/* background image fills the frame */}
          <div
            className="absolute inset-0 bg-center bg-cover"
            style={{
              backgroundImage: "url('/assets/poker-table.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "brightness(0.86) saturate(1.06)",
              zIndex: 1,
            }}
          />

          {/* inside vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(1200px 700px at 50% 46%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.56) 86%)",
              zIndex: 12,
            }}
          />

          {/* grain texture (optional; put noise.png in public/assets) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "url('/noise.png')",
              opacity: 0.05,
              zIndex: 14,
            }}
          />
        </div>
      </div>

      {/* -------------------- Center Login Panel (dark frosted glass to contrast image) -------------------- */}
      <form
        onSubmit={handleSubmit}
        className={`relative z-50 w-[90%] max-w-sm p-7 md:p-10 rounded-2xl
                    bg-gradient-to-br from-black/55 to-black/40 border border-white/6
                    shadow-2xl text-slate-100`}
        style={{
          transform: `rotateY(${panelTiltY}deg) rotateX(${panelTiltX}deg)`,
          transition: "transform 120ms linear",
          animation: "popIn 420ms cubic-bezier(.2,.9,.3,1) both",
          ...(unlockedAnim ? { animation: "none", boxShadow: "0 24px 90px rgba(16,185,129,0.08)" } : {}),
        }}
      >
        {/* small unlock accent at top */}
        <div className="flex items-center justify-center mb-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            {/* tiny emerald coin icon (SVG) */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="rgba(74,222,128,0.95)" strokeWidth="1.2" fill="rgba(6,95,70,0.06)" />
              <path d="M8.2 12.2c1.1 1.1 3.2 1.1 4.3 0" stroke="rgba(74,222,128,0.95)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <h1 className="text-center text-2xl font-extrabold mb-1">Poker Dashboard</h1>
        <p className="text-center text-sm text-slate-300 mb-4">Enter passkey to unlock</p>

        <label className="block text-sm text-slate-300 mb-2">Passkey</label>
        <input
          type="password"
          value={passkey}
          onChange={(e) => setPasskey(e.target.value)}
          placeholder="Enter passkey"
          className="w-full rounded-lg px-4 py-3 text-slate-100 bg-black/30 border border-white/8 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          autoFocus
        />

        {error && <div className="mt-3 text-sm text-rose-400">{error}</div>}

        <div className="flex items-center justify-between mt-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-white/10 bg-black/30"
            />
            Remember this device
          </label>

          <div className="text-xs text-slate-400">Session protected</div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-semibold shadow-md hover:translate-y-[-2px] transform transition"
            onClick={() => { /* intentional: submit handled by form */ }}
            style={unlockedAnim ? { animation: "unlockPulse 1100ms infinite" } : {}}
          >
            {loading ? "Checking…" : "Unlock"}
          </button>

          <button
            type="button"
            onClick={() => { setPasskey(""); setError(""); }}
            className="px-4 py-3 rounded-lg border border-white/8 text-slate-200"
          >
            Clear
          </button>
        </div>
      </form>

      {/* -------------------- small unlock confetti (CSS only) -------------------- */}
      {unlockedAnim && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-60">
          <div style={{ position: "absolute", left: "44%", top: "34%" }}>
            <span style={{ display: "block", width: 8, height: 12, background: "#34D399", transform: "translateY(-20px)", animation: "c1 900ms ease-out forwards" }} />
            <span style={{ display: "block", width: 8, height: 12, background: "#60A5FA", marginLeft: 10, transform: "translateY(-20px)", animation: "c2 1100ms ease-out forwards" }} />
            <span style={{ display: "block", width: 8, height: 12, background: "#FB7185", marginLeft: -4, transform: "translateY(-20px)", animation: "c3 1000ms ease-out forwards" }} />
          </div>
          <style>{`
            @keyframes c1 { 0% { transform: translateY(-20px) rotate(15deg); opacity:1 } 100% { transform: translateY(220px) rotate(360deg); opacity:0 } }
            @keyframes c2 { 0% { transform: translateY(-20px) rotate(-10deg); opacity:1 } 100% { transform: translateY(260px) rotate(540deg); opacity:0 } }
            @keyframes c3 { 0% { transform: translateY(-20px) rotate(8deg); opacity:1 } 100% { transform: translateY(230px) rotate(420deg); opacity:0 } }
          `}</style>
        </div>
      )}
    </div>
  );
}
