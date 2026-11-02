import React from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";

export default function Notification() {
  const { notification, clearNotification } = useWeb3();

  if (!notification) return null;

  const isError = notification.type === "error";

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full rounded-xl border p-4 shadow-2xl bg-slate-900 border-slate-700 flex items-start gap-3">
      {isError ? (
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 text-xs space-y-1 overflow-hidden">
        <div className="font-semibold text-slate-100">{notification.title}</div>
        <div className="text-slate-300 break-words">{notification.message}</div>
        {notification.txHash && (
          <div className="font-mono text-[11px] text-indigo-300 truncate pt-1">
            Tx Hash: {notification.txHash}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={clearNotification}
        className="text-slate-400 hover:text-slate-200"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
