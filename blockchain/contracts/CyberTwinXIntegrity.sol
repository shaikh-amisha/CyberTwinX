//SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract CyberTwinXIntegrity{
    
    //STRUCTS: it represents one anchored merkle root version for an incident

    struct RootRecord{
        bytes32 merkleRoot;
        uint256 timestamp;
        address registrar;
        string incidentId;
        uint256 version;
    }

    //STORAGE: previous records are never overwritten

    mapping(string => RootRecord[]) private rootHistory;

    //EVENTS: Emitted whenevr a new merkle root is anchored

    event MerkleRootAnchored(
        string indexed incidentId,
        bytes32 indexed merkleRoot,
        uint256 indexed version,
        uint256 timestamp,
        address registrar
    );

    //ROOT ANCHORING: It anchors new merkle root for an Incident. 

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

        uint256 version =
        rootHistory[incidentId].length +1;

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

    //LATEST ROOT: 
    /**
     * notice Retrieve the latest anchored Merkle Root.
     *
     * incidentId Incident identifier.
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
            address registrat,
            uint256 version
        )

    {
        uint256 HistoryLength =
        rootHistory[incidentId].length;

        require(
            historyLength >0,
            "No root anchored"

        );

        RootRecord storage latest =
            rootHistory[incidentI][historyLength -1];

        return (
            latest.merkleRoot,
            latest.timestamp,
            latest.registrar,
            latest.version
        );            
    }     

    // ROOT HISTORY: return the no. of root versions for an incident

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

        RootRecord storage record = rootHistory[incidentId][index];

        return (
            record.merkleRoot,
            record.timestamp,
            record.registrar,
            record.version
        );
    }    

    //ROOT VERIFICATION
    /**
     * Verify whether a supplied Merkle Root matches
     *         the latest root anchored for an incident.
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
        uint256 historyLength= rootHistory[incidentId].length;

        if (historyLength == 0){
            return false;
        }

        RootRecord storage latest = rootHistory[incidentId][historyLength -1];

        return latest.merkleRoot == merkleRoot;
    }    

    // HISTORICAL ROOT VERIFICATION: verify a supplied Merkle Root against a specific historical version
    function verifyHistoricalRoot(
        string calldata incidentId,
        uint256 version,
        bytes32 merkleRoot
    )
        external
        view
        returns(bool)
    {
        require(
            version > 0,
            "Invalid version:
        );

        uint256 historyLength = rootHistory[incidentId].length;
        
        if (version > historyLength) {
            return false;
        }

        RootRecord storage record = rootHistory[incidentId][version -1];
        return record.merkleRoot == merkleRoot;
    }       

    //ROOT EXISTENCE: check whether an incident has atleast one anchored merkle root. 

    function hasAnchoredRott(
        string calldata incidentId
    )
        external
        view
        returns(bool)
    {
        return rootHistory[incidentId].length > 0;
    }   
}     

