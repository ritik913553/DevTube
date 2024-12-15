import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const userId = req.user?._id;
    const { tweet } = req.body;

    if(!tweet.trim()){
        throw new ApiError(400, "Tweet is required");
    }

    const newTweet = await Tweet.create({
        owner: userId,
        content : tweet
    });

    return res.status(201).json(new ApiResponse(201,"tweet is posted successfully", newTweet));
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const userId = req.params.userId;
    const tweets = await Tweet.aggregate([
        {$match: {owner: new mongoose.Types.ObjectId(userId)}},
        {$sort: {createdAt: -1}}
    ])
    
    return res.status(200).json(new ApiResponse(200, "Tweets fetched successfully", tweets));
})

const updateTweet = asyncHandler(async (req, res) => {
    const tweetId = req.params.tweetId;
    const userId = req.user?._id;
    const { tweet: content } = req.body;

    // Validate input
    if (!content?.trim()) {
        throw new ApiError(400, "Tweet content is required");
    }

    // Validate Tweet ID
    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID");
    }

    // Find and update the tweet only if the user owns it
    const tweetToUpdate = await Tweet.findOneAndUpdate(
        { _id: tweetId, owner: userId }, // Match tweet by ID and owner
        { content }, // Update content
        { new: true, runValidators: true }  // Return the updated document and follows the rule of schema validation
    );

    if (!tweetToUpdate) {
        throw new ApiError(404, "Tweet not found or you are not authorized to update it");
    }

    // Send response
    return res.status(200).json(new ApiResponse(200, "Tweet updated successfully", tweetToUpdate));
});


const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const tweetId = req.params.tweetId;
    const userId = req.user?._id;

    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID");
    }

    const tweetToDelete = await Tweet.findOneAndDelete({_id:tweetId, owner:userId})

    if (!tweetToDelete) {
        throw new ApiError(404, "Tweet not found or you are not authorized to delete it");
    }

    return res.status(200).json(new ApiResponse(200,"Post deleted successfully",tweetToDelete));
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}