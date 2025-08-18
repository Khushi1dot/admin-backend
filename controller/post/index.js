const express = require("express");
const router = express.Router();
const AdminPostController = require("./post.controller");
const authMiddleware = require("../../middlewares/authentication"); 
const upload = require("../../utils/multer");
// Protect all routes
router.use(authMiddleware(["admin"]));

// Routes
router.post("/create-post",  upload.array("images",10), AdminPostController.createPost);
router.get("/allPosts", AdminPostController.getAllPosts);
router.get("/getById/:id", AdminPostController.getById);
router.put("/update/:id", upload.array("images",10),AdminPostController.updateById);
router.delete("/delete/:id", AdminPostController.deleteById);
router.put("/like/:id",AdminPostController.likePostByAdmin);
router.put("/dislike/:id",AdminPostController.dislikePostByAdmin);
router.put("/comment/:id",AdminPostController.commentToPostByAdmin);
router.delete("/delete/:postId/:commentId",AdminPostController.deleteCommentByAdmin);
router.get("/exportPost",AdminPostController.exportPost);
router.get("/exportSinglePost/:id",AdminPostController.exportSinglePost);
module.exports = router;
