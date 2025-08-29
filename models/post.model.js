const mongoose = require("mongoose");


const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User's",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    emoji: {
      type: String, // Optional user profile pic or comment image
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);



const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Post title is required"],
      trim: true,
    },
    desc: {
      type: String,
      required: [true, "Post description is required"],
    },
    images: {
      type: [String],
      default: [],
    },
    categories: {
      type: [String],
      default: [],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User's", // Reference to User collection
      required: true,
    },
     likeCount: {
      type: Number,
      default: 0,
    },
      likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User's",
      },
    ],
    dislikeCount: {
      type: Number,
      default: 0,
    },
    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User's",
      },
    ],
    commentCount: {
      type: Number,
      default: 0,
    },
    comments: [commentSchema],
  },
  
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

module.exports = mongoose.model("Post", postSchema);
