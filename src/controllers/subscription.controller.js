import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  // TODO: toggle subscription
  const { channelId } = req.params;
  const userId = req.user?._id;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const existingSubscription = await Subscription.findOne({
      subscriber: userId,
      channel: channelId,
    }).session(session);

    if (existingSubscription) {
      await existingSubscription.deleteOne({ session });
      await session.commitTransaction();
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            "Unsubscribed successfully",
            existingSubscription
          )
        );
    }

    const newSubscription = await Subscription.create(
      [{ subscriber: userId, channel: channelId }],
      { session }
    );
    await session.commitTransaction();
    return res
      .status(200)
      .json(new ApiResponse(200, "Subscribed successfully", newSubscription));
  } catch (err) {
    await session.abortTransaction();
    throw new ApiError(400, "Failed to toggle subscription");
  } finally {
    session.endSession();
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const subscribersList = await Subscription.aggregate([
    { $match: { channel: new mongoose.Types.ObjectId(channelId) } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
      },
    },
    { $unwind: "$subscriber" },
    {
      $project: {
        _id: 0,
        subscriberId: "$subscriber._id",
        subscriberName: "$subscriber.username",
        subscriberAvatar: "$subscriber.avatar",
      },
    },
  ]);

  return res.status(200).json(new ApiResponse(200,"subscribrs of a channel is fetched successfully",subscribersList))
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  const subscribedChannelList = await Subscription.aggregate([
    { $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
      },
    },
    { $unwind: "$channel" },
    {
      $project: {
        _id: 0,
        channelId: "$channel._id",
        channelName: "$channel.username",
        channelAvatar: "$channel.avatar",
        createdAt: "$createdAt",
        updatedAt: "$updatedAt",
        isSubscribed: true,
      },
    },
  ]);

  if (!subscribedChannelList) {
    throw new ApiError(400, "Invalid subscriber");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Subscribed Channels", subscribedChannelList));
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
