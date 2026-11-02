const AuditLogger = artifacts.require("AuditLogger");
const ElectionManager = artifacts.require("ElectionManager");

/**
 * 2_deploy_contracts.js
 *
 * Deployment sequence to avoid circular dependencies:
 * 1. Deploy AuditLogger (deployer is set as owner).
 * 2. Deploy ElectionManager with AuditLogger's deployed address.
 * 3. Call auditLogger.setAuthorizedCaller(electionManager.address) so only
 *    ElectionManager can record on-chain audit events.
 */
module.exports = async function (deployer, network, accounts) {
  const adminAccount = accounts[0];

  console.log("------------------------------------------------------------");
  console.log("Deploying VoteChain 2.0 Smart Contracts...");
  console.log("Administrator / Deployer Account:", adminAccount);

  // Step 1: Deploy AuditLogger
  await deployer.deploy(AuditLogger, { from: adminAccount });
  const auditLoggerInstance = await AuditLogger.deployed();
  console.log("1. AuditLogger deployed at:", auditLoggerInstance.address);

  // Step 2: Deploy ElectionManager passing AuditLogger address to constructor
  await deployer.deploy(ElectionManager, auditLoggerInstance.address, {
    from: adminAccount,
  });
  const electionManagerInstance = await ElectionManager.deployed();
  console.log(
    "2. ElectionManager deployed at:",
    electionManagerInstance.address
  );

  // Step 3: Authorize ElectionManager inside AuditLogger
  await auditLoggerInstance.setAuthorizedCaller(
    electionManagerInstance.address,
    { from: adminAccount }
  );
  console.log(
    "3. AuditLogger authorizedCaller configured to ElectionManager:",
    electionManagerInstance.address
  );
  console.log("------------------------------------------------------------");
};
