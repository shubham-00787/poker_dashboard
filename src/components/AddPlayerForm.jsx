import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AddPlayerForm({ onAdded }) {
  const [name, setName] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    let photoUrl = null;

    try {
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExt}`;
        const filePath = `players/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("player-photos")
          .upload(filePath, photoFile);

        if (uploadError) {
          console.error("Photo upload error", uploadError);
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage
            .from("player-photos")
            .getPublicUrl(filePath);
          photoUrl = publicUrl;
        }
      }

      const { error } = await supabase.from("players").insert([
        {
          name: name.trim(),
          photo_url: photoUrl,
        },
      ]);

      if (error) {
        console.error("Insert player error", error);
      } else {
        setName("");
        setPhotoFile(null);
        onAdded?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleAddPlayer}
      className="space-y-2 p-3 rounded-xl bg-slate-900/70 border border-slate-800"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">
          Add Player
        </span>
        {loading && (
          <span className="text-[10px] text-slate-500">Saving...</span>
        )}
      </div>
      <input
        className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
        placeholder="Player name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="file"
        accept="image/*"
        className="w-full text-[11px] text-slate-400 file:text-[11px]"
        onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full text-xs font-medium rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-1.5 disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}
