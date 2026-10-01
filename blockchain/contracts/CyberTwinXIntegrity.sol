// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/*
 * CyberTwinX Integrity Contract
 *
 * This contract keeps a record of Merkle Roots for each incident.
 * It does not store the actual evidence files on the blockchain.
 * It also controls which wallet addresses are allowed to add new roots.
 */
contract CyberTwinXIntegrity {
    // Wallet address of the person who deployed this contract.
    address public owner;

    // Stores whether an investigator's wallet is allowed to add Merkle Roots.
    mapping(address => bool) private authorizedInvestigators;

    // Details saved each time a Merkle Root is added for an incident.
    struct RootRecord {
        bytes32 merkleRoot; // The Merkle Root used to check evidence integrity.
        uint256 timestamp;  // The time when this root was saved.
        address registrar;  // The wallet address that saved this root.
        string incidentId;  // The ID of the incident this root belongs to.
        uint256 version;    // The version number of this root for the incident.
    }

    // Keeps all Merkle Root records for each incident, including older versions.
    mapping(string => RootRecord[]) private rootHistory;

    // These events create a public blockchain record when investigator access changes.
    event InvestigatorAuthorized(address indexed investigator, address indexed authorizedBy);
    event InvestigatorRevoked(address indexed investigator, address indexed revokedBy);

    // This event is created whenever a new Merkle Root is saved.
    event MerkleRootAnchored(
        string indexed incidentId,
        bytes32 indexed merkleRoot,
        uint256 indexed version,
        uint256 timestamp,
        address registrar
    );

    // Allows only the contract owner to run a function.
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // Allows only the owner or an approved investigator to run a function.
    modifier onlyAuthorized() {
        require(isAuthorized(msg.sender), "Not authorized to anchor");
        _;
    }

    // Runs once when the contract is deployed and makes the deployer the owner.
    constructor() {
        owner = msg.sender;
    }

    /*
     * The owner uses this function to approve an investigator's wallet.
     * After approval, that investigator can save Merkle Roots.
     */
    function authorizeInvestigator(address investigator) external onlyOwner {
        require(investigator != address(0), "Invalid investigator address");
        require(!authorizedInvestigators[investigator], "Already authorized");

        authorizedInvestigators[investigator] = true;
        emit InvestigatorAuthorized(investigator, msg.sender);
    }

    /*
     * The owner uses this function to remove an investigator's access.
     * This does not delete or change any Merkle Roots saved earlier.
     */
    function revokeInvestigator(address investigator) external onlyOwner {
        require(investigator != address(0), "Invalid investigator address");
        require(authorizedInvestigators[investigator], "Not authorized");

        authorizedInvestigators[investigator] = false;
        emit InvestigatorRevoked(investigator, msg.sender);
    }

    // Returns true if the wallet belongs to the owner or an approved investigator.
    function isAuthorized(address account) public view returns (bool) {
        return account == owner || authorizedInvestigators[account];
    }

    /*
     * Saves a new Merkle Root for an incident.
     * Only the owner or an approved investigator can call this function.
     * Each new root gets the next version number. Older versions are kept.
     */
    function anchorMerkleRoot(
        string calldata incidentId,
        bytes32 merkleRoot
    ) external onlyAuthorized {
        require(bytes(incidentId).length > 0, "Incident ID required");
        require(merkleRoot != bytes32(0), "Merkle root required");

        uint256 version = rootHistory[incidentId].length + 1;

        rootHistory[incidentId].push(
            RootRecord({
                merkleRoot: merkleRoot,
                timestamp: block.timestamp,
                registrar: msg.sender,
                incidentId: incidentId,
                version: version
            })
        );

        emit MerkleRootAnchored(
            incidentId,
            merkleRoot,
            version,
            block.timestamp,
            msg.sender
        );
    }

    // Returns the newest Merkle Root saved for an incident and its details.
    function getLatestRoot(
        string calldata incidentId
    )
        external
        view
        returns (
            bytes32 merkleRoot,
            uint256 timestamp,
            address registrar,
            uint256 version
        )
    {
        uint256 historyLength = rootHistory[incidentId].length;

        require(historyLength > 0, "No root anchored");

        RootRecord storage latest =
            rootHistory[incidentId][historyLength - 1];

        return (
            latest.merkleRoot,
            latest.timestamp,
            latest.registrar,
            latest.version
        );
    }

    // Returns how many Merkle Root versions have been saved for an incident.
    function getRootHistoryLength(
        string calldata incidentId
    )
        external
        view
        returns (uint256)
    {
        return rootHistory[incidentId].length;
    }

    // Returns the saved details for one root version.
    // The index starts at 0, so index 0 means the first saved root.
    function getRootRecord(
        string calldata incidentId,
        uint256 index
    )
        external
        view
        returns (
            bytes32 merkleRoot,
            uint256 timestamp,
            address registrar,
            uint256 version
        )
    {
        require(
            index < rootHistory[incidentId].length,
            "Invalid history index"
        );

        RootRecord storage record =
            rootHistory[incidentId][index];

        return (
            record.merkleRoot,
            record.timestamp,
            record.registrar,
            record.version
        );
    }

    // Checks whether the given Merkle Root matches the latest saved root.
    function verifyMerkleRoot(
        string calldata incidentId,
        bytes32 merkleRoot
    )
        external
        view
        returns (bool)
    {
        uint256 historyLength = rootHistory[incidentId].length;

        if (historyLength == 0) {
            return false;
        }

        RootRecord storage latest =
            rootHistory[incidentId][historyLength - 1];

        return latest.merkleRoot == merkleRoot;
    }

    // Checks whether the given Merkle Root matches a particular saved version.
    function verifyHistoricalRoot(
        string calldata incidentId,
        uint256 version,
        bytes32 merkleRoot
    )
        external
        view
        returns (bool)
    {
        require(version > 0, "Invalid version");

        uint256 historyLength = rootHistory[incidentId].length;

        if (version > historyLength) {
            return false;
        }

        RootRecord storage record =
            rootHistory[incidentId][version - 1];

        return record.merkleRoot == merkleRoot;
    }

    // Returns true if at least one Merkle Root has been saved for this incident.
    function hasAnchoredRoot(
        string calldata incidentId
    )
        external
        view
        returns (bool)
    {
        return rootHistory[incidentId].length > 0;
    }
}
