const path = require("path");

/**
 * VoteChain 2.0 — Truffle Configuration
 *
 * Configured for:
 * - Ganache CLI (127.0.0.1:8545)
 * - Direct ABI & deployment artifact output into client/src/contracts/
 * - Solidity ^0.8.20 with optimizer enabled
 */
module.exports = {
  contracts_directory: "./contracts",
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),
  migrations_directory: "./migrations",

  networks: {
    // Default network — Ganache CLI on port 8545
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*", // Matches any Ganache network ID (5777 or 1337)
      gas: 6721975,
      gasPrice: 20000000000,
    },
  },

  mocha: {
    timeout: 100000,
    useColors: true,
  },

  compilers: {
    solc: {
      version: "0.8.20",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        evmVersion: "paris",
      },
    },
  },
};
