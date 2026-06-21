const jwt = require("jsonwebtoken");

/*
  AUTH MIDDLEWARE
  ---------------
  requireAuth: checks the request carries a valid login token.
  requireAdmin: on top of requireAuth, also checks role === "admin".

  The token is read from the "Authorization: Bearer <token>" header.
  This is what actually enforces "admin can edit, user cannot" — it happens
  on the server, not just by hiding buttons in the browser, so a user can't
  bypass it just by editing the page's JavaScript.
*/

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Not logged in." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
