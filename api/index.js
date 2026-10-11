
'use strict';

const app = require("../src/app");
const connectDB = require("../src/config/db");

module.exports = async (req, res) => {
    try {
        await connectDB();
        return app(req, res);
    } catch (error) {
        console.error('Request initialization failed:', error);

        return res.status(503).json({
            success: false,
            message: 'Service temporarily unavailable',
        });
    }
};