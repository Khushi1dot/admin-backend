const express = require('express');
const postRoute = require('../../controller/post');
const adminRoutes = require('../../controller/admin');
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
   
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
