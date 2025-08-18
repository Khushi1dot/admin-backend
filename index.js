const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const cors = require("cors");
const cookieParser = require('cookie-parser');


const routes = require("./router/v1/index");
const app = express();
app.use(cookieParser());
// Middleware
app.use(express.json());
// app.use(cors({
//   origin: function (origin, callback) {
//     const allowedOrigins = ["http://localhost:3000"];
//     if (allowedOrigins.includes(origin) || !origin) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   }
// }));

app.use('/uploads', express.static('uploads'));

const allowedOrigins = [
  "http://localhost:3000",                    // for local dev
   process.env.FRONTEND_URL      // production domain
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));


// Connect DB
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected Successfully..."))
  .catch(err => console.log(err));

// Routes
app.use("/v1", routes);

// Start server
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
