import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination


});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  if (!(title && description)) {
    throw new ApiError(404, "Please provide a title and description");
  }

  let videoLocalPath;
  if (req.files && req.files.videoFile && req.files.videoFile.length > 0) {
    videoLocalPath = req.files.videoFile[0].path;
  }

  let thumbnailLocalPath;
  if (req.files && req.files.thumbnail && req.files.thumbnail.length > 0) {
    thumbnailLocalPath = req.files.thumbnail[0].path;
  }

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail file is required");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile.url || !thumbnail.url) {
    throw new ApiError(400, "Error while uploading video or thumbnail");
  }

  const newVideo = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    owner: req.user._id,
    duration: videoFile.duration,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Video uploded Successfully", newVideo));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Video fetched successfully", video));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  const thumbnailLocalPath = req.file?.path;
  let thumbnail;

  if (thumbnailLocalPath) {
    const response = await uploadOnCloudinary(thumbnailLocalPath);
    thumbnail = response?.url;
  }

  const updateData = {};
  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (thumbnail) updateData.thumbnail = thumbnail;

  const updatedVideo = await Video.findOneAndUpdate(
    { _id: videoId, owner: req.user?._id },
    { $set: updateData }, // Update only the provided fields
    { new: true }
  );

  if (!updatedVideo) {
    return res
      .status(404)
      .json({ message: "Video not found or not authorized" });
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, "Video details updated successfully", updatedVideo)
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const videoToDelete = await Video.findOneAndDelete({
    _id: videoId,
    owner: req.user?._id,
  });

  if (!videoToDelete) {
    throw new ApiError(
      404,
      "Video not found or you are not authorized to delete it"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Video deleted successfully", videoToDelete));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
  
    // Validate the videoId format
    if (!mongoose.isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid videoId");
    }
  
    // Toggle publish status in a single query
    const updatedVideo = await Video.findOneAndUpdate(
      { _id: videoId, owner: req.user?._id }, // Match the video by ID and owner
      [{ $set: { isPublished: { $not: "$isPublished" } } }], // MongoDB aggregation for toggling
      { new: true } // Return the updated document
    );
  
    // Handle video not found or unauthorized user
    if (!updatedVideo) {
      throw new ApiError(
        404,
        "Video not found or you are not authorized to toggle publish status"
      );
    }
  
    // Return success response
    return res
      .status(200)
      .json(
        new ApiResponse(200, "Toggled publish status successfully", updatedVideo)
      );
});
  

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
