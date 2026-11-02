import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Web3Provider } from "./context/Web3Context";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Notification from "./components/Notification";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Elections from "./pages/Elections";
import ElectionDetails from "./pages/ElectionDetails";
import VotingInterface from "./pages/VotingInterface";
import ResultsDashboard from "./pages/ResultsDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AuditHistory from "./pages/AuditHistory";
import Treasury from "./pages/Treasury";

export default function App() {
  return (
    <Web3Provider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
          <Navbar />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/elections" element={<Elections />} />
                <Route path="/elections/:id" element={<ElectionDetails />} />
                <Route path="/voting" element={<VotingInterface />} />
                <Route path="/results" element={<ResultsDashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/audit" element={<AuditHistory />} />
                <Route path="/treasury" element={<Treasury />} />
              </Routes>
            </main>
          </div>
          <Notification />
        </div>
      </BrowserRouter>
    </Web3Provider>
  );
}
