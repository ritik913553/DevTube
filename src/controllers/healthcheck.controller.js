import mongoose from "mongoose";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {
    let dbStatus = 'UP';
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
        dbStatus = 'DOWN';
    }

    res.status(200).json({
        status: 'OK',
        message: 'Server is operational',
        uptime: process.uptime(),
        timestamp: new Date(),
        services: {
            database: dbStatus,
        },
    });
})

export {
    healthcheck
    }
    