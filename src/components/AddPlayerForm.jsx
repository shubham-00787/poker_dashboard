// src/components/AddPlayerForm.jsx
import React, { useRef, useState } from "react";
import { supabase } from "../supabaseClient";

/**
 * Props:
 * - onAdded: callback after a successful add
 * - showHeader: boolean, whether to render the internal "Add Player" header (default true)
 */
export default function AddPlayerForm({ onAdded, showHeader = true }) {
  const [name, setName] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false); // confirmation modal
  const inputRef = useRef();

  const handlePickFile = (file) => {
    if (!file) {
      setPhotoFile(null);
      setPreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErr("Please choose an image file.");
      return;
    }
    setErr("");
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const onFileChange = (e) => {
    handlePickFile(e.target.files?.[0] || null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    handlePickFile(file || null);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const clearForm = () => {
    setName("");
    setPhotoFile(null);
    setPreview(null);
    setErr("");
    if (inputRef.current) inputRef.current.value = "";
  };

  // This only shows the confirmation modal (validation first).
  const handleAddClick = (e) => {
    e.preventDefault();
    setErr("");
    if (!name.trim()) {
      setErr("Please enter a player name.");
      return;
    }
    // open confirmation modal
    setConfirmOpen(true);
  };

  // Actual network save called when user confirms
  const handleConfirmAdd = async () => {
    setConfirmOpen(false);
    setErr("");
    setLoading(true);
    let photoUrl = null;

    try {
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `players/${fileName}`;

        const { error: uploadError } = await supabase.storage.from("player-photos").upload(filePath, photoFile);

        if (uploadError) {
          console.error("Photo upload error", uploadError);
          setErr("Error uploading photo — try again.");
          setLoading(false);
          return;
        } else {
          const { data } = supabase.storage.from("player-photos").getPublicUrl(filePath);
          photoUrl = data.publicUrl;
        }
      }

      const { error } = await supabase.from("players").insert([{ name: name.trim(), photo_url: photoUrl }]);
      if (error) {
        console.error("Insert player error", error);
        setErr("Error saving player.");
      } else {
        // success
        clearForm();
        onAdded?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleAddClick} className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950/80 to-slate-900/80 p-4 space-y-3">
        {/* internal header (optional) */}
        {showHeader && (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-100">Add Player</div>
              <div className="text-xs text-slate-400">Create a player profile (optional photo)</div>
            </div>
            {/* removed the persistent "Ready" label per request.
                Only show loading text when saving (loading state is managed after confirmation). */}
            {loading && <div className="text-xs text-slate-400">Saving…</div>}
          </div>
        )}

        {/* if header hidden, keep a small spacing so the card looks balanced */}
        {!showHeader && <div className="h-1" />}

        <div>
          <label className="block text-[11px] text-slate-400 mb-2">Player name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rohit"
            className="w-full rounded-lg bg-slate-950/60 border border-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          />
        </div>

        <div>
          <label className="block text-[11px] text-slate-400 mb-2">Photo (optional)</label>

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="relative rounded-lg border border-slate-800 bg-slate-900/50 p-3 flex items-center gap-3"
          >
            {preview ? (
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0">
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 text-sm border border-slate-700 flex-shrink-0">
                Photo
              </div>
            )}

            <div className="flex-1">
              <div className="text-xs text-slate-300 mb-1">Drag & drop, or</div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="player-photo"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500 text-slate-900 text-sm font-medium cursor-pointer shadow-md hover:scale-[1.02] transition"
                >
                  Choose file
                </label>
                <input ref={inputRef} id="player-photo" type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                <button type="button" onClick={() => { setPhotoFile(null); setPreview(null); if (inputRef.current) inputRef.current.value = ""; }} className="text-xs text-slate-400 hover:underline">
                  Remove
                </button>
              </div>

              <div className="mt-2 text-[11px] text-slate-500">Square images work best. Max 5MB.</div>
            </div>
          </div>

          {err && <div className="mt-2 text-xs text-rose-400">{err}</div>}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-900 font-medium px-4 py-2 shadow-lg hover:scale-105 transition transform disabled:opacity-60"
          >
            {loading ? "Adding…" : "Add player"}
          </button>

          <button
            type="button"
            onClick={clearForm}
            disabled={loading}
            className="px-3 py-2 rounded-md bg-transparent border border-slate-700 text-slate-200 text-sm hover:bg-slate-900/40 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setConfirmOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-2xl bg-slate-950/95 border border-slate-800 p-6 shadow-xl transform transition-transform scale-95 animate-[scaleIn_120ms_ease-out_forwards]"
            style={{ animationName: "scaleIn", animationDuration: "130ms", animationTimingFunction: "cubic-bezier(.2,.9,.2,1)" }}
          >
            <h3 className="text-lg font-semibold text-slate-100">Confirm add player</h3>
            <p className="mt-2 text-sm text-slate-400">You're about to add the following player:</p>

            <div className="mt-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0">
                {preview ? <img src={preview} alt="preview" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400">H</div>}
              </div>
              <div>
                <div className="font-medium text-slate-100">{name}</div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-3 py-2 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-900/40"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmAdd}
                className="px-4 py-2 rounded-md bg-emerald-500 text-slate-950 font-medium shadow-md hover:brightness-105"
              >
                Confirm and add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* small animation keyframes style for consistent scale-up (tailwind doesn't include custom keyframes here) */}
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(.96); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
