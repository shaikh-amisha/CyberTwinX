// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/**
 * @title CyberTwinXIntegrity
 * @notice On-chain integrity anchor for CyberTwinX incident evidence.
 *
 * The contract stores Merkle Roots rather than raw evidence.
 * Evidence hashing, Merkle Tree construction, detailed custody history,
 * and operational metadata are handled off-chain.
 *
 * Access control:
 * - The deployer becomes the contract owner.
 * - The owner can authorize and revoke investigator addresses.
 * - The owner and authorized investigators can anchor Merkle Roots.
 */
contract CyberTwinXIntegrity {
    address public owner;

    mapping(address => bool) private authorizedInvestigators;

    struct RootRecord {
        bytes32 merkleRoot;
        uint256 timestamp;
        address registrar;
        string incidentId;
        uint256 version;
    }

    mapping(string => RootRecord[]) private rootHistory;

    event InvestigatorAuthorized(address indexed investigator, address indexed authorizedBy);
    event InvestigatorRevoked(address indexed investigator, address indexed revokedBy);

    event MerkleRootAnchored(
        string indexed incidentId,
        bytes32 indexed merkleRoot,
        uint256 indexed version,
        uint256 timestamp,
        address registrar
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAuthorized() {
        require(isAuthorized(msg.sender), "Not authorized to anchor");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Authorize an investigator to register Merkle Roots.
     * @dev Only the contract owner can grant this permission.
     */
    function authorizeInvestigator(address investigator) external onlyOwner {
        require(investigator != address(0), "Invalid investigator address");
        require(!authorizedInvestigators[investigator], "Already authorized");

        authorizedInvestigators[investigator] = true;
        emit InvestigatorAuthorized(investigator, msg.sender);
    }

    /**
     * @notice Revoke an investigator's permission to register Merkle Roots.
     * @dev Existing Merkle Root history is not modified.
     */
    function revokeInvestigator(address investigator) external onlyOwner {
        require(investigator != address(0), "Invalid investigator address");
        require(authorizedInvestigators[investigator], "Not authorized");

        authorizedInvestigators[investigator] = false;
        emit InvestigatorRevoked(investigator, msg.sender);
    }

    /**
     * @notice Check whether an address can register Merkle Roots.
     * @dev The owner is always authorized.
     */
    function isAuthorized(address account) public view returns (bool) {
        return account == owner || authorizedInvestigators[account];
    }

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

    function getRootHistoryLength(
        string calldata incidentId
    )
        external
        view
        returns (uint256)
    {
        return rootHistory[incidentId].length;
    }

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
