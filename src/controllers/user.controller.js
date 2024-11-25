import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  /*
    get user detaails from frontend
    validation - not emplty
    check if user already exists :  username ,email
    check for images,check for avatar
    upload them to cloudinary,avatar
    create user object-create entry in db
    remove password and refresh token field from responses
    check for user creation
    return res 
*/

  const { fullName, email, password, username } = req.body;

  if (
    [fullName, email, password, username].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fileds are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  let avatarLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  }

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    email,
    password,
    username,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, "User registered successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  //username or email based login
  //find the user
  //password check
  //access and refersh token generate
  //send cookie

  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  // // here is an alternative of above code based on logic discussed in video:
  // if (!(username || email)) {
  //   throw new ApiError(400, "Username or email is required");
  // }

  const user = await User.findOne({ $or: [{ email }, { username }] });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const ispasswordValid = await user.isPasswordCorrect(password);

  if (!ispasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  //ye httpOnly and secure se frontend se koi cookie ko modify nhi kr skta(kewl dekh skta hai) kewl backend se hi modify hoga

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "User logged in successfully", {
        user: loggedInUser,
        accessToken,
        refreshToken,
      })
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },  //this removes the field from  document
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User logged out successfully", {}));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(200, "Access token refreshed successfully", {
          accessToken,
          refreshToken: newRefreshToken,
        })
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, "Password updated successfully", {}));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, "Current user fetched successfully", req.user));
});

const updatedAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!(fullName || email)) {
    throw new ApiError(400, "One field is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName ? fullName : req.user.fullName,
        email: email || req.user.email,
        // both approach is right both update fullName and email when it is given by user if one of them is not given then it sets bydeafult to initial value
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "Account details updated successfully", user));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "Avatar updated successfully", user));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading  cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "Cover image updated successfully", user));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: { username: username?.toLowerCase() },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Channel profile fetched successfully", channel[0])
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          //method->1
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          }
          //method->2
    /*
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                // You don't need the $project here anymore
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
          {
            $project: {
              "owner.fullName": 1,
              "owner.username": 1,
              "owner.avatar": 1,
            },
          },
    */ 

        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Watch History fetched successfully",
        user[0].watchHistory
      )
    );
});


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updatedAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};






















// Notes
/*
    Description of some function of array 
        The some() method checks if any array elements pass a test (provided as a callback function).
        The some() method executes the callback function once for each array element.
        The some() method returns true (and stops) if the function returns true for one of the array elements.
        The some() method returns false if the function returns false for all of the array elements.
        The some() method does not execute the function for empty array elements.
        The some() method does not change the original array.
*/

/*
  Session and cookies 
  Sessions and cookies are both used to store data about a user's interactions with a web application, but they work in different ways and serve different purposes.

### 1. **Cookies**

- **Definition**: A cookie is a small piece of data stored in the user's browser. It’s created by the server and sent to the client (browser) with each response. The browser stores the cookie and includes it in every request to the server.
  
- **Where it’s stored**: Cookies are stored on the client side, within the user's browser.

- **Lifespan**: Cookies can be persistent (stored in the browser for a set duration) or session-based (deleted when the browser closes).

- **Use cases**:
  - **Authentication**: Storing access tokens (JWTs) for a logged-in user.
  - **Preferences**: Saving user settings (like dark mode) for future visits.
  - **Tracking**: Remembering user behavior for analytics or personalized experiences.

- **Limitations**: Cookies are limited in size (usually around 4 KB) and are sent with every HTTP request, which can impact performance. Also, they are visible to client-side JavaScript (unless marked as `HttpOnly`), which can expose them to security risks.

### 2. **Sessions**

- **Definition**: A session is a way to store data on the server for individual users. Each user session has a unique identifier (usually a session ID), which is stored in a cookie on the client side. The session data itself is stored on the server.

- **Where it’s stored**: Session data is stored server-side, but the session ID is stored in a cookie on the client side.

- **Lifespan**: Sessions are usually temporary and expire when the user logs out or after a period of inactivity. However, sessions can also be configured to persist for a specific duration.

- **Use cases**:
  - **Authentication**: Storing a logged-in user's ID and other information securely on the server.
  - **Shopping Carts**: Keeping track of a user’s cart items without storing sensitive data in the client.
  - **Temporary Storage**: Storing temporary data that doesn’t need to be sent with every request, like user progress on a multi-step form.

- **Limitations**: Sessions consume server resources, so they may not scale well for a large number of users without a distributed session store (like Redis).

### **How Cookies and Sessions Work Together**
In many applications, cookies and sessions work together:

1. When a user logs in, the server creates a session and assigns it a unique session ID.
2. This session ID is stored in a cookie and sent to the client.
3. For every subsequent request, the client includes the session ID in the cookie.
4. The server then uses this session ID to retrieve session data and verify the user’s identity.

### **Security Considerations**

- **Cookies**: 
  - Should use the `HttpOnly` flag to prevent access by JavaScript.
  - Should be marked as `Secure` for HTTPS connections to prevent interception.
  - Can also use `SameSite` settings to prevent cross-site request forgery (CSRF) attacks.

- **Sessions**:
  - Store minimal sensitive data server-side.
  - Use secure session IDs.
  - In large applications, consider using a distributed store like Redis to prevent loss of session data when scaling.

### **Summary Table**

| Aspect       | Cookies                                | Sessions                                 |
|--------------|---------------------------------------|------------------------------------------|
| **Stored**   | Client-side, in the browser           | Server-side, with session ID in a cookie |
| **Size**     | Limited (4 KB)                        | No strict size limit                     |
| **Security** | Can be accessed by JavaScript (unless `HttpOnly`) | Server-side data, more secure           |
| **Expires**  | Can be persistent or session-based    | Typically session-based                  |
| **Use cases**| Tracking, preferences, authentication | User authentication, temporary storage   | 

Using both cookies and sessions together can allow for secure, efficient, and scalable user data management.
*/

// --------------------------------------------------------
/*
When working with MongoDB and Mongoose, the `_id` field in MongoDB is a special type called `ObjectId`. It is not a simple string, even though it might look like one. Here's why you need to explicitly use `mongoose.Types.ObjectId` when writing an aggregation pipeline or query:

### 1. **Type Matching**
MongoDB's aggregation pipeline performs strict type matching. If you pass `req.user._id` directly as a string, MongoDB will not recognize it as an `ObjectId` because it expects the `_id` field to be of type `ObjectId`. By wrapping `req.user._id` with `mongoose.Types.ObjectId`, you ensure the type matches MongoDB's expectations.

### 2. **Consistency**
Mongoose abstracts many operations when using its query methods (e.g., `.find()` or `.findById()`) and can automatically cast string `_id` values to `ObjectId`. However, this automatic casting does not happen in an aggregation pipeline. Thus, you need to explicitly convert it using `mongoose.Types.ObjectId`.

### 3. **Avoiding Errors**
If you pass a string instead of an `ObjectId`, MongoDB will not find the matching document. This could lead to unexpected behavior or errors. Explicitly converting to `ObjectId` ensures your query behaves correctly.

### Example Comparison
#### Incorrect Query (String `_id`):
```javascript
const user = await User.aggregate([
  {
    $match: {
      _id: req.user._id // req.user._id is a string
    }
  }
]);
```
This query will fail or return no results because `_id` is expected to be an `ObjectId`.

#### Correct Query (Converted to `ObjectId`):
```javascript
const user = await User.aggregate([
  {
    $match: {
      _id: new mongoose.Types.ObjectId(req.user._id) // Converts to ObjectId
    }
  }
]);
```
This query works as expected because the `_id` type matches MongoDB's requirement.

### When You Don't Need Conversion
If `req.user._id` is already stored as an `ObjectId` in the `req` object, conversion is unnecessary. You can directly pass it:
```javascript
const user = await User.aggregate([
  {
    $match: {
      _id: req.user._id // Already an ObjectId
    }
  }
]);
```

### Conclusion
The need to convert `req.user._id` to `mongoose.Types.ObjectId` arises because MongoDB's aggregation pipeline does not perform automatic type conversion. Explicit conversion ensures compatibility and prevents potential mismatches or errors.
*/

// -------------------
// .aggregate([{},{}]) -> aggregation pipeline -> this returns an array of documents



//---------------------------------
// why using aggregation pipleline for getwhatchHistory ,we can directly use populate method 
/*
Using an **aggregation pipeline** is a robust choice for fetching watch history in this scenario, especially since you are performing nested lookups (videos, owners) and applying specific transformations using stages like `$project` and `$addFields`. However, depending on your use case, **using `populate`** with Mongoose could simplify the implementation and reduce complexity if you're primarily resolving references.

Here’s an analysis of both approaches to help decide the best option:

---

### **1. When to Use Aggregation Pipeline**
The aggregation pipeline is suitable when:
1. **Complex Transformations Are Needed:**
   - You want to apply custom transformations like `$project` or `$addFields` to control the data structure or add calculated fields.
   - For example, you are reshaping the `owner` data to include only `fullName`, `username`, and `avatar`.

2. **Filtering or Sorting on Nested Fields:**
   - The pipeline can handle filtering or sorting at various levels (e.g., filtering videos based on a specific condition within the pipeline).

3. **Advanced Data Manipulations:**
   - The `$lookup` stage in aggregation can perform advanced joins (e.g., joining `videos` and then `users`).

4. **Performance Considerations:**
   - Aggregation pipelines can be optimized if you work with a large dataset or need multiple operations in one go.

---

### **2. When to Use `populate`**
The `populate` method is better suited when:
1. **Simple Relationships Are Resolved:**
   - If your `User` schema references `videos` via `watchHistory`, and `videos` references `owner`, using `populate` with `nested populate` can resolve these relationships without manually joining collections.

   Example with `populate`:
   ```javascript
   const user = await User.findById(req.user._id)
     .populate({
       path: "watchHistory",
       populate: {
         path: "owner",
         select: "fullName username avatar", // Only fetch specific fields
       },
     });
   
   return res.status(200).json(
     new ApiResponse(
       200,
       "Watch History fetched successfully",
       user.watchHistory
     )
   );
   ```

2. **Readability and Maintenance:**
   - `populate` is easier to read and maintain for resolving references. It's straightforward and requires fewer lines of code compared to writing a full aggregation pipeline.

3. **Dynamic Queries:**
   - Populate is well-suited for cases where your population paths or fields may change dynamically, making it more flexible for simpler tasks.

---

### **3. Key Differences**

| **Feature**                    | **Aggregation Pipeline**                              | **Mongoose Populate**                             |
|---------------------------------|------------------------------------------------------|--------------------------------------------------|
| **Complex Data Transformations** | Advanced filtering, reshaping, adding calculated fields | Limited to resolving references and projections |
| **Ease of Use**                 | Requires detailed pipeline stages                   | Simple and declarative syntax                   |
| **Performance**                 | Can be faster with proper indexes for complex queries | May execute multiple queries (N+1 problem)     |
| **Nested Joins**                | Fully supported with nested `$lookup`               | Supports nested population with `populate`      |
| **Flexibility**                 | Highly customizable                                 | Limited to resolving references in schemas      |

---

### **4. Recommendations**
- **Stick to Aggregation if:**
  - You need advanced transformations (e.g., filtering or restructuring data).
  - You already have a highly optimized pipeline for the query.

- **Switch to `populate` if:**
  - You simply want to resolve references for `videos` and `owner` and do not need additional filtering or transformations.

---

### **5. Potential Optimization with `populate`**
Using `populate` with selected fields is straightforward:
1. Ensure your `User` schema includes a reference to `videos` in `watchHistory`.
2. Ensure your `Video` schema includes a reference to `User` as `owner`.

---

### Example Using `populate` for Watch History:
Here’s how you can rewrite your aggregation pipeline logic using `populate`:

```javascript
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: "watchHistory",
      populate: {
        path: "owner",
        select: "fullName username avatar", // Select specific fields
      },
    });

  return res.status(200).json(
    new ApiResponse(
      200,
      "Watch History fetched successfully",
      user.watchHistory
    )
  );
});
```

---

### **6. Conclusion**
- If your primary goal is to fetch the `watchHistory` with related `videos` and their `owners`, **`populate`** is simpler and more maintainable.
- Stick to the **aggregation pipeline** if you have more advanced data manipulation needs, such as filtering or restructuring data beyond just joining related collections.
*/





/*
Yes, exactly! The sub-pipeline inside the `$lookup` has **access only to the documents from the foreign collection** (the collection specified in the `from` field of the `$lookup`) and executes only on those documents. Here's how it works in more detail:

### **How the Sub-pipeline Works in `$lookup`**

1. **Outer Document Matching**:
   - In the **outer collection** (e.g., `orders`), each document goes through the `$lookup` stage.
   - For each document in the outer collection, MongoDB looks for matching documents in the **foreign collection** (e.g., `products`) based on the condition specified in `localField` (the field in the outer collection) and `foreignField` (the field in the foreign collection).

2. **Sub-pipeline Executes on Foreign Collection**:
   - After finding the matching documents in the foreign collection (based on the `localField` and `foreignField` match), the **sub-pipeline** inside the `$lookup` is applied to **those foreign collection documents**.
   - The sub-pipeline can contain operations like `$match`, `$project`, `$group`, etc., but **it only operates on the foreign collection documents** that matched the condition specified by the `$lookup` (i.e., the documents that are "joined" with the outer collection).
   
3. **Sub-pipeline Result**:
   - After the sub-pipeline finishes, the resulting documents (from the foreign collection) are added to the `as` field (in this case, `productDetails`) in the output documents of the outer collection.
   - The sub-pipeline doesn’t affect or access the original documents in the outer collection (e.g., `orders`), it only modifies the data coming from the foreign collection (e.g., `products`).

### **Example to Illustrate**:

Imagine you have the following two collections:

**Orders Collection** (`orders`):

```json
[
  {
    "_id": 1,
    "productId": 101,
    "quantity": 2
  },
  {
    "_id": 2,
    "productId": 102,
    "quantity": 1
  }
]
```

**Products Collection** (`products`):

```json
[
  {
    "_id": 101,
    "name": "Laptop",
    "price": 1000,
    "isAvailable": true
  },
  {
    "_id": 102,
    "name": "Phone",
    "price": 500,
    "isAvailable": false
  }
]
```

Now, you want to get the order details along with the product information, but you only want to include products that are available (`isAvailable: true`).

### Aggregation Query with Sub-pipeline:

```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: "products", // The foreign collection
      localField: "productId", // The field in the 'orders' collection
      foreignField: "_id", // The field in the 'products' collection
      as: "productDetails", // The field where the result will be stored
      pipeline: [
        { $match: { isAvailable: true } }, // Filter only available products
        { $project: { name: 1, price: 1 } } // Project only the name and price
      ]
    }
  }
])
```

### **Step-by-Step Execution**:

1. **Outer `$lookup`**: For each document in the `orders` collection:
   - Find matching documents in the `products` collection where `productId` (from `orders`) matches `_id` (from `products`).
   
2. **Sub-pipeline on Foreign Documents**: After finding matching `products`:
   - The sub-pipeline runs on the **foreign documents** (products). 
   - The sub-pipeline first filters products where `isAvailable: true`, then projects only the `name` and `price`.

3. **Join and Output**: After the sub-pipeline runs:
   - The matching `products` (that are available) are added to the `productDetails` field in the `orders` document.

### **Result**:

```json
[
  {
    "_id": 1,
    "productId": 101,
    "quantity": 2,
    "productDetails": [
      {
        "name": "Laptop",
        "price": 1000
      }
    ]
  },
  {
    "_id": 2,
    "productId": 102,
    "quantity": 1,
    "productDetails": []
  }
]
```

### **Key Points**:

- **Sub-pipeline operates only on foreign collection documents**: It doesn’t affect the outer collection (`orders` in this case).
- **The result of the sub-pipeline**: The processed documents from the foreign collection (filtered and projected by the sub-pipeline) are added to the `as` field (here, `productDetails`) in the outer document.
- **No modification to the outer documents**: The sub-pipeline only modifies the data from the foreign collection (not the outer collection).

### Conclusion:
The sub-pipeline inside `$lookup` works only on the foreign collection documents (those found by the `localField` and `foreignField` match) and cannot affect or modify the documents from the outer collection. The outer collection documents are processed through the `$lookup` stage to join data from the foreign collection, but the sub-pipeline only operates on the joined foreign data.
*/