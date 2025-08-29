const express = require('express');
const postRoute = require('../../controller/post');
const adminRoutes = require('../../controller/admin');
const dashboardRoute = require('../../controller/dashboard');
const router = express.Router();

const defaultRoutes = [

  
  {
    path: '/admin',
    route: adminRoutes
  },
   {
    path: '/post',
    route: postRoute,
  },
    {
    path: '/dashboard',
    route: dashboardRoute,
  },
   
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
