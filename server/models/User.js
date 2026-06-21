const mongoose = require("mongoose");

/*
  USER MODEL
  ----------
  Stores login credentials. Passwords are NEVER stored in plain text —
  they're hashed with bcrypt before saving (see server/routes/auth.js).
  role is either "admin" (can edit site content) or "user" (view only).
*/

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
