const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

// Routes
const telemetryRoutes = require("./routes/telemetryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const endpointTwinRoutes = require("./routes/endpointTwinRoutes");
const stateHistoryRoutes = require("./routes/stateHistoryRoutes");
const incidentTwinRoutes = require("./routes/incidentTwinRoutes");
const evidenceRoutes = require("./routes/evidenceRoutes");
const investigatorRoutes = require("./routes/investigatorRoutes");
const newsRoutes = require("./routes/newsRoutes");
const whatIfRoutes = require("./routes/whatIfRoutes");


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// APIs
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/endpoint-twin", endpointTwinRoutes);
app.use("/api/security-state-history",stateHistoryRoutes);
app.use("/api/incident-twin", incidentTwinRoutes);
app.use("/api/evidence", evidenceRoutes);
app.use("/api/investigator",investigatorRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/what-if", whatIfRoutes);


// Connect to MongoDB
connectDB();

// Health check
app.get("/", (req, res) => {
    res.json({
        status: "online",
        service: "CyberTwinX Backend",
        version: "1.0.0"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`CyberTwinX Backend running on port ${PORT}`);
});