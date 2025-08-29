const router = require("express").Router();
const DashboardController = require("./dashboardController");
const auth = require("../../middlewares/authentication");

router.get("/summary", auth(["admin"]), DashboardController.getSummary);
router.get("/userActions", auth(["admin"]), DashboardController.getUserActions);
router.get("/postActivities",auth(["admin"]), DashboardController.getPostActivities);
router.get('/topCategories', auth(["admin"]), DashboardController.getTopCategories);
router.get("/topContributors", auth(["admin"]), DashboardController.getTopContributors);
router.get("/signupsByCountry", auth(["admin"]), DashboardController.getSignupsByCountry);
router.get("/userPostCorrelation", auth(["admin"]), DashboardController.getUserPostCorrelation);

module.exports = router;
