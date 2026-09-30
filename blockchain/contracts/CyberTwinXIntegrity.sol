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

    struct RootRecord {
        bytes32 merkleRoot;
        uint256 timestamp;
        address registrar;
        string incidentId;
        uint256 version;
    }

    mapping(string => RootRecord[]) private rootHistory;

    event MerkleRootAnchored(
        string indexed incidentId,
        bytes32 indexed merkleRoot,
        uint256 indexed version,
        uint256 timestamp,
        address registrar
    );

    function anchorMerkleRoot(
        string calldata incidentId,
        bytes32 merkleRoot
    ) external {
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
