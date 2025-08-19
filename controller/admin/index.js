'user strict';

const router = require('express').Router();
const AdminController = require("./admin.controller")
// const AuthManager = require('../auth/auth.service')
const upload = require("../../utils/multer");
const auth = require("../../middlewares/authentication");


// if (process.env.NODE_ENV !== "production") {
  router.post("/register-admin", AdminController.registerAdmin);
// }
router.post("/register-user", upload.single("avatar"), AdminController.registerUser);
router.post("/login-admin", AdminController.loginAdmin);
router.get("/admin-profile", auth(["admin"]), AdminController.getProfile);
router.post("/create-user", auth(["admin"]), upload.single("avatar"), AdminController.createUser);
router.get("/allUsers", auth(["admin"]), AdminController.getAllUsers);
router.get("/getById/:id", auth(["admin"]), AdminController.getUserById);
router.put("/update/:id", auth(["admin"]), upload.single("avatar"), AdminController.updateById);
router.delete("/delete/:id", auth(["admin"]), AdminController.deleteById);
router.get("/exportUser",auth(["admin"]),AdminController.exportUser);
router.get("/exportSingleUser/:id",auth(["admin"]),AdminController.exportSingleUser);

module.exports = router;
