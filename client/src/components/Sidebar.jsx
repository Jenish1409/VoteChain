import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  Vote,
  CheckCircle2,
  BarChart3,
  ShieldAlert,
  FileSearch,
  Landmark,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";

const navItems = [
  { to: "/", label: "Home Overview", icon: Home },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/elections", label: "Elections", icon: Vote },
  { to: "/voting", label: "Voting Booth", icon: CheckCircle2 },
  { to: "/results", label: "Results & Analytics", icon: BarChart3 },
  { to: "/audit", label: "Audit Trail", icon: FileSearch },
  { to: "/treasury", label: "Ether Treasury", icon: Landmark },
  { to: "/admin", label: "Admin Console", icon: ShieldAlert, adminBadge: true },
];

export default function Sidebar() {
  const { wallet } = useWeb3();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950/60 min-h-[calc(100vh-4rem)] p-4 hidden lg:flex flex-col justify-between">
      <nav className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Platform Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`
              }
            >
              <span className="flex items-center gap-2.5">
                <Icon className="w-4 h-4" />
                {item.label}
              </span>
              {item.adminBadge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    wallet.isAdmin
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {wallet.isAdmin ? "ADMIN" : "OWNER"}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-400">
          <span>Contract Status</span>
          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            On-Chain
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono truncate">
          ElectionMgr:{" "}
          {wallet.electionManagerAddress
            ? `${wallet.electionManagerAddress.slice(0, 8)}...`
            : "Connect Wallet"}
        </div>
        <div className="text-[11px] text-slate-400 font-mono truncate">
          AuditLogger:{" "}
          {wallet.auditLoggerAddress
            ? `${wallet.auditLoggerAddress.slice(0, 8)}...`
            : "Connect Wallet"}
        </div>
      </div>
    </aside>
  );
}
