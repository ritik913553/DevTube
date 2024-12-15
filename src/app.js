import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import errorHandlerMiddleware from './middlewares/errorHandler.middleware.js'

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true,limit:"16kb"})); 
app.use(express.static("public"))
app.use(cookieParser());


//routes import
import userRouter from './routes/user.routes.js'
import healthcheckRouter from "./routes/healthcheck.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"



//routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users",userRouter);
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)




// Use the error handler (must be last)
// app.use(errorHandlerMiddleware);

export {app}












































// Notes -------------------------------------------
/*
    You're absolutely right that `app.use` is a middleware function in Express, and it can indeed be used to apply middleware globally. However, the way `app.use` is utilized in your code demonstrates its flexibility to set up various types of middleware and route handling. Let's break down how `app.use` is used in different scenarios:

### 1. **Global Middleware with `app.use`**

When `app.use` is called with a function (like `cors` or `cookieParser`), this middleware runs globally on **every request** before reaching any specific route handlers. Here’s an example:

```javascript
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" })); 
app.use(express.static("public"));
app.use(cookieParser());
```

Each of these `app.use` calls adds middleware that processes every incoming request before it reaches any routes. Specifically:

- **CORS**: Handles Cross-Origin Resource Sharing, applied globally so that it checks every request.
- **express.json() and express.urlencoded()**: Parses incoming request bodies and is also applied globally.
- **express.static()**: Serves static files, making it globally accessible to any request trying to access files in the "public" directory.
- **cookieParser**: Parses cookies from every incoming request.

Since `app.use` is used without a specific path, each of these middleware functions is executed on every request.

### 2. **Route-Specific Middleware with `app.use`**

`app.use` can also be used to set up middleware and routes that apply only to requests matching a specific path. This is why it’s used to set up route handlers, like so:

```javascript
import userRouter from './routes/user.routes.js';
app.use("/api/v1/users", userRouter);
```

In this case, `app.use` is given a specific path (`"/api/v1/users"`) and a router (`userRouter`). Here’s what happens:

- Only requests that start with `/api/v1/users` will be handled by `userRouter`.
- `userRouter` contains user-specific routes, so any request matching `/api/v1/users/...` will be routed to `userRouter`.
- For example, a `POST` request to `/api/v1/users/register` will trigger the `registerUser` handler in `user.routes.js`.

This approach is extremely useful because it lets you organize and apply middleware to specific sections of your app without affecting other parts. This means you can mount different routers for different parts of your application, applying middlewares or custom logic only where needed.

### 3. **The Flow of `app.use` in Action**

Let’s look at how `app.use` behaves in a simplified example flow:

- **Global Middleware**: When a request comes in, Express first executes all globally applied middleware (the ones without a path). For instance, if the request has JSON data, `express.json()` will parse it.
- **Route Matching**: Express then checks if the request path matches any `app.use` calls with a specific path. If a match is found, it passes control to that router (like `userRouter` for `/api/v1/users`).
- **Router-Level Middleware**: Inside `userRouter`, if there are further route-specific middlewares (e.g., `router.use` inside `user.routes.js`), those will be applied before the final route handler (like `registerUser`) is called.

### Why Use `app.use` in This Way?

- **Global Application**: Applying middleware globally ensures that every request is processed through essential layers like CORS, JSON parsing, or static file serving.
- **Path-Specific Routing**: Applying routers on specific paths makes it easy to organize your code by functionality (e.g., user routes, product routes, etc.), enhancing modularity and maintainability.
- **Conditional Execution**: This structure allows certain middleware to run only for certain parts of the app, improving efficiency and simplifying logic by limiting certain middleware to certain routes.

### Summary

- `app.use` without a path applies middleware globally.
- `app.use` with a specific path applies middleware and routes only for that path and its sub-paths.
- This setup allows you to mix global and route-specific middleware, ensuring flexibility and organization in your application.
*/