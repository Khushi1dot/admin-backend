// middleware/auth.js
const jwt = require("jsonwebtoken");

const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    const token = req.cookies?.admin_token; // <-- now reading from cookie
    if (!token) return res.status(401).json({ msg: "No token provided" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.admin = decoded;

      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ msg: "Access denied" });
      }

      next();
    } catch (err) {
      res.status(401).json({ msg: "Invalid token" });
    }
  };
};

module.exports = authMiddleware;
