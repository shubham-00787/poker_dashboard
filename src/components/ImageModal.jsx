// src/components/ImageModal.jsx
import React, { useEffect, useRef } from "react";

export default function ImageModal({ url, onClose }) {
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!url) return;

    // prevent body scroll while modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // focus the close button for accessibility
    const t = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [url, onClose]);

  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      role="presentation"
      onClick={onClose}
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Image preview"
        className="
          relative z-10 max-w-[90vw] max-h-[90vh] rounded-xl overflow-hidden
          bg-transparent shadow-2xl
          transform transition-all duration-180
          animate-imageModalIn
          "
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt="preview"
          className="max-w-full max-h-[80vh] object-contain block bg-gradient-to-b from-slate-900/80 to-transparent"
        />

        <div className="absolute left-4 top-4 flex gap-2">
          <button
            type="button"
            ref={closeBtnRef}
            onClick={onClose}
            className="
              rounded-full bg-black/40 text-white px-3 py-1 text-sm
              hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/60
              transition
            "
            aria-label="Close image preview"
          >
            Close
          </button>
        </div>
      </div>

      {/* animation keyframes (kept local) */}
      <style>{`
        @keyframes imageModalIn {
          0% { opacity: 0; transform: scale(0.96) translateY(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-imageModalIn {
          animation: imageModalIn 180ms ease-out both;
        }
      `}</style>
    </div>
  );
}
