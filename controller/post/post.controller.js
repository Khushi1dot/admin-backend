const Post = require("../../models/post.model");
const catchAsync = require("../../utils/catchAsync");
const fs = require("fs");
const User = require("../../models/user.model");
// const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');

class AdminPostController {
  // Create Post (Admin can assign to any user)
  static createPost = catchAsync(async (req, res) => {
    let { title, desc, categories, userId, name } = req.body;
    const imagePaths = req.files.map((file) => file.path);

    if (!userId && name) {
      const user = await User.findOne({ name });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found by username" });
      }
      userId = user._id; // override with resolved userId
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Either userId or username is required",
      });
    }
    const newPost = new Post({
      title,
      desc,
      images: imagePaths,
      categories,
      user: userId, // Admin assigns post to a user
    });

    const savedPost = await newPost.save();

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: savedPost,
    });
  });

  // Get All Posts
  static getAllPosts = catchAsync(async (req, res) => {
    const posts = await Post.find().populate("user").populate('comments.userId').populate('likes').populate('dislikes');

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  });

  // Get Post by ID
  static getById = catchAsync(async (req, res) => {
    const post = await Post.findById(req.params.id).populate("user").populate('comments.userId').populate('likes').populate('dislikes');

console.log(post.comments[0].userId); 
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Post retrieved successfully",
      data: post,
    });
  });

  // Update Post
  static updateById = catchAsync(async (req, res) => {
    const postId = req.params.id;
    const { title, desc, categories, oldImages } = req.body;

    // Parse oldImages if it is a JSON string
    const existingImages = oldImages ? JSON.parse(oldImages) : [];

    // New uploaded images
    const newImagePaths = req.files?.map((file) => file.path) || [];

    // Combine old + new images
    const allImages = [...existingImages, ...newImagePaths];

    // Find the current post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Remove any images that were not existing
    const deletedImages = post.images.filter(
      (img) => !existingImages.includes(img)
    );
    deletedImages.forEach((imgPath) => {
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    });

    // Now update the post
    post.title = title || post.title;
    post.desc = desc || post.desc;
    post.categories = categories || post.categories;
    post.images = allImages;

    const updatedPost = await post.save();

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      data: updatedPost,
    });
  });

  // Delete Post
  static deleteById = catchAsync(async (req, res) => {
    const post = await Post.findByIdAndDelete(req.params.id);

    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  });

  // Like Post (as Admin on behalf of any user)
  static likePostByAdmin = catchAsync(async (req, res) => {
    const postId = req.params.id;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ msg: "userId is required" });

    const post = await Post.findById(postId);
    if (!post) {
      console.log(post, "Post not found");
      return res
        .status(404)
        .json({
          success: false,
          data: post,
          userId,
          message: "Post not found",
        });
    }

    // Prevent duplicate likes
    if (post.likes.includes(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "User already liked this post" });
    }

    // If user had disliked earlier, remove that
    post.dislikes = post.dislikes.filter((id) => id.toString() !== userId);

    post.likes.push(userId);
    post.likeCount = post.likes.length;
    post.dislikeCount = post.dislikes.length;
    await post.save();

     const populatedPost = await Post.findById(postId)
    .populate("likes")
    .populate("dislikes");

    res.status(200).json({
      success: true,
      msg: `Post liked on behalf of user ${userId}`,
      data: {
        ...populatedPost.toObject(),
        likeCount: post.likes.length,
        dislikeCount: post.dislikes.length,
      },
    });
  });

  // Dislike Post (as Admin on behalf of any user)
  static dislikePostByAdmin = catchAsync(async (req, res) => {
    const postId  = req.params.id;
    const { userId } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Prevent duplicate dislikes
    if (post.dislikes.includes(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "User already disliked this post" });
    }

    // If user had liked earlier, remove that
    post.likes = post.likes.filter((id) => id.toString() !== userId);

    post.dislikes.push(userId);
    post.dislikeCount = post.dislikes.length;
    post.likeCount = post.likes.length;
    await post.save();

     const populatedPost = await Post.findById(postId)
    .populate("likes")
    .populate("dislikes");

    res.status(200).json({
      success: true,
      message: "Post disliked successfully",
     data: {
        ...populatedPost.toObject(),
        likeCount: post.likes.length,
        dislikeCount: post.dislikes.length,
      },
    });
  });

static commentToPostByAdmin = catchAsync(async (req, res) => {
  const postId = req.params.id;
  const { userId, text, emoji } = req.body;

  if (!userId || !text) {
    return res.status(400).json({
      success: false,
      message: "userId and text are required to comment",
    });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({
      success: false,
      message: "Post not found",
    });
  }

  const newComment = {
    userId,
    text,
    emoji,
  };

  post.comments.push(newComment);
  post.commentCount = post.comments.length;
  await post.save();

  // Repopulate to get user info
  const populatedPost = await Post.findById(postId).populate("comments.userId");

  // Send only the latest comment with user details
  const latestComment = populatedPost.comments[populatedPost.comments.length - 1];

  res.status(201).json({
    success: true,
    message: "Comment added successfully",
    data: {
      comment: latestComment,
      commentCount: populatedPost.comments.length,
    },
  });
});

static  deleteCommentByAdmin = catchAsync(async (req, res) => {
  const { postId, commentId } = req.params;

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({
      success: false,
      message: "Post not found",
    });
  }

  // Find index of comment
  const commentIndex = post.comments.findIndex(
    (comment) => comment._id.toString() === commentId
  );

  if (commentIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Comment not found",
    });
  }

  // Remove comment and update count
  post.comments.splice(commentIndex, 1);
  post.commentCount = post.comments.length;

  await post.save();

  res.status(200).json({
    success: true,
    message: "Comment deleted successfully",
    data: {
      commentCount: post.commentCount,
    },
  });
});

static exportPost = catchAsync(async (req, res) => {
  try {
    const posts = await Post.find({}).populate('user');

    if (!posts || posts.length === 0) {
      return res.status(404).json({ success: false, message: 'No posts found' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Posts');

    // Add header row
    worksheet.columns = [
      { header: 'Title', key: 'Title', width: 45},
      { header: 'Desc', key: 'Desc', width: 50 },
      { header: 'Author', key: 'Author', width: 15 },
      {header:'Category', key:'Category', width:15},
      {header:'CreatedAt', key: 'createdAt', width:30},
      {header:'Images',key: 'Images', width:50},
    ];

    // Add data rows with alternating colors
    posts.forEach((post, index) => {
      const row = worksheet.addRow({
        Title: post.title,
        Desc: post.desc || 'na',
        Author:post.user.name,
        Category:post.categories,
         createdAt: new Date(post.createdAt).toLocaleString(),
         Images:post.images,
      });

 row.eachCell((cell) => {
  cell.alignment = {
    wrapText: true,
    vertical: 'top',
  };
});

      if (index % 2 === 0) {
        // Apply background fill for even rows (0-based index)
        row.eachCell(cell => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEFEFEF' } // light gray
          };
        });
      }
        worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = {
        wrapText: true,
        vertical: 'middle',
        horizontal: 'center',
      };
    });
     
    });

    // Set response headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


static exportSinglePost = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the post by ID
    const post = await Post.findById(id)
      .populate('user')
      .populate('comments.userId');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Single Post');

    worksheet.columns = [
      { header: 'Title', key: 'Title', width: 30 },
      { header: 'Desc', key: 'Desc', width: 30 },
      { header: 'Author', key: 'Author', width: 15 },
      { header: 'Category', key: 'Category', width: 15 },
      { header: 'Images', key: 'Images', width: 30 },
      { header: 'CommentsCount', key: 'CommentsCount', width: 20 },
      { header: 'Comments', key: 'Comments', width: 30 },
      { header: 'LikesCount', key: 'LikesCount', width: 15 },
      { header: 'Likes', key: 'Likes', width: 15 },
      { header: 'DislikesCount', key: 'DislikesCount', width: 15 },
      { header: 'Dislikes', key: 'Dislikes', width: 15 },
      { header: 'CreatedAt', key: 'CreatedAt', width: 30 },
    ];

    // Format comment text
    const formattedComments = (post.comments || []).map(c => {
      const name = c.userId?.name || 'Unknown';
      return `${name}: ${c.text}`;
    }).join('\n');

    // You may also want to populate likes/dislikes with user info
    const formattedLikes = (post.likes || []).join(', ');
    const formattedDislikes = (post.dislikes || []).join(', ');

    const row = worksheet.addRow({
      Title: post.title,
      Desc: post.desc,
      Author: post.user?.name || 'N/A',
      Category: (post.categories || []).join(', '),
      Images: (post.images || []).join(', '),
      CommentsCount: post.commentCount || 'N/A',
      Comments: formattedComments || 'N/A',
      LikesCount: post.likeCount || 'N/A',
      Likes: formattedLikes || 'N/A',
      DislikesCount: post.dislikeCount || 'N/A',
      Dislikes: formattedDislikes || 'N/A',
      CreatedAt: new Date(post.createdAt).toLocaleString(),
    });

      // Style the data row
    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        wrapText: true,
        vertical: 'top',
      };

      // Alternate column coloring: A, C, E... (odd col index = even visually)
      if (colNumber % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEFEFEF' }, // light gray
        };
      }
    });

    // Style header row
    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = {
        wrapText: true,
        vertical: 'middle',
        horizontal: 'center',
      };
    });
     

    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=post_${post._id}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

}

module.exports = AdminPostController;
