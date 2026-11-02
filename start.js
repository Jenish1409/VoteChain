#!/usr/bin/env node
/**
 * VoteChain 2.0 — Single-Command All-In-One Unified Launcher
 *
 * Usage:
 *   npm start
 *
 * What it does:
 *   1. Starts local Ganache CLI (10 deterministic accounts, 100 ETH each, Chain ID 1337, Port 8545)
 *   2. Displays all 10 Ganache accounts with their roles and private keys for MetaMask
 *   3. Compiles Solidity contracts & deploys them via Truffle migrations (truffle migrate --reset)
 *   4. Launches the React (Vite) web application
 *   5. Clean exit: pressing Ctrl + C terminates Ganache and Vite cleanly
 */

const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");

const ROOT = __dirname;
const CLIENT = path.join(ROOT, "client");

// Ganache deterministic accounts (identical every run with --deterministic)
const ACCOUNTS = [
  { idx: 0, address: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", key: "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d", role: "ADMIN / Contract Deployer" },
  { idx: 1, address: "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0", key: "0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1", role: "Voter 1 (Whitelisted)" },
  { idx: 2, address: "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b", key: "0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c", role: "Voter 2 (Whitelisted)" },
  { idx: 3, address: "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d", key: "0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913", role: "Voter 3 (Whitelisted)" },
  { idx: 4, address: "0xd03ea8624C8C5987235048901fB614fDcA89b117", key: "0xadd53f9a7e588d003326d1cbf9e4a43c061aadd9bc938c843a79e7b4fd2ad743", role: "Treasury Recipient EOA" },
  { idx: 5, address: "0x95cED938F7991cd0dFcb48F0a06a40FA1aF46EBC", key: "0x395df67f0c2d2d9fe1ad08d1bc8b6627011959b79c53d7dd6a3536a33ab8a4fd", role: "Voter 5" },
  { idx: 6, address: "0x3E5e9111Ae8eB78Fe1CC3bb8915d5D461F3Ef9A9", key: "0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52", role: "Voter 6" },
  { idx: 7, address: "0x28a8746e75304c0780E011BEd21C72cD78cd535E", key: "0xa453611d9419d0e56f499079478fd72c37b251a94bfde4d19872c44cf65386e3", role: "Voter 7" },
  { idx: 8, address: "0xACa94ef8bD5ffEE41947b4585a84BdA5a3d3DA6E", key: "0x829e924fdf021ba3dbbc4225edfece9aca04b929d6e75613329ca6f1d31c0bb4", role: "Voter 8" },
  { idx: 9, address: "0x1dF62f291b2E969fB0849d99D9Ce41e2F137006e", key: "0xb0057716d5917badaf911b193b12b910811c1497b5bada8d7711f758981c3773", role: "Voter 9" },
];

const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function log(color, prefix, msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`${DIM}[${ts}]${RESET} ${color}${BOLD}[${prefix}]${RESET} ${msg}`);
}

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-pid, "SIGTERM");
    }
  } catch {}
}

function probeGanacheRPC() {
  return new Promise((resolve) => {
    const body = JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 });
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 8545,
        method: "POST",
        timeout: 1000,
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(Boolean(parsed.result !== undefined));
          } catch {
            resolve(false);
          }
        });
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.write(body);
    req.end();
  });
}

function runCommand(command, args, cwd, label) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd, shell: true, stdio: "inherit" });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        log(RED, label, `Command failed with exit code ${code}`);
        reject(new Error(`${label} execution failed`));
      }
    });
  });
}

async function main() {
  console.log();
  console.log(`${CYAN}${BOLD}╔════════════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║              🗳️   VoteChain 2.0 — All-In-One Unified Launcher               ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚════════════════════════════════════════════════════════════════════════════╝${RESET}`);
  console.log();

  let ganacheProc = null;
  let viteProc = null;

  // 1. Check or start Ganache CLI
  log(CYAN, "GANACHE", "Checking local blockchain on http://127.0.0.1:8545...");
  const alreadyRunning = await probeGanacheRPC();

  if (alreadyRunning) {
    log(GREEN, "GANACHE", "Detected active Ganache instance on port 8545 ✓");
  } else {
    log(CYAN, "GANACHE", "Starting Ganache CLI (10 accounts, 100 ETH, Network ID 1337)...");

    await new Promise((resolve, reject) => {
      ganacheProc = spawn(
        "npx",
        ["ganache", "--port", "8545", "--deterministic", "--accounts", "10", "--defaultBalanceEther", "100", "--networkId", "1337"],
        { cwd: ROOT, shell: true, stdio: ["ignore", "pipe", "pipe"] }
      );

      let isReady = false;
      let errorLogs = "";

      ganacheProc.stdout.on("data", (d) => {
        const str = d.toString();
        if (!isReady && str.includes("RPC Listening on")) {
          isReady = true;
          log(GREEN, "GANACHE", "Ganache CLI is ready and listening on port 8545 ✓");
          resolve();
        }
      });

      ganacheProc.stderr.on("data", (d) => {
        errorLogs += d.toString();
      });

      ganacheProc.on("close", (code) => {
        if (!isReady) {
          log(RED, "GANACHE", `Ganache exited unexpectedly with code ${code}`);
          if (errorLogs.trim()) console.error(errorLogs);
          reject(new Error("Ganache process exited before becoming ready"));
        }
      });

      setTimeout(() => {
        if (!isReady) {
          probeGanacheRPC().then((ok) => {
            if (ok) {
              isReady = true;
              log(GREEN, "GANACHE", "Ganache RPC is responding ✓");
              resolve();
            } else {
              reject(new Error("Ganache startup timed out"));
            }
          });
        }
      }, 10000);
    });
  }

  // 2. Display Accounts & Keys Table
  console.log();
  console.log(`${YELLOW}${BOLD}┌────────────────────────────────────────────────────────────────────────────┐${RESET}`);
  console.log(`${YELLOW}${BOLD}│       Ganache Accounts & Private Keys (Import into MetaMask)               │${RESET}`);
  console.log(`${YELLOW}${BOLD}└────────────────────────────────────────────────────────────────────────────┘${RESET}`);
  for (const a of ACCOUNTS) {
    const roleTag = a.idx === 0 ? `${GREEN}${BOLD}[${a.role}]${RESET}` : `${DIM}[${a.role}]${RESET}`;
    console.log(`  ${BOLD}Account #${a.idx}${RESET} ${roleTag}`);
    console.log(`    Address:     ${CYAN}${a.address}${RESET}`);
    console.log(`    Private Key: ${DIM}${a.key}${RESET}`);
  }
  console.log(`${YELLOW}${BOLD}────────────────────────────────────────────────────────────────────────────${RESET}`);
  console.log();

  // 3. Deploy Contracts (truffle migrate --reset)
  log(CYAN, "TRUFFLE", "Compiling & Deploying smart contracts (truffle migrate --reset)...");
  await runCommand("npx", ["truffle", "migrate", "--reset"], ROOT, "MIGRATE");
  log(GREEN, "TRUFFLE", "Contracts deployed successfully to Ganache ✓");
  console.log();

  // 4. Print Ready Banner
  console.log(`${GREEN}${BOLD}╔════════════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${GREEN}${BOLD}║  ✅  VoteChain 2.0 Blockchain is Fully Initialized!                        ║${RESET}`);
  console.log(`${GREEN}${BOLD}║                                                                            ║${RESET}`);
  console.log(`${GREEN}${BOLD}║  ⛓️   Ganache RPC:       ${CYAN}${BOLD}${"http://127.0.0.1:8545 (Chain ID: 1337)".padEnd(46)}${GREEN}${BOLD}║${RESET}`);
  console.log(`${GREEN}${BOLD}║  🔑  Admin Account:     ${CYAN}${BOLD}${"Account #0 (0x90F8bf...a8c9C1)".padEnd(46)}${GREEN}${BOLD}║${RESET}`);
  console.log(`${GREEN}${BOLD}║  🌐  Starting React:    ${CYAN}${BOLD}${"http://localhost:5173".padEnd(46)}${GREEN}${BOLD}║${RESET}`);
  console.log(`${GREEN}${BOLD}║                                                                            ║${RESET}`);
  console.log(`${GREEN}${BOLD}║  👉  Press Ctrl + C anytime in this terminal to stop all services.         ║${RESET}`);
  console.log(`${GREEN}${BOLD}╚════════════════════════════════════════════════════════════════════════════╝${RESET}`);
  console.log();

  // 5. Start React Dev Server (Vite) with inherited stdio
  log(CYAN, "FRONTEND", "Starting Vite development server...");
  viteProc = spawn("npm", ["run", "dev"], { cwd: CLIENT, shell: true, stdio: "inherit" });

  // Graceful shutdown on Ctrl+C
  const shutdown = () => {
    console.log();
    log(YELLOW, "SHUTDOWN", "Shutting down VoteChain 2.0 services...");
    if (viteProc) killProcessTree(viteProc.pid);
    if (ganacheProc) killProcessTree(ganacheProc.pid);
    setTimeout(() => process.exit(0), 1000);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(`${RED}${BOLD}[FATAL ERROR]${RESET} ${err.message}`);
  process.exit(1);
});
