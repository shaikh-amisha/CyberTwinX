const mongoose = require("mongoose");

const EndpointTwinSchema = new mongoose.Schema(
  {
    endpointId: {
      type: String,
      required: true,
      unique: true,
    },

    hostname: {
      type: String,
      default: "Unknown",
    },

    os: {
      type: String,
      default: "Linux",
    },

    ip: {
      type: String,
      default: "Unknown",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "COMPROMISED"],
      default: "ACTIVE",
    },

    telemetry: {
      processes: {
        type: Number,
        default: 0,
      },

      connections: {
        type: Number,
        default: 0,
      },

      users: {
        type: Number,
        default: 0,
      },

      logs: {
        type: Number,
        default: 0,
      },
    },

    securityState: {
      type: String,
      default: "UNKNOWN",
    },

    riskScore: {
    type: Number,
    default: 0,
    },

    riskLevel: {
        type: String,
        default: "LOW"
    },

    riskBreakdown: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },

    evidenceConfidence: {
      type: Number,
      default: 0,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("EndpointTwin", EndpointTwinSchema);