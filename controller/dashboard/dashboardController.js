const User = require("../../models/user.model");
const Post = require("../../models/post.model");
const dayjs = require("dayjs");
const catchAsync = require("../../utils/catchAsync");

// Helper: get from/to dates from query, default last 7 days
const getFilterDates = (query) => {
  const to = query.to ? dayjs(query.to).endOf("day") : dayjs();
  const from = query.from
    ? dayjs(query.from).startOf("day")
    : dayjs(to).subtract(7, "day").startOf("day");
  return { from, to };
};

// Helper: generate array of dates between from and to
const getDateRange = (from, to) => {
  const dates = [];
  let current = from;
  while (current.isBefore(to) || current.isSame(to, "day")) {
    dates.push(current.format("YYYY-MM-DD"));
    current = current.add(1, "day");
  }
  return dates;
};

class DashboardController {
  // Dashboard summary
  static getSummary = catchAsync(async (req, res) => {
    const adminName = req.admin?.name;
    const { from, to } = getFilterDates(req.query);
  
    const dateFilter = {
  $or: [
    { createdAt: { $gte: from.toDate(), $lte: to.toDate() } },
    { updatedAt: { $gte: from.toDate(), $lte: to.toDate() } }
  ]
};


    // General counts (all-time)
    const totalPosts = await Post.countDocuments(dateFilter);
    // Count non-deleted users created within the date range
    const totalUsers = await User.countDocuments({
      role: "user",
      isDeleted: false,
    ...dateFilter,
    });

    // Count deleted users created within the date range
    const deletedUsers = await User.countDocuments({
      role: "user",
      isDeleted: true,
      deletedAt: { $gte: from.toDate(), $lte: to.toDate() },
    });

    const totalCommentsAgg = await Post.aggregate([
      { $unwind: "$comments" },
      {
        $match: {
        "comments.createdAt": {
      $gte: from.startOf('day').toDate(),
      $lte: to.endOf('day').toDate()
    }
        },
      },
      { $count: "total" },
    ]);
    
    const totalComments = totalCommentsAgg[0]?.total || 0;

    const totalCategories = await Post.distinct("categories", dateFilter);

    res.status(200).json({
      success: true,
      message: "Dashboard summary fetched successfully",
      welcomeMessage: `Welcome back, ${adminName}!`,
      totalPosts,
      totalUsers,
      deletedUsers,
      totalComments,
      totalCategories: totalCategories.length,
    });
  });

  // Recent user actions
  static getUserActions = catchAsync(async (req, res) => {
    const { from, to } = getFilterDates(req.query);
    const users = await User.find({
      updatedAt: { $gte: from.toDate(), $lte: to.toDate() },
    })
      .sort({ updatedAt: -1 })
      .select("name email avatar isDeleted status updatedAt");

    const actions = users.map((user) => {
      let action = "updated";
      if (user.isDeleted) action = "deleted";
      else if (user.status === "inactive") action = "banned";

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        action,
        updatedAt: user.updatedAt,
      };
    });

    res.status(200).json({ success: true, actions });
  });

  // Recent post activities
  static getPostActivities = catchAsync(async (req, res) => {
    const { from, to } = getFilterDates(req.query);
    const posts = await Post.find({
      createdAt: { $gte: from.toDate(), $lte: to.toDate() },
    })
      .sort({ createdAt: -1 })
      .populate("user", "name email avatar");

    const activities = posts.map((post) => ({
      _id: post._id,
      title: post.title,
      user: post.user
        ? {
            _id: post.user._id,
            name: post.user.name,
            email: post.user.email,
            avatar: post.user.avatar,
          }
        : null,
      activity: "new",
      createdAt: post.createdAt,
    }));

    res.status(200).json({ success: true, activities });
  });

  // Top categories
  static getTopCategories = catchAsync(async (req, res) => {
    const { from, to } = getFilterDates(req.query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const skip = (page - 1) * limit;

    const dateFilter = {
      createdAt: { $gte: from.toDate(), $lte: to.toDate() },
    };

    // Get all category counts
    const fullCategories = await Post.aggregate([
      { $match: dateFilter },
      { $unwind: "$categories" },
      { $group: { _id: "$categories", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const paginatedCategories = fullCategories.slice(skip, skip + limit);

    // Calculate total number of posts across all top categories
    const totalPostCount = fullCategories.reduce(
      (acc, curr) => acc + curr.count,
      0
    );

    res.status(200).json({
      success: true,
      categories: paginatedCategories.map((item) => ({
        category: item._id,
        count: item.count,
      })),
      total: fullCategories.length,
      totalPostCount,
    });
  });

  // Top contributors
  static getTopContributors = catchAsync(async (req, res) => {
    const { from, to } = getFilterDates(req.query);
    const dateFilter = {
      createdAt: { $gte: from.toDate(), $lte: to.toDate() },
    };

    const topUsers = await Post.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$user", postCount: { $sum: 1 } } },
      { $sort: { postCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "user's",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          _id: 0,
          userId: "$userInfo._id",
          name: "$userInfo.name",
          email: "$userInfo.email",
          avatar: "$userInfo.avatar",
          postCount: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, contributors: topUsers });
  });

  // Recent signups by country
  static getSignupsByCountry = catchAsync(async (req, res) => {
    const { from, to } = getFilterDates(req.query);

    const recentSignups = await User.aggregate([
  {
    $match: {
      role: "user",
      isDeleted: false,
      country: { $ne: null }, // Must have a country now
      updatedAt: {
        $gte: from.startOf('day').toDate(),
        $lte: to.endOf('day').toDate()
      }
    }
  },
  { $sort: { updatedAt: -1 } },
  {
    $group: {
      _id: { $toUpper: "$country" },
      count: { $sum: 1 },
      latestSignup: { $first: "$updatedAt" },
      users: {
        $push: {
          name: "$name",
          avatar: "$avatar",
          createdAt: "$createdAt",
          updatedAt: "$updatedAt"
        }
      }
    }
  },
  {
    $project: {
      _id: 0,
      country: "$_id",
      count: 1,
      latestSignup: 1,
      users: 1
    }
  },
  { $sort: { latestSignup: -1 } }
])

    res.status(200).json({ success: true, countries: recentSignups });
  });

  // User-post correlation
  static getUserPostCorrelation = catchAsync(async (req, res) => {
    const { from, to } = getFilterDates(req.query);
    const dates = getDateRange(from, to);

    const data = await Promise.all(
      dates.map(async (date) => {
        const next = dayjs(date).add(1, "day").toDate();

        const userCount = await User.countDocuments({
          role: "user",
          createdAt: { $gte: new Date(date), $lt: next },
        });
        const postCount = await Post.countDocuments({
          createdAt: { $gte: new Date(date), $lt: next },
        });

        return { date, userCount, postCount };
      })
    );

    res.status(200).json({ success: true, data });
  });
}

module.exports = DashboardController;
