import mongoose, { mongo } from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const channelId = req.user?._id;
  let channelStats = {};

  channelStats.totalVideoViews = await Video.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
    {
      $group: {
        _id: null,
        totalVideoViews: { $sum: "$views" },
      },
    },
    {
      $project: {
        _id: 0,
        totalVideoViews: 1,
      },
    },
  ])[0];

  channelStats.totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  channelStats.totalVideos = await Video.countDocuments({ owner: channelId });

  const resultOfLike = await Like.aggregate([
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    { $unwind: "$video" },
    { $match: { "video.owner": new mongoose.Types.ObjectId(channelId) } },
    { $count: "totalLikes" },
  ]);
  channelStats.totalLikes =
    resultOfLike.length > 0 ? resultOfLike[0].totalLikes : 0;

  res
    .status(200)
    .json(new ApiResponse(200, "Data of channelStats", channelStats));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const channelId = req.user?._id;

  const myCustomLabels = {
    docs: "videos",
    totalDocs: "totalVideoCount",
    meta : "paginator",
  }
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 3,
    customLabels: myCustomLabels
  };
  const aggregate = Video.aggregate([
    {$match: {owner: new mongoose.Types.ObjectId(channelId)}},
    {$sort: {createdAt : -1}}
  ])
  const videos = await Video.aggregatePaginate(aggregate, options)

  res
   .status(200)
   .json(new ApiResponse(200, "Video of channel is fetched successfully", videos));
});

export { getChannelStats, getChannelVideos };
