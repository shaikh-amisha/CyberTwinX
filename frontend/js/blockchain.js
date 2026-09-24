/* =========================================================
   CYBERTWIN
   BLOCKCHAIN EVIDENCE INTEGRITY
   ========================================================= */


/* =========================================================
   01. BLOCKCHAIN STATE
   ========================================================= */

const blockchainState = {

    endpoint: "SERVER-01",

    incident: "INC-001",

    securityState: "COMPROMISED",

    riskScore: 78,

    systemStatus: "ONLINE",


    checkpoint: {

        id: "CP-INC001-007",

        blockchainStatus: "CONFIRMED",

        verificationStatus: "VERIFIED",

        evidenceHash:
            "9f6c8e3d1a72b5e43d7a8c9b1f2e4a6c",

        merkleRoot:
            "8f91a2c7e4d6b9f0c42a1e7b5d3f8a6c",

        network:
            "CyberTwin Integrity Chain",

        blockNumber:
            "#0001842",

        timestamp:
            "2026-08-23 09:26:12",

        evidenceItems:
            4

    }

};


/* =========================================================
   02. DOM REFERENCES
   ========================================================= */

const elements = {

    /* Topbar */

    topbarEndpoint:
        document.getElementById(
            "topbarEndpoint"
        ),

    topbarIncident:
        document.getElementById(
            "topbarIncident"
        ),

    topbarState:
        document.getElementById(
            "topbarState"
        ),

    topbarRisk:
        document.getElementById(
            "topbarRisk"
        ),

    topbarSystemStatus:
        document.getElementById(
            "topbarSystemStatus"
        ),


    /* Sidebar */

    sidebarSystemStatus:
        document.getElementById(
            "sidebarSystemStatus"
        ),


    /* Header */

    verificationHeaderStatus:
        document.getElementById(
            "verificationHeaderStatus"
        ),


    /* Checkpoint */

    checkpointId:
        document.getElementById(
            "checkpointId"
        ),

    incidentId:
        document.getElementById(
            "incidentId"
        ),

    blockchainStatus:
        document.getElementById(
            "blockchainStatus"
        ),

    verificationStatus:
        document.getElementById(
            "verificationStatus"
        ),


    /* Cryptographic proof */

    evidenceHash:
        document.getElementById(
            "evidenceHash"
        ),

    merkleRoot:
        document.getElementById(
            "merkleRoot"
        ),


    /* Blockchain record */

    blockchainNetwork:
        document.getElementById(
            "blockchainNetwork"
        ),

    blockNumber:
        document.getElementById(
            "blockNumber"
        ),

    checkpointTimestamp:
        document.getElementById(
            "checkpointTimestamp"
        ),

    evidenceItemCount:
        document.getElementById(
            "evidenceItemCount"
        ),

    recordStatus:
        document.getElementById(
            "recordStatus"
        ),


    /* Verification */

    verificationResult:
        document.getElementById(
            "verificationResult"
        ),

    verificationMessage:
        document.getElementById(
            "verificationMessage"
        ),

    verifyCheckpointButton:
        document.getElementById(
            "verifyCheckpointButton"
        )

};


/* =========================================================
   03. SAFE TEXT UPDATE
   ========================================================= */

function setText(element, value) {

    if (!element) {
        return;
    }

    element.textContent = value;

}


/* =========================================================
   04. UPDATE TOPBAR
   ========================================================= */

function updateTopbar() {

    setText(
        elements.topbarEndpoint,
        blockchainState.endpoint
    );


    setText(
        elements.topbarIncident,
        blockchainState.incident
    );


    setText(
        elements.topbarState,
        blockchainState.securityState
    );


    setText(
        elements.topbarRisk,
        blockchainState.riskScore
    );


    setText(
        elements.topbarSystemStatus,
        blockchainState.systemStatus
    );


    setText(
        elements.sidebarSystemStatus,
        `SYSTEM ${blockchainState.systemStatus}`
    );

}


/* =========================================================
   05. UPDATE CHECKPOINT
   ========================================================= */

function updateCheckpoint() {

    const checkpoint =
        blockchainState.checkpoint;


    setText(
        elements.checkpointId,
        checkpoint.id
    );


    setText(
        elements.incidentId,
        blockchainState.incident
    );


    setText(
        elements.blockchainStatus,
        checkpoint.blockchainStatus
    );


    setText(
        elements.verificationStatus,
        checkpoint.verificationStatus
    );


    setText(
        elements.verificationHeaderStatus,
        checkpoint.verificationStatus
    );

}


/* =========================================================
   06. UPDATE CRYPTOGRAPHIC PROOF
   ========================================================= */

function updateCryptographicProof() {

    const checkpoint =
        blockchainState.checkpoint;


    /*
        Add a visual break to long hashes.
    */

    setText(
        elements.evidenceHash,
        checkpoint.evidenceHash
    );


    setText(
        elements.merkleRoot,
        checkpoint.merkleRoot
    );

}


/* =========================================================
   07. UPDATE BLOCKCHAIN RECORD
   ========================================================= */

function updateBlockchainRecord() {

    const checkpoint =
        blockchainState.checkpoint;


    setText(
        elements.blockchainNetwork,
        checkpoint.network
    );


    setText(
        elements.blockNumber,
        checkpoint.blockNumber
    );


    setText(
        elements.checkpointTimestamp,
        checkpoint.timestamp
    );


    setText(
        elements.evidenceItemCount,
        checkpoint.evidenceItems
    );


    setText(
        elements.recordStatus,
        checkpoint.blockchainStatus
    );

}


/* =========================================================
   08. VERIFY CHECKPOINT
   ========================================================= */

function verifyCheckpoint() {

    if (
        !elements.verifyCheckpointButton
    ) {

        return;

    }


    const button =
        elements.verifyCheckpointButton;


    button.disabled = true;

    button.textContent =
        "VERIFYING...";


    /*
        Simulate cryptographic verification.

        Later this will call the backend:

        POST /api/blockchain/verify
    */

    setTimeout(
        () => {

            /*
                Current frontend simulation assumes
                the calculated hash matches the stored
                checkpoint.
            */

            const integrityValid =
                true;


            if (integrityValid) {

                blockchainState.checkpoint
                    .verificationStatus =
                    "VERIFIED";


                setText(
                    elements.verificationResult,
                    "EVIDENCE VERIFIED"
                );


                setText(
                    elements.verificationStatus,
                    "VERIFIED"
                );


                setText(
                    elements.verificationHeaderStatus,
                    "VERIFIED"
                );


                setText(
                    elements.verificationMessage,

                    "The calculated evidence hash matches the recorded cryptographic checkpoint. No integrity mismatch was detected."
                );

            } else {

                blockchainState.checkpoint
                    .verificationStatus =
                    "MISMATCH";


                setText(
                    elements.verificationResult,
                    "INTEGRITY MISMATCH"
                );


                setText(
                    elements.verificationStatus,
                    "MISMATCH"
                );


                setText(
                    elements.verificationHeaderStatus,
                    "MISMATCH"
                );


                setText(
                    elements.verificationMessage,

                    "The calculated evidence hash does not match the recorded checkpoint."
                );

            }


            button.disabled = false;

            button.textContent =
                "Verify Checkpoint";


            console.log(
                "[CyberTwin] Checkpoint verification completed."
            );

        },

        900
    );

}


/* =========================================================
   09. INITIALIZE VERIFICATION
   ========================================================= */

function initializeVerification() {

    if (
        !elements.verifyCheckpointButton
    ) {

        return;

    }


    elements.verifyCheckpointButton
        .addEventListener(
            "click",
            verifyCheckpoint
        );

}


/* =========================================================
   10. NAVIGATION
   ========================================================= */

function initializeNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(item => {

        item.addEventListener(
            "click",
            function () {


                navItems.forEach(nav => {

                    nav.classList.remove(
                        "active"
                    );

                });


                this.classList.add(
                    "active"
                );

            }
        );

    });

}


/* =========================================================
   11. PAGE VISIBILITY
   ========================================================= */

function initializeVisibilityHandler() {

    document.addEventListener(
        "visibilitychange",
        function () {

            if (!document.hidden) {

                refreshBlockchainPage();

            }

        }
    );

}


/* =========================================================
   12. REFRESH
   ========================================================= */

function refreshBlockchainPage() {

    updateTopbar();

    updateCheckpoint();

    updateCryptographicProof();

    updateBlockchainRecord();

}


/* =========================================================
   13. INITIALIZE
   ========================================================= */

function initializeBlockchainPage() {

    console.log(
        "[CyberTwin] Blockchain Integrity initializing..."
    );


    refreshBlockchainPage();


    initializeVerification();


    initializeNavigation();


    initializeVisibilityHandler();


    console.log(
        "[CyberTwin] Blockchain Integrity initialized successfully."
    );

}


/* =========================================================
   14. START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeBlockchainPage
);