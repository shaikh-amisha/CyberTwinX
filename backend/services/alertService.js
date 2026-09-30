const Alert = require("../models/Alert");

const subscribers = new Set();
const recentDetections = new Map();

function makeAlertId() {
    return "ALT-" + Date.now().toString(36).toUpperCase() + "-" +
        Math.random().toString(36).slice(2, 7).toUpperCase();
}

function isDuplicate(endpointId, detectionType) {
    const key = endpointId + ":" + detectionType;
    const now = Date.now();
    const previous = recentDetections.get(key);

    if (previous && now - previous < 60000) {
        return true;
    }

    recentDetections.set(key, now);

    if (recentDetections.size > 500) {
        for (const [storedKey, timestamp] of recentDetections) {
            if (now - timestamp > 300000) {
                recentDetections.delete(storedKey);
            }
        }
    }

    return false;
}

function publish(alert) {
    const payload = "data: " + JSON.stringify(alert) + "\n\n";

    for (const response of subscribers) {
        try {
            response.write(payload);
        } catch (error) {
            subscribers.delete(response);
        }
    }
}

async function createDetectionAlerts({ endpointId, hostname, incidentId, findings }) {
    const created = [];

    if (!Array.isArray(findings)) return created;

    for (const detection of findings) {
        if (isDuplicate(endpointId, detection.type)) continue;

        const alert = await Alert.create({
            alertId: makeAlertId(),
            endpointId,
            hostname,
            incidentId: incidentId || null,
            detectionType: detection.type,
            severity: detection.severity || "MEDIUM",
            count: detection.count || 0,
            description: detection.description || "",
            category: detection.category || "SECURITY",
            detectedAt: new Date()
        });

        const serialized = alert.toObject();
        publish(serialized);
        created.push(serialized);
    }

    return created;
}

function addSubscriber(response) {
    subscribers.add(response);
}

function removeSubscriber(response) {
    subscribers.delete(response);
}

module.exports = {
    createDetectionAlerts,
    addSubscriber,
    removeSubscriber
};
