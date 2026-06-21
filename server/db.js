const mongoose = require("mongoose");

/*
  DATABASE CONNECTION (Netlify Functions version)
  -------------------------------------------------
  Netlify Functions are serverless: each request may run in a fresh
  container, or reuse a "warm" one from a previous request. If we
  reconnected to MongoDB on every single request, we'd quickly exhaust
  MongoDB Atlas's connection limit under any real traffic.

  The fix: cache the connection on `global`, so a warm container reuses
  the existing connection instead of opening a new one. A cold container
  (global is empty) connects fresh, exactly like our old server.js did.

  Every function file calls connectToDatabase() at the start of its
  handler, before touching any model. It's safe to call this many times —
  if already connected, it returns immediately without reconnecting.
*/

let cached = global._eyriesMongooseConnection;

if (!cached) {
  cached = global._eyriesMongooseConnection = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set. Add it in Netlify's Environment Variables.");
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        maxPoolSize: 5 // keep small — serverless functions can run many instances in parallel
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connectToDatabase };
