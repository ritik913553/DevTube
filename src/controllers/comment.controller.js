import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const comments = await Comment.aggregate([
    { $match: { video: new mongoose.Types.ObjectId(videoId) } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    { $unwind: "$ownerDetails" },
    {
      $project: {
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        "ownerDetails.username": 1,
        "ownerDetails.avatar": 1,
        "ownerDetails.email": 1,
        "ownerDetails._id": 1,
      },
    },
  ]);

  return res.status(200).json(new ApiResponse(200,"comments fetched successfully",comments));

});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const userId = req.user?._id;
  const { videoId } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoid");
  }

  if (!content.trim()) {
    throw new ApiError(400, "comment is required");
  }

  const userToComment = await Comment.create({
    content,
    video: videoId,
    owner: userId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Comment successfully", userToComment));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const userId = req.user?._id;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  const commentToUpdate = await Comment.findOneAndUpdate(
    { _id: commentId, owner: userId },
    { content },
    { new: true ,runValidators: true  }
  );

  if (!commentToUpdate) {
    throw new ApiError(
      400,
      "Comment not found or you are not authorized to update comment"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Comment updated successfully", commentToUpdate)
    );
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  const commentToDelete = await  Comment.findOneAndDelete({
    _id: commentId,
    owner: userId,
  });

  if (!commentToDelete) {
    throw new ApiError(
      400,
      "Comment not found or you are not authorized to delete comment"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Comment deleted successfully", commentToDelete)
    );
});

export { getVideoComments, addComment, updateComment, deleteComment };

/*  the data is sent after delete something is useful to
    create functionality like undo delere or store deleted
    items (trash bin features) . jaise yaha comment ko delete 
    krne ke bad hum deleted comment ko response me send kr rhe hai 
 */
