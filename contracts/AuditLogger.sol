// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AuditLogger
 * @notice Immutable, tamper-evident on-chain audit trail contract for VoteChain 2.0.
 * @dev Accepts state-changing log entries exclusively from the authorized ElectionManager contract.
 *      Does not store sensitive personal identity information on-chain.
 */
contract AuditLogger {
    struct AuditRecord {
        uint256 auditId;
        uint256 electionId;
        string actionType;
        address actor;
        uint256 timestamp;
        string details;
    }

    address public owner;
    address public authorizedCaller;
    uint256 public auditCount;

    // 1-indexed mapping: auditId (1..auditCount) => AuditRecord
    mapping(uint256 => AuditRecord) private auditRecords;

    // Election-specific index: electionId => array of auditIds
    mapping(uint256 => uint256[]) private electionAuditIds;

    event AuthorizedCallerUpdated(
        address indexed previousCaller,
        address indexed newCaller
    );

    event AuditEntryRecorded(
        uint256 indexed auditId,
        uint256 indexed electionId,
        string actionType,
        address indexed actor,
        uint256 timestamp,
        string details
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "AuditLogger: Caller is not the owner");
        _;
    }

    modifier onlyAuthorizedCaller() {
        require(
            msg.sender == authorizedCaller,
            "AuditLogger: Caller is not the authorized ElectionManager contract"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        auditCount = 0;
    }

    /**
     * @notice Sets or updates the authorized ElectionManager contract address.
     * @param _caller Address of the deployed ElectionManager smart contract.
     */
    function setAuthorizedCaller(address _caller) external onlyOwner {
        require(
            _caller != address(0),
            "AuditLogger: Authorized caller cannot be zero address"
        );
        address previousCaller = authorizedCaller;
        authorizedCaller = _caller;
        emit AuthorizedCallerUpdated(previousCaller, _caller);
    }

    /**
     * @notice Records an auditable election or treasury event on-chain.
     * @dev Can only be called by the authorized ElectionManager contract.
     * @param _electionId Associated election ID (0 for global/treasury events).
     * @param _actionType Standardized event category (e.g., "ELECTION_CREATED", "VOTE_CAST").
     * @param _actor Wallet address that initiated the transaction.
     * @param _details Concise, non-sensitive description of the action.
     * @return newAuditId The sequential ID assigned to the newly created audit record.
     */
    function logAction(
        uint256 _electionId,
        string calldata _actionType,
        address _actor,
        string calldata _details
    ) external onlyAuthorizedCaller returns (uint256 newAuditId) {
        require(
            bytes(_actionType).length > 0,
            "AuditLogger: Action type cannot be empty"
        );
        require(
            _actor != address(0),
            "AuditLogger: Actor address cannot be zero"
        );

        auditCount += 1;
        newAuditId = auditCount;

        AuditRecord memory record = AuditRecord({
            auditId: newAuditId,
            electionId: _electionId,
            actionType: _actionType,
            actor: _actor,
            timestamp: block.timestamp,
            details: _details
        });

        auditRecords[newAuditId] = record;
        electionAuditIds[_electionId].push(newAuditId);

        emit AuditEntryRecorded(
            newAuditId,
            _electionId,
            _actionType,
            _actor,
            block.timestamp,
            _details
        );

        return newAuditId;
    }

    /**
     * @notice Retrieves a single audit record by its 1-indexed ID.
     */
    function getAuditRecord(
        uint256 _auditId
    ) external view returns (AuditRecord memory) {
        require(
            _auditId > 0 && _auditId <= auditCount,
            "AuditLogger: Invalid audit record ID"
        );
        return auditRecords[_auditId];
    }

    /**
     * @notice Retrieves all audit records stored in the contract.
     */
    function getAllAuditRecords()
        external
        view
        returns (AuditRecord[] memory)
    {
        AuditRecord[] memory allRecords = new AuditRecord[](auditCount);
        for (uint256 i = 1; i <= auditCount; i++) {
            allRecords[i - 1] = auditRecords[i];
        }
        return allRecords;
    }

    /**
     * @notice Retrieves all audit records associated with a specific election ID (or 0 for treasury).
     */
    function getElectionAuditRecords(
        uint256 _electionId
    ) external view returns (AuditRecord[] memory) {
        uint256[] storage ids = electionAuditIds[_electionId];
        AuditRecord[] memory filtered = new AuditRecord[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            filtered[i] = auditRecords[ids[i]];
        }
        return filtered;
    }
}
