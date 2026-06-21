# Eyries Esports — Netlify Version (A–Z Guide)

This is the same site and database as before, restructured to run on **Netlify** instead of Render — so it no longer has the 30–50 second "waking up" screen after inactivity.

**Nothing about how the site looks or works has changed.** Same login, same admin tools, same Squads section, same MongoDB database (you'll point it at the same database you already have — your existing content stays exactly as it is).

---

## Before you start

You should already have:
- A MongoDB Atlas database (you already set this up earlier)
- Your real `MONGODB_URI` connection string, with your real password (you have this from before)
- A GitHub account (you already have one: `athi-raj`)

---

## Step 1 — Get this new project onto GitHub

1. Unzip the file I gave you. You'll get a folder called `eyries-netlify`.
2. Go to **github.com**, make sure you're logged in as `athi-raj`.
3. Click **"+"** → **"New repository"**.
4. Name it: `eyries-netlify-app`
5. Keep it **Public**. Don't check the README box. Click **"Create repository"**.
6. Open the `eyries-netlify` folder in **VS Code** (File → Open Folder).
7. Open the built-in terminal (Terminal menu → New Terminal).
8. Run these one at a time:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/athi-raj/eyries-netlify-app.git
   git push -u origin main
   ```
   (If it asks you to sign in, sign in as `athi-raj`.)

You should see a success message ending in something like `main -> main`.

---

## Step 2 — Create your Netlify account

1. Go to **netlify.com**
2. Click **"Sign up"**
3. Choose **"Sign up with GitHub"** — approve the permission popup as `athi-raj`

---

## Step 3 — Connect your new repo to Netlify

1. On Netlify's dashboard, click **"Add new site"** → **"Import an existing project"**
2. Choose **"Deploy with GitHub"**
3. Find and click on `eyries-netlify-app` in the list
4. Netlify will show build settings — it should auto-detect everything correctly from the `netlify.toml` file already in the project (Build command: `npm install`, Publish directory: `public`). **Don't change these.**
5. **Don't click Deploy yet** — scroll down first.

---

## Step 4 — Add your environment variables

Still on that same setup screen, find **"Environment variables"** (sometimes under "Advanced" or shown as its own section).

Click **"New variable"** and add these four, one at a time — same values as your old Render setup:

| Key | Value |
|---|---|
| `MONGODB_URI` | your full MongoDB connection string (same one as before, with your real password) |
| `JWT_SECRET` | the same random string you used before |
| `SEED_ADMIN_USERNAME` | `admin` |
| `SEED_ADMIN_PASSWORD` | your chosen admin password |

---

## Step 5 — Deploy

Click **"Deploy [site name]"** (the big button, now that variables are set).

Netlify will show a build log. Wait for it to say **"Site is live"** — this usually takes 1-3 minutes.

---

## Step 6 — Get your real link

Once deployed, Netlify shows you a random URL like:
```
https://chimerical-name-123abc.netlify.app
```

You can rename this to something nicer:
1. Go to **Site settings** → **Change site name**
2. Type something like `eyries-esports` → it becomes `eyries-esports.netlify.app`

---

## Step 7 — Create your admin login (one-time)

Your live database already has your admin account and content from before — **if you're pointing at the same MongoDB database as your Render setup**, you don't need to do anything here, it already works. Skip to Step 8.

**Only if this is a brand-new, empty database**, run this once from your computer:
```
npm install
npm run seed
```

---

## Step 8 — Test it

Open your new Netlify link in an **incognito/private window**:
- The site should load **immediately** — no "waking up" screen
- Open the hamburger menu, log in as admin, confirm your existing content (founder, squads, etc.) is all still there

---

## What changed technically (for your own understanding)

- `server/server.js` (the old always-running server) is gone — replaced by `netlify/functions/api.js`, which does the same job but only runs when a request comes in
- `server/db.js` is new — it makes sure your app reuses one database connection instead of opening a new one on every single request (this is what makes serverless hosting work safely with MongoDB)
- `netlify.toml` is new — it tells Netlify "any request to `/api/...` should go to that function"
- Every route, model, and the entire frontend (`app.js`, `index.html`, `styles.css`) are **completely unchanged** from your Render version

## If something goes wrong

Copy the exact error text from Netlify's build log (or your browser's console) and send it over — same as we've done throughout this whole project.
