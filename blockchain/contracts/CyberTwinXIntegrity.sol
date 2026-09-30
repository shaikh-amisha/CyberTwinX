// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/**
 * @title CyberTwinXIntegrity
 * @notice On-chain integrity anchor for CyberTwinX incident evidence.
 *
 * The contract stores Merkle Roots rather than raw evidence.
 * Evidence hashing, Merkle Tree construction, detailed custody history,
 * and operational metadata are handled off-chain.
 */
contract CyberTwinXIntegrity {

    // =============================================================
    // STRUCTS
    // =============================================================

    /**
     * @dev Represents one anchored Merkle Root version for an incident.
     */
    struct RootRecord {
        bytes32 merkleRoot;
        uint256 timestamp;
        address registrar;
        string incidentId;
        uint256 version;
    }

    // =============================================================
    // STORAGE
    // =============================================================

    /**
     * @dev Historical Merkle Roots for each incident.
     *
     * incidentId => [V1, V2, V3, ...]
     *
     * Previous records are never overwritten.
     */
    mapping(string => RootRecord[]) private rootHistory;

    // =============================================================
    // EVENTS
    // =============================================================

    /**
     * @dev Emitted whenever a new Merkle Root is anchored.
     */
    event MerkleRootAnchored(
        string indexed incidentId,
        bytes32 indexed merkleRoot,
        uint256 indexed version,
        uint256 timestamp,
        address registrar
    );

    // =============================================================
    // ROOT ANCHORING
    // =============================================================

    /**
     * @notice Anchor a new Merkle Root for an incident.
     *
     * @param incidentId Unique CyberTwinX incident identifier.
     * @param merkleRoot SHA-256/Merkle-derived root represented as bytes32.
     *
     * A new version is automatically created for every anchor.
     */
    function anchorMerkleRoot(
        string calldata incidentId,
        bytes32 merkleRoot
    ) external {
        require(
            bytes(incidentId).length > 0,
            "Incident ID required"
        );

        require(
            merkleRoot != bytes32(0),
            "Merkle root required"
        );

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

    // =============================================================
    // LATEST ROOT
    // =============================================================

    /**
     * @notice Retrieve the latest anchored Merkle Root.
     *
     * @param incidentId Incident identifier.
     *
     * @return merkleRoot Latest Merkle Root.
     * @return timestamp Time at which it was anchored.
     * @return registrar Address that anchored it.
     * @return version Root version.
     */
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

        require(
            historyLength > 0,
            "No root anchored"
        );

        RootRecord storage latest =
            rootHistory[incidentId][historyLength - 1];

        return (
            latest.merkleRoot,
            latest.timestamp,
            latest.registrar,
            latest.version
        );
    }

    // =============================================================
    // ROOT HISTORY
    // =============================================================

    /**
     * @notice Return the number of root versions for an incident.
     *
     * @param incidentId Incident identifier.
     */
    function getRootHistoryLength(
        string calldata incidentId
    )
        external
        view
        returns (uint256)
    {
        return rootHistory[incidentId].length;
    }

    /**
     * @notice Retrieve a specific historical root record.
     *
     * @param incidentId Incident identifier.
     * @param index Zero-based history index.
     *
     * Example:
     * index 0 = V1
     * index 1 = V2
     * index 2 = V3
     */
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

    // =============================================================
    // ROOT VERIFICATION
    // =============================================================

    /**
     * @notice Verify whether a supplied Merkle Root matches
     *         the latest root anchored for an incident.
     *
     * @param incidentId Incident identifier.
     * @param merkleRoot Root being verified.
     *
     * @return True if the supplied root matches the latest
     *         anchored root, otherwise false.
     */
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

    // =============================================================
    // HISTORICAL ROOT VERIFICATION
    // =============================================================

    /**
     * @notice Verify a supplied Merkle Root against a specific
     *         historical version.
     *
     * @param incidentId Incident identifier.
     * @param version Root version to verify.
     * @param merkleRoot Root being verified.
     *
     * @return True if the supplied root matches that version.
     */
    function verifyHistoricalRoot(
        string calldata incidentId,
        uint256 version,
        bytes32 merkleRoot
    )
        external
        view
        returns (bool)
    {
        require(
            version > 0,
            "Invalid version"
        );

        uint256 historyLength = rootHistory[incidentId].length;

        if (version > historyLength) {
            return false;
        }

        RootRecord storage record =
            rootHistory[incidentId][version - 1];

        return record.merkleRoot == merkleRoot;
    }

    // =============================================================
    // ROOT EXISTENCE
    // =============================================================

    /**
     * @notice Check whether an incident has at least one
     *         anchored Merkle Root.
     *
     * @param incidentId Incident identifier.
     */
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
