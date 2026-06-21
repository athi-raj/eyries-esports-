const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

/*
  All routes in this file require requireAuth + requireAdmin —
  only an already-logged-in admin can list, create, promote, or demote
  user accounts. This is enforced on the server, so even if someone
  tampers with the frontend, these calls are rejected with 403.
*/

/*
  GET /api/users
  ---------------
  Returns every account (username + role + createdAt), never the password
  hash. Used to populate the "Manage Admins" list in the admin panel.
*/
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "username role createdAt").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Could not load accounts." });
  }
});

/*
  POST /api/users
  ----------------
  Body: { username, password, role }
  Creates a brand-new account directly as admin (or user). This is how an
  existing admin adds a co-admin without touching the server or .env file.
*/
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    if (role && !["admin", "user"].includes(role)) {
      return res.status(400).json({ error: "Role must be 'admin' or 'user'." });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(409).json({ error: "That username is already taken." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: cleanUsername,
      passwordHash,
      role: role === "admin" ? "admin" : "user"
    });

    res.status(201).json({
      username: user.username,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Could not create account. Try again." });
  }
});

/*
  PUT /api/users/:username/role
  -------------------------------
  Body: { role }
  Promotes a "user" to "admin", or demotes an "admin" back to "user".
  Used by the "Make admin" / "Remove admin" buttons in the panel.

  Safety check: an admin cannot demote their own account — this prevents
  someone accidentally locking themselves out with no admin left to fix it.
*/
router.put("/:username/role", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const targetUsername = req.params.username.trim().toLowerCase();

    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ error: "Role must be 'admin' or 'user'." });
    }

    if (targetUsername === req.user.username && role === "user") {
      return res.status(400).json({ error: "You can't remove your own admin access." });
    }

    const user = await User.findOneAndUpdate(
      { username: targetUsername },
      { $set: { role } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }

    res.json({ username: user.username, role: user.role });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ error: "Could not update role. Try again." });
  }
});

module.exports = router;
