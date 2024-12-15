import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  //TODO: create playlist
  const { name, description } = req.body;
  const userId = req.user?._id;

  const newPlaylist = await Playlist.create({
    name,
    description,
    owner: userId,
    videos: [],
  });

  res
    .status(200)
    .json(new ApiResponse(200, "Playlist created successfully", newPlaylist));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid userId");
  }

  const playlists = await Playlist.find({ owner: userId }).sort({
    createdAt: -1,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Playlists fetched successfully", playlists));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  //TODO: get playlist by id
  const { playlistId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlistId");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "playlist fetched successfully", playlist));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;
  if (
    !mongoose.Types.ObjectId.isValid(videoId) ||
    !mongoose.Types.ObjectId.isValid(playlistId)
  ) {
    throw new ApiError(404, "Invalid playlistId or videoId");
  }

  const playlist = await Playlist.findOne({ _id: playlistId, owner: userId });

  if (!playlist) {
    throw new ApiError(404, "Playlist not found or you are not authorized");
  }

  //   if(playlist.videos.includes(videoId)){
  //     throw new ApiError(400, "Video already exists in the playlist");
  //   }

  const video = await Video.findOne({ _id: videoId, owner: userId });
  if (!video) {
    throw new ApiError(404, "Video not found or you are not authorized to add this video");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $addToSet: { videos: videoId } }, // Adds videoId if not already present ,it removes the need of manual checking
    { new: true }
  );
  res
    .status(200)
    .json(new ApiResponse(200, "video added successfully", updatedPlaylist));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  // TODO: remove video from playlist
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;
  if (
    !mongoose.Types.ObjectId.isValid(videoId) ||
    !mongoose.Types.ObjectId.isValid(playlistId)
  ) {
    throw new ApiError(404, "Invalid playlistId or videoId");
  }

  const playlist = await Playlist.findOne({ _id: playlistId, owner: userId });
  if (!playlist) {
    throw new ApiError(404, "Playlist not found or you are not authorized");
  }
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $pull: { videos: videoId } },
    { new: true }
  );
  if (!updatedPlaylist.videos.includes(videoId)) {
    res
      .status(200)
      .json(
        new ApiResponse(200, "Video removed successfully", updatedPlaylist)
      );
  } else {
    throw new ApiError(500, "Failed to remove video from playlist");
  }
});

const deletePlaylist = asyncHandler(async (req, res) => {
  // TODO: delete playlist
  const { playlistId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlistId");
  }

  const deletedPlaylist = await Playlist.findOneAndDelete({
    _id: playlistId,
    owner: userId,
  });

  if (!deletedPlaylist) {
    throw new ApiError(
      404,
      "Playlist not found or You are not authorized to delete this playlist"
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, "playlist deleted successfully", deletedPlaylist)
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
  //TODO: update playlist
  const { playlistId } = req.params;
  const { name, description } = req.body;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlistId");
  }
  const playlist = await Playlist.findOne({ _id: playlistId, owner: userId });

  if (!playlist) {
    throw new ApiError(
      404,
      "Playlist not found or You are not authorized to update this playlist"
    );
  }
  if (name?.trim()) {
    playlist.name = name.trim();
  }
  if (description?.trim()) {
    playlist.description = description.trim();
  }

  await playlist.save();

  res
    .status(200)
    .json(new ApiResponse(200, "playlist updated successfully", playlist));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
