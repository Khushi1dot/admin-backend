const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const cors = require("cors");
const cookieParser = require('cookie-parser');


const routes = require("./router/v1/index");
const app = express();
app.use(cookieParser());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const allowedOrigins = [
  "http://localhost:3000",                  
   process.env.FRONTEND_URL    
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
mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log('Connected to Atlas!');
  })
  .catch(err => {
    console.error('Error connecting to Atlas:', err);
  });

// Routes
app.use("/v1", routes);

// Start server
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
