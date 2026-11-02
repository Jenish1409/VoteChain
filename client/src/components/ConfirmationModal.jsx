import React from "react";
import { ShieldCheck, X } from "lucide-react";

export default function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel = "Confirm Transaction",
  onConfirm,
  onCancel,
  busy = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold">
            <ShieldCheck className="w-5 h-5" />
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">{description}</p>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400">
          This action writes an immutable transaction to{" "}
          <span className="font-mono text-slate-200">ElectionManager.sol</span>{" "}
          and{" "}
          <span className="font-mono text-slate-200">AuditLogger.sol</span>.
          Please confirm in MetaMask when prompted.
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
          >
            {busy ? "Awaiting Block Confirmation..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
