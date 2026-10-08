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

/* =====================================================
   CYBERTWINX ATTACK DETECTION V2
   12 telemetry-driven behaviours
   ===================================================== */

function arr(value) {
    return Array.isArray(value) ? value : [];
}

function str(value) {
    return String(value ?? "");
}

function msg(event) {
    return str(
        event?.raw_message ||
        event?.message ||
        event?.command ||
        event?.cmd ||
        event?.details ||
        ""
    );
}

function username(event) {
    return str(
        event?.username ||
        event?.user ||
        event?.account ||
        ""
    );
}

function processEvents(processes) {
    return arr(
        processes?.events ||
        processes?.list ||
        processes?.processes
    );
}

function networkEvents(network) {
    const explicitEvents =
        network?.connections_list ||
        network?.connection_list ||
        network?.connections_detail ||
        network?.events;

    if (Array.isArray(explicitEvents)) {
        return explicitEvents;
    }

    // The CyberTwin Linux Agent sends live connections as:
    // {
    //   connections: [
    //     {
    //       status,
    //       local_address: { ip, port },
    //       remote_address: { ip, port },
    //       pid
    //     }
    //   ]
    // }
    // Normalize that shape so network detections can consume the
    // actual agent telemetry instead of expecting a different schema.
    if (Array.isArray(network?.connections)) {
        return network.connections.map(connection => ({
            ...connection,
            local_ip: connection?.local_address?.ip,
            local_port: connection?.local_address?.port,
            remote_ip: connection?.remote_address?.ip,
            remote_port: connection?.remote_address?.port,
            destination_ip: connection?.remote_address?.ip,
            destination_port: connection?.remote_address?.port
        }));
    }

    return [];
}

function finding(type, severity, count, description, extra = {}) {
    return {
        type,
        severity,
        count,
        description,
        ...extra
    };
}

/* 01 — Brute Force */
function detectBruteForceV2(authentication) {
    const events = arr(authentication?.events);
    const failed = events.filter(e =>
        /failed password|authentication failure|failed login|invalid user/i.test(msg(e))
    );

    if (failed.length < 10) return null;

    return finding(
        "BRUTE_FORCE",
        "HIGH",
        failed.length,
        "Repeated authentication failures detected (" + failed.length + " events).",
        { category: "IDENTITY_CREDENTIAL", evidenceType: "AUTHENTICATION" }
    );
}

/* 02 — Password Spraying */
function detectPasswordSprayingV2(authentication) {
    const events = arr(authentication?.events);
    const failed = events.filter(e =>
        /failed password|authentication failure|failed login|invalid user/i.test(msg(e))
    );

    const accounts = new Set();

    for (const event of failed) {
        const account = username(event).toLowerCase();
        if (account) accounts.add(account);
    }

    if (failed.length < 8 || accounts.size < 3) return null;

    return finding(
        "PASSWORD_SPRAYING",
        "HIGH",
        failed.length,
        "Authentication failures were observed across " + accounts.size + " accounts.",
        {
            category: "IDENTITY_CREDENTIAL",
            evidenceType: "AUTHENTICATION",
            affectedAccounts: accounts.size
        }
    );
}

/* 03 — User Account Manipulation */
function detectUserAccountManipulationV2(authentication) {
    const events = arr(authentication?.events);
    const matches = events.filter(e =>
        /useradd|userdel|adduser|deluser|usermod|groupadd|groupdel|gpasswd/i.test(msg(e))
    );

    if (!matches.length) return null;

    return finding(
        "USER_ACCOUNT_MANIPULATION",
        "MEDIUM",
        matches.length,
        "Account or group modification activity detected (" + matches.length + " events).",
        { category: "IDENTITY_CREDENTIAL", evidenceType: "AUTHENTICATION" }
    );
}

/* 04 — Privilege Escalation */
function detectPrivilegeEscalationV2(authentication, processes) {
    const authEvents = arr(authentication?.events);

    const sudoEvents = authEvents.filter(e =>
        /sudo:.*USER=root|session opened for user root|sudo.*COMMAND=/i.test(msg(e))
    );

    const count = sudoEvents.length;

    if (!count) return null;

    return finding(
        "PRIVILEGE_ESCALATION",
        "HIGH",
        count,
        "Privileged execution associated with root access was detected (" + count + " events).",
        { category: "PRIVILEGE_ESCALATION", evidenceType: "PRIVILEGE" }
    );
}

/* 05 — Suspicious Process / Malware-like Execution */
function detectSuspiciousProcessExecutionV2(processes) {
    const events = processEvents(processes);

    const matches = events.filter(p => {
        const name = str(p?.name || p?.process_name || p?.exe || p?.executable).toLowerCase();
        const command = str(p?.cmdline || p?.command || p?.command_line || p?.cmd).toLowerCase();
        const path = str(p?.exe || p?.executable || p?.path).toLowerCase();

        const suspiciousLocation =
            /\/tmp\/|\/var\/tmp\/|\/dev\/shm\/|\/run\/user\//.test(path);

        const suspiciousInterpreter =
            /(^|\s)(bash|sh|zsh|dash|python|python3|perl|ruby|php|node)(\s|$)/.test(name) &&
            /-c|base64|curl\s+.*\|\s*(sh|bash)|wget\s+.*\|\s*(sh|bash)/i.test(command);

        const suspiciousBinary =
            /xmrig|mimikatz|meterpreter|msfconsole|ncat|netcat/i.test(name + " " + command);

        return suspiciousLocation || suspiciousInterpreter || suspiciousBinary;
    });

    if (!matches.length) return null;

    return finding(
        "SUSPICIOUS_PROCESS_EXECUTION",
        "HIGH",
        matches.length,
        "Suspicious process execution pattern detected (" + matches.length + " processes).",
        { category: "MALWARE", evidenceType: "PROCESS" }
    );
}

/* 06 — Living-off-the-Land */
function detectLivingOffTheLandV2(processes) {
    const events = processEvents(processes);

    const patterns = [
        /powershell.*-enc/i,
        /certutil.*-decode/i,
        /certutil.*urlcache/i,
        /bitsadmin.*\/transfer/i,
        /mshta.*https?:/i,
        /rundll32.*https?:/i,
        /regsvr32.*https?:/i,
        /curl.*\|\s*(sh|bash)/i,
        /wget.*\|\s*(sh|bash)/i
    ];

    const matches = events.filter(p =>
        patterns.some(pattern =>
            pattern.test(str(p?.cmdline || p?.command || p?.command_line || p?.cmd))
        )
    );

    if (!matches.length) return null;

    return finding(
        "LIVING_OFF_THE_LAND",
        "HIGH",
        matches.length,
        "Living-off-the-land execution pattern detected (" + matches.length + " processes).",
        { category: "MALWARE_EXECUTION", evidenceType: "PROCESS" }
    );
}

/* 07 — Ransomware-like Mass File Modification */
function detectRansomwareLikeActivityV2(files) {
    const events = arr(files?.events || files?.changes || files?.activity);

    const modifiedCount = Number(
        files?.modified_count ??
        files?.modifiedCount ??
        files?.changes_count ??
        files?.changeCount ??
        0
    );

    const renamedOrEncrypted = events.filter(e =>
        /rename|encrypted|encryption|\.locked$|\.encrypted$|ransom/i.test(
            str(e?.action || e?.operation || e?.path || e?.filename || e?.message)
        )
    ).length;

    const total = Math.max(modifiedCount, events.length);

    if (total < 100 && renamedOrEncrypted < 20) return null;

    const count = Math.max(total, renamedOrEncrypted);

    return finding(
        "RANSOMWARE_LIKE_ACTIVITY",
        "CRITICAL",
        count,
        "Mass file modification activity consistent with ransomware-like behavior was detected (" + count + " changes).",
        { category: "MALWARE_RANSOMWARE", evidenceType: "FILE_INTEGRITY" }
    );
}

/* 08 — Network Scanning */
function detectNetworkScanningV2(network) {
    const events = networkEvents(network);
    const ips = new Set();
    const ports = new Set();

    for (const e of events) {
        const ip = str(e?.remote_ip || e?.destination_ip || e?.dst_ip || e?.ip);
        const port = e?.remote_port ?? e?.destination_port ?? e?.dst_port ?? e?.port;

        if (ip) ips.add(ip);
        if (port !== undefined && port !== null) ports.add(String(port));
    }

    const connectionCount = Number(
        network?.connection_count ??
        network?.connections_count ??
        (typeof network?.connections === "number" ? network.connections : 0)
    );

    const targetCount = Math.max(ips.size, ports.size);

    if (targetCount < 3 && connectionCount < 5) return null;

    return finding(
        "NETWORK_SCANNING",
        "MEDIUM",
        Math.max(targetCount, connectionCount),
        "Network reconnaissance pattern detected across " + targetCount + " unique targets or ports.",
        {
            category: "NETWORK_RECONNAISSANCE",
            evidenceType: "NETWORK",
            uniqueTargets: ips.size,
            uniquePorts: ports.size
        }
    );
}

/* 09 — Suspicious Outbound / C2-like Communication */
function detectC2LikeCommunicationV2(network) {
    const events = networkEvents(network);

    const matches = events.filter(e => {
        const direction = str(e?.direction || e?.state).toLowerCase();
        const port = Number(e?.remote_port ?? e?.destination_port ?? e?.dst_port ?? e?.port ?? 0);

        const repeated = Boolean(e?.repeated || e?.beacon || e?.periodic || e?.is_beacon);
        const external = Boolean(e?.external || e?.remote_external);

        return repeated ||
            (/outbound|established/i.test(direction) &&
             external &&
             [80, 443, 8080, 8443, 53].includes(port));
    });

    if (matches.length < 3) return null;

    return finding(
        "SUSPICIOUS_C2_COMMUNICATION",
        "HIGH",
        matches.length,
        "Repeated suspicious outbound communication pattern detected (" + matches.length + " connections).",
        { category: "COMMAND_AND_CONTROL", evidenceType: "NETWORK" }
    );
}

/* 10 — Data Exfiltration Anomaly */
function detectDataExfiltrationV2(network) {
    const outboundBytes = Number(
        network?.outbound_bytes ??
        network?.bytes_sent ??
        network?.sent_bytes ??
        network?.tx_bytes ??
        network?.upload_bytes ??
        0
    );

    const outboundMb = outboundBytes / (1024 * 1024);

    const largeTransfers = arr(network?.events).filter(e =>
        Number(e?.bytes_sent ?? e?.outbound_bytes ?? e?.tx_bytes ?? 0) >= 50 * 1024 * 1024
    );

    if (outboundMb < 250 && !largeTransfers.length) return null;

    return finding(
        "DATA_EXFILTRATION_ANOMALY",
        "HIGH",
        largeTransfers.length || Math.round(outboundMb),
        "Unusually large outbound data volume detected (" + Math.round(outboundMb) + " MB).",
        {
            category: "EXFILTRATION",
            evidenceType: "NETWORK",
            outboundBytes
        }
    );
}

/* 11 — Suspicious Service Activity */
function detectSuspiciousServiceActivityV2(services) {
    const events = arr(services?.events || services?.changes || services?.activity);

    const changes = events.filter(e =>
        /start|stop|enable|disable|install|create|remove|delete/i.test(
            str(e?.action || e?.operation || e?.message)
        )
    );

    if (!changes.length) return null;

    const suspicious = changes.filter(e =>
        /tmp|shm|curl|wget|nc|netcat|miner|xmrig|unknown/i.test(
            str(e?.service || e?.name || e?.message)
        )
    );

    return finding(
        "SUSPICIOUS_SERVICE_ACTIVITY",
        suspicious.length ? "HIGH" : "MEDIUM",
        changes.length,
        "Service lifecycle or persistence activity detected (" + changes.length + " changes).",
        { category: "PERSISTENCE", evidenceType: "SERVICE" }
    );
}

/* 12 — Abnormal File/System Activity */
function detectAbnormalFileSystemActivityV2(files) {
    const events = arr(files?.events || files?.changes || files?.activity);

    const count = Math.max(
        Number(
            files?.file_count ??
            files?.files_count ??
            files?.activity_count ??
            files?.change_count ??
            0
        ),
        events.length
    );

    if (count < 500) return null;

    return finding(
        "ABNORMAL_FILE_SYSTEM_ACTIVITY",
        "MEDIUM",
        count,
        "Abnormally high file/system activity detected (" + count + " file events).",
        { category: "ENDPOINT_ANOMALY", evidenceType: "FILE_INTEGRITY" }
    );
}


/* =====================================================
   REPLACE DETECTION ENTRYPOINT
   ===================================================== */

function detectThreatsV2(telemetry = {}) {
    const findings = [];

    const detectors = [
        () => detectBruteForceV2(telemetry.authentication),
        () => detectPasswordSprayingV2(telemetry.authentication),
        () => detectUserAccountManipulationV2(telemetry.authentication),
        () => detectPrivilegeEscalationV2(telemetry.authentication, telemetry.processes),
        () => detectSuspiciousProcessExecutionV2(telemetry.processes),
        () => detectLivingOffTheLandV2(telemetry.processes),
        () => detectRansomwareLikeActivityV2(telemetry.files),
        () => detectNetworkScanningV2(telemetry.network),
        () => detectC2LikeCommunicationV2(telemetry.network),
        () => detectDataExfiltrationV2(telemetry.network),
        () => detectSuspiciousServiceActivityV2(telemetry.services),
        () => detectAbnormalFileSystemActivityV2(telemetry.files)
    ];

    for (const detector of detectors) {
        const result = detector();
        if (result) findings.push(result);
    }

    return findings;
}

module.exports = {
    detectThreats: detectThreatsV2,
    analyzeAuthentication,
    analyzeProcesses,
    analyzeNetwork,
    analyzeLogs,
    detectBruteForce: detectBruteForceV2,
    detectPasswordSpraying: detectPasswordSprayingV2,
    detectUserAccountManipulation: detectUserAccountManipulationV2,
    detectPrivilegeEscalation: detectPrivilegeEscalationV2,
    detectSuspiciousProcessExecution: detectSuspiciousProcessExecutionV2,
    detectLivingOffTheLand: detectLivingOffTheLandV2,
    detectRansomwareLikeActivity: detectRansomwareLikeActivityV2,
    detectNetworkScanning: detectNetworkScanningV2,
    detectC2LikeCommunication: detectC2LikeCommunicationV2,
    detectDataExfiltration: detectDataExfiltrationV2,
    detectSuspiciousServiceActivity: detectSuspiciousServiceActivityV2,
    detectAbnormalFileSystemActivity: detectAbnormalFileSystemActivityV2
};
