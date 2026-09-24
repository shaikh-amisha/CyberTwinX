/**
 * CyberTwinX
 * Detection Engine
 *
 * Analyzes normalized endpoint telemetry
 * and produces security findings.
 */


/* =====================================================
   AUTHENTICATION DETECTION
   ===================================================== */

function analyzeAuthentication(authentication) {

    const findings = [];

    if (!authentication) {
        return findings;
    }

    const events = Array.isArray(authentication.events)
        ? authentication.events
        : [];

    let failedAuthenticationCount = 0;
    let userModificationCount = 0;
    let privilegeActivityCount = 0;
    let privilegeEscalationCount = 0;


    for (const event of events) {

        const message =
            event?.raw_message ||
            event?.message ||
            "";


        /* =========================================
           FAILED AUTHENTICATION
           ========================================== */

        if (
            /failed password/i.test(message) ||
            /authentication failure/i.test(message) ||
            /failed login/i.test(message) ||
            /invalid user/i.test(message)
        ) {

            failedAuthenticationCount++;

        }


        /* =========================================
           USER ACCOUNT MODIFICATION
           ========================================== */

        if (
            /useradd/i.test(message) ||
            /userdel/i.test(message) ||
            /adduser/i.test(message) ||
            /deluser/i.test(message)
        ) {

            userModificationCount++;

        }


        /* =========================================
           PRIVILEGE ACTIVITY
           ========================================== */

        if (
            /\bsudo:/i.test(message) ||
            /session opened for user root/i.test(message)
        ) {

            privilegeActivityCount++;

        }


        /* =========================================
           PRIVILEGE ESCALATION
           ========================================== */

        if (
            /sudo:.*USER=root/i.test(message) ||
            /session opened for user root/i.test(message)
        ) {

            privilegeEscalationCount++;

        }

    }


    /* =============================================
       FAILED AUTHENTICATION FINDING
       ============================================== */

    if (failedAuthenticationCount >= 5) {

        findings.push({

            type: "AUTHENTICATION_FAILURE",

            severity: "HIGH",

            count: failedAuthenticationCount,

            description:
                `Multiple failed authentication attempts detected (${failedAuthenticationCount}).`

        });

    }

    else if (failedAuthenticationCount > 0) {

        findings.push({

            type: "AUTHENTICATION_FAILURE",

            severity: "MEDIUM",

            count: failedAuthenticationCount,

            description:
                `Failed authentication attempt detected (${failedAuthenticationCount}).`

        });

    }


    /* =============================================
       USER MODIFICATION FINDING
       ============================================== */

    if (userModificationCount > 0) {

        findings.push({

            type: "USER_ACCOUNT_MODIFICATION",

            severity: "MEDIUM",

            count: userModificationCount,

            description:
                `User account modification activity detected (${userModificationCount}).`

        });

    }


    /* =============================================
       PRIVILEGE ACTIVITY FINDING
       ============================================== */

    if (privilegeActivityCount > 0) {

        findings.push({

            type: "PRIVILEGED_ACTIVITY",

            severity: "LOW",

            count: privilegeActivityCount,

            description:
                `Privileged activity detected (${privilegeActivityCount} events).`

        });

    }


    /* =============================================
       PRIVILEGE ESCALATION FINDING
       ============================================== */

    if (privilegeEscalationCount > 0) {

        findings.push({

            type: "PRIVILEGE_ESCALATION",

            severity: "HIGH",

            count: privilegeEscalationCount,

            description:
                `Potential privilege escalation activity detected (${privilegeEscalationCount} events).`

        });

    }


    return findings;

}


/* =====================================================
   PROCESS DETECTION
   ===================================================== */

function analyzeProcesses(processes) {

    const findings = [];

    if (!processes) {
        return findings;
    }


    const processCount =
        processes.count ||
        processes.process_count ||
        processes.processCount ||
        0;


    /*
     * Current agent provides aggregate
     * process count.
     */

    if (processCount >= 500) {

        findings.push({

            type: "PROCESS_ANOMALY",

            severity: "MEDIUM",

            count: processCount,

            description:
                `Unusually high process count detected (${processCount}).`

        });

    }


    return findings;

}


/* =====================================================
   NETWORK DETECTION
   ===================================================== */

function analyzeNetwork(network) {

    const findings = [];

    if (!network) {
        return findings;
    }


    const connectionCount =
        network.connections ||
        network.connection_count ||
        network.connectionCount ||
        0;


    /*
     * Current agent provides aggregate
     * connection count.
     */

    if (connectionCount >= 100) {

        findings.push({

            type: "NETWORK_ANOMALY",

            severity: "MEDIUM",

            count: connectionCount,

            description:
                `Unusually high network connection count detected (${connectionCount}).`

        });

    }


    return findings;

}


/* =====================================================
   LOG DETECTION
   ===================================================== */

function analyzeLogs(logs) {

    const findings = [];

    if (!logs) {
        return findings;
    }


    const logCount =
        logs.count ||
        logs.log_count ||
        logs.logCount ||
        0;


    /*
     * Current agent provides aggregate
     * log count.
     */

    if (logCount >= 500) {

        findings.push({

            type: "LOG_ANOMALY",

            severity: "MEDIUM",

            count: logCount,

            description:
                `Unusually high log volume detected (${logCount}).`

        });

    }


    return findings;

}


/* =====================================================
   DETECTION ENGINE
   ===================================================== */

function detectThreats(telemetry) {

    const findings = [];


    /* ---------------------------------------------
       Authentication
    --------------------------------------------- */

    findings.push(
        ...analyzeAuthentication(
            telemetry?.authentication
        )
    );


    /* ---------------------------------------------
       Processes
    --------------------------------------------- */

    findings.push(
        ...analyzeProcesses(
            telemetry?.processes
        )
    );


    /* ---------------------------------------------
       Network
    --------------------------------------------- */

    findings.push(
        ...analyzeNetwork(
            telemetry?.network
        )
    );


    /* ---------------------------------------------
       Logs
    --------------------------------------------- */

    findings.push(
        ...analyzeLogs(
            telemetry?.logs
        )
    );


    return findings;

}


/* =====================================================
   EXPORTS
   ===================================================== */

module.exports = {

    detectThreats,

    analyzeAuthentication,

    analyzeProcesses,

    analyzeNetwork,

    analyzeLogs

};