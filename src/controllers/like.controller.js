import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on video
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoid");
  }

  const like = await Like.findOne({ video: videoId, likedBy: userId });

  if (!like) {
    const createdLike = await Like.create({
      video: videoId,
      likedBy: userId,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, "Like added successfully", createdLike));
  }

  await Like.deleteOne({ _id: like._id });

  return res
    .status(200)
    .json(new ApiResponse(200, "Like removed successfully", null));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on comment
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  const like = await Like.findOne({ comment: commentId, likedBy: userId });

  if (!like) {
    const createdLike = await Like.create({
      comment: commentId,
      likedBy: userId,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, "Like added successfully", createdLike));
  }

  await Like.deleteOne({ _id: like._id });

  return res
    .status(200)
    .json(new ApiResponse(200, "Like removed successfully", null));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on tweet
  const { tweetId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId");
  }

  const like = await Like.findOne({ tweet: tweetId, likedBy: userId });

  if (!like) {
    const createdLike = await Like.create({
      tweet: tweetId,
      likedBy: userId,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, "Like added successfully", createdLike));
  }

  await Like.deleteOne({ _id: like._id });

  return res
    .status(200)
    .json(new ApiResponse(200, "Like removed successfully", null));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const userId = req.user?._id;

  const videos = await Like.aggregate([
    { $match: { likedBy: new mongoose.Types.ObjectId(userId), comment: undefined, tweet: undefined } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    {$unwind:"$video"},
    {
        $project: { 
          _id: 0, // Exclude _id
          videoFile: "$video.videoFile",
          thumbnail: "$video.thumbnail",
          title: "$video.title",
          description: "$video.description",
          duration: "$video.duration",
          views: "$video.views",
          isPublished: "$video.isPublished",
          createdAt: "$video.createdAt",
        }
      }
  ]);

  return res.status(200).json(new ApiResponse(200, "Liked videos fetched successfully", videos));

});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
