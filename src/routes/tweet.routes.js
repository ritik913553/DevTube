import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controller.js"

import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file


router.route("/").post(createTweet);
router.route("/user/:userId").get(getUserTweets);
router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);
/*
You are setting up two different HTTP methods on the same route path (/:tweetId). These are:
.patch(updateTweet): This is executed when a PATCH HTTP request is sent to /tweetId.
.delete(deleteTweet): This is executed when a DELETE HTTP request is sent to /tweetId.
*/



export default router


