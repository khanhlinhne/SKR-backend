const PayOSModule = require("@payos/node");

// Handle different export formats
const PayOS = PayOSModule.PayOS || PayOSModule.default || PayOSModule;

if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
    console.error("❌ PayOS keys are missing in .env file!");
}

let payos;
try {
    payos = new PayOS(
        process.env.PAYOS_CLIENT_ID,
        process.env.PAYOS_API_KEY,
        process.env.PAYOS_CHECKSUM_KEY
    );
    console.log("✅ PayOS initialized successfully");
} catch (error) {
    console.error("❌ Failed to initialize PayOS:", error.message);
    payos = null;
}

module.exports = payos;
