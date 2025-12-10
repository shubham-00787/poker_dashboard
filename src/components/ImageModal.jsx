import React from "react";

export default function ImageModal({ url, onClose }) {
  if (!url) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 cursor-zoom-out"
    >
      <img
        src={url}
        alt="Large view"
        className="max-h-[80vh] max-w-[90vw] rounded-2xl shadow-2xl border border-slate-700 cursor-default"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
