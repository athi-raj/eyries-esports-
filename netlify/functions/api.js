const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const { connectToDatabase } = require("../../server/db");

const authRoutes = require("../../server/routes/auth");
const contentRoutes = require("../../server/routes/content");
const usersRoutes = require("../../server/routes/users");

/*
  NETLIFY FUNCTION: api.js
  -------------------------
  This is the Netlify equivalent of the old server/server.js.
  Same Express app, same routes, same middleware — just exported as a
  serverless handler instead of calling app.listen().

  netlify.toml redirects every request starting with /api/* to this
  function, so the frontend's existing fetch("/api/...") calls work
  completely unchanged — no frontend code had to change for this.
*/

const app = express();
app.use(cors());
app.use(express.json());

// Ensure the database is connected before any route runs.
// connectToDatabase() is cheap to call repeatedly — it reuses the
// cached connection on warm invocations.
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error("Database connection error:", err);
    res.status(500).json({ error: "Could not connect to the database." });
  }
});

// Same routes as before. Netlify strips the "/.netlify/functions/api"
// prefix per our netlify.toml redirect, so paths inside the app are
// identical to the old setup ("/auth/login", "/content", etc. under /api).
app.use("/api/auth", authRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/users", usersRoutes);

module.exports.handler = serverless(app);
