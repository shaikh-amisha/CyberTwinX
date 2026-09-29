// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

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
        uint256 version,
        uint256 timestamp,
        address indexed registrar
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
        require(rootHistory[incidentId].length > 0, "No root anchored");

        RootRecord storage latest =
            rootHistory[incidentId][rootHistory[incidentId].length - 1];

        return (
            latest.merkleRoot,
            latest.timestamp,
            latest.registrar,
            latest.version
        );
    }

    function getRootHistoryLength(
        string calldata incidentId
    ) external view returns (uint256) {
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
        require(index < rootHistory[incidentId].length, "Invalid history index");

        RootRecord storage record = rootHistory[incidentId][index];

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
    ) external view returns (bool) {
        if (rootHistory[incidentId].length == 0) {
            return false;
        }

        RootRecord storage latest =
            rootHistory[incidentId][rootHistory[incidentId].length - 1];

        return latest.merkleRoot == merkleRoot;
    }
}
