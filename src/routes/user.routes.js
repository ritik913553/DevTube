import { Router } from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updatedAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updatedAccountDetails);
router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar);
router.route("/update-coverImage").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage);
router.route("/c/:username").get(verifyJWT,getUserChannelProfile);
router.route("/history").get(verifyJWT,getWatchHistory)

export default router;

 














// --------------------------------------------------------------
// Notes
/*  
    In Express, `Router` is a powerful feature that lets you create modular, mountable route handlers. It allows you to define routes in a separate file and import them into your main app, making the code cleaner, organized, and more modular.

Let's go through each part:

### 1. **`Router` from Express**

```javascript
import { Router } from "express";
```

The `Router` function in Express creates a **new router instance**. This instance behaves similarly to the main Express app (`app`), but it’s limited to handling routes. Instead of defining routes directly on the `app` instance (as you did in simpler setups), you can define routes on this router instance.

Using `Router` allows you to:
   - Modularize and organize routes by feature or purpose (e.g., user routes, product routes).
   - Export a group of related routes to use in the main application file.
   - Apply middleware to a group of routes (specific to that router instance).

### 2. **Creating the Router**

```javascript
const router = Router();
```

This line creates an instance of `Router`. You can then define routes on this instance (just like you would with `app`) but with the ability to encapsulate these routes for later use.

### 3. **Defining Routes with `router.route()`**

```javascript
router.route("/register").post(registerUser);
```

The `router.route()` method lets you define a route at a specific path (`/register` here) and chain different HTTP methods to it (e.g., `GET`, `POST`, `PUT`, `DELETE`). This approach is especially useful if you want to handle multiple methods for a single route.

In this case:
   - `router.route("/register")` creates a route specifically for the `/register` path.
   - `.post(registerUser)` attaches a POST method to this route, so when a POST request is sent to `/register`, the `registerUser` function will handle it.

This is the equivalent of writing:

```javascript
router.post("/register", registerUser);
```

But using `router.route()` is beneficial if you need to attach multiple HTTP methods (e.g., `GET`, `POST`, `PUT`, etc.) to the same route path.

### 4. **Exporting the Router**

```javascript
export default router;
```

This line exports the `router` instance. Once exported, you can import this router in your main app file (`app.js`) and use it under a specific path:

```javascript
import userRouter from './routes/user.routes.js';
app.use("/api/v1/users", userRouter);
```

In this example:
   - All routes defined in `userRouter` will be accessible under the `/api/v1/users` path.
   - Since `userRouter` has a route for `/register`, the complete URL for that route will be `/api/v1/users/register`.

### Example Flow

1. **Client Request**: A client sends a POST request to `/api/v1/users/register`.
2. **Main App**: The main Express app receives the request and matches it to the path `/api/v1/users`, forwarding it to `userRouter`.
3. **Router Handling**: Inside `userRouter`, Express matches the request path to `/register` with the POST method, so it calls `registerUser`.

### Benefits of Using `Router`

- **Modularity**: Routes related to a specific feature (e.g., user management) are kept in their own file.
- **Code Organization**: Keeps your main app file clean and organized.
- **Route Grouping**: You can apply middleware (e.g., authentication) only to certain groups of routes.
  
### Summary

`Router` helps you organize and group routes in Express. Using `router.route()` lets you chain HTTP methods for a specific route, and exporting the router allows you to modularize and import it easily in your main app file.
*/
