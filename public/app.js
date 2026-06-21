/* =========================================================================
   EYRIES ESPORTS — FRONTEND APP LOGIC
   -------------------------------------------------------------------------
   Talks to the backend API (server/routes/auth.js + content.js + users.js):
     POST /api/auth/login         -> { token, user }
     POST /api/auth/signup        -> { token, user }
     GET  /api/content            -> full content document (any logged-in user)
     PUT  /api/content            -> save edits (admin only, enforced server-side)
     GET  /api/users              -> list all accounts (admin only)
     POST /api/users              -> create a new account directly (admin only)
     PUT  /api/users/:name/role   -> promote/demote a user (admin only)

   Token is stored in localStorage so a refresh keeps you logged in.
   ========================================================================= */

const API_BASE = "/api";
let authToken = localStorage.getItem("eyries_token") || null;
let currentUser = JSON.parse(localStorage.getItem("eyries_user") || "null");
let siteContent = null;
let currentGame = "BGMI";

// Safe to call whether or not anyone is logged in — never throws.
function isAdminUser() {
  return !!(currentUser && currentUser.role === "admin");
}

/* ---------------------------------------------------------------------
   API HELPERS
   --------------------------------------------------------------------- */
async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

/* ---------------------------------------------------------------------
   AUTH: LOGIN / SIGNUP / LOGOUT (optional — viewing never requires this)
   --------------------------------------------------------------------- */
const authScreen = document.getElementById("authScreen");
const appEl = document.getElementById("app");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const authSwitchBtn = document.getElementById("authSwitchBtn");
const authSub = document.getElementById("authSub");
const loginError = document.getElementById("loginError");
const signupError = document.getElementById("signupError");
const openAuthBtn = document.getElementById("openAuthBtn");
const authCloseBtn = document.getElementById("authCloseBtn");
const logoutBtn = document.getElementById("logoutBtn");

function openAuthModal() {
  authScreen.classList.remove("hidden");
  closeNav();
}
function closeAuthModal() {
  authScreen.classList.add("hidden");
  loginError.textContent = "";
  signupError.textContent = "";
}

openAuthBtn.addEventListener("click", openAuthModal);
authCloseBtn.addEventListener("click", closeAuthModal);
authScreen.addEventListener("click", (e) => {
  if (e.target === authScreen) closeAuthModal(); // click outside the card closes it
});

let showingSignup = false;
authSwitchBtn.addEventListener("click", () => {
  showingSignup = !showingSignup;
  loginForm.classList.toggle("hidden", showingSignup);
  signupForm.classList.toggle("hidden", !showingSignup);
  authSub.textContent = showingSignup
    ? "Create a fan account to follow Eyries"
    : "Log in to your account";
  authSwitchBtn.textContent = showingSignup
    ? "Already have an account? Log in"
    : "New here? Create a fan account";
  loginError.textContent = "";
  signupError.textContent = "";
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const btn = loginForm.querySelector(".auth-btn");
  btn.disabled = true;

  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    onLoginSuccess(data);
  } catch (err) {
    loginError.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  signupError.textContent = "";
  const username = document.getElementById("signupUsername").value.trim();
  const password = document.getElementById("signupPassword").value;
  const btn = signupForm.querySelector(".auth-btn");
  btn.disabled = true;

  try {
    const data = await apiRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    onLoginSuccess(data);
  } catch (err) {
    signupError.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

function onLoginSuccess(data) {
  authToken = data.token;
  currentUser = data.user;
  localStorage.setItem("eyries_token", authToken);
  localStorage.setItem("eyries_user", JSON.stringify(currentUser));
  closeAuthModal();
  applyAuthState();
  loadContentAndRender();
}

logoutBtn.addEventListener("click", () => {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("eyries_token");
  localStorage.removeItem("eyries_user");
  closeNav();
  applyAuthState();
  loadContentAndRender();
});

/* ---------------------------------------------------------------------
   APPLY AUTH STATE: show/hide login vs logout, admin tools, role badge
   --------------------------------------------------------------------- */
function applyAuthState() {
  const isLoggedIn = !!(authToken && currentUser);
  const isAdmin = isLoggedIn && currentUser.role === "admin";

  const roleBadge = document.getElementById("roleBadge");
  if (isLoggedIn) {
    roleBadge.textContent = isAdmin ? "Admin" : "Fan";
    roleBadge.classList.toggle("admin", isAdmin);
    roleBadge.classList.remove("hidden");
  } else {
    roleBadge.classList.add("hidden");
  }

  document.body.classList.toggle("admin-mode", isAdmin);

  openAuthBtn.classList.toggle("hidden", isLoggedIn);
  logoutBtn.classList.toggle("hidden", !isLoggedIn);

  const manageAdminsNavBtn = document.getElementById("manageAdminsNavBtn");
  const manageAdminsPanel = document.getElementById("manageAdmins");
  manageAdminsNavBtn.classList.toggle("hidden", !isAdmin);
  manageAdminsPanel.classList.toggle("hidden", !isAdmin);

  if (isAdmin) {
    loadUserList();
  }
}

/* ---------------------------------------------------------------------
   LOAD CONTENT + RENDER: runs on every page load, no login required
   --------------------------------------------------------------------- */
async function loadContentAndRender() {
  try {
    siteContent = await apiRequest("/content");
  } catch (err) {
    showToast("Could not load site content. Try refreshing.");
    return;
  }
  renderAll();
}

document.getElementById("yearNow").textContent = new Date().getFullYear();
applyAuthState();
loadContentAndRender();

/* ---------------------------------------------------------------------
   HAMBURGER NAV + SCROLL-TO-SECTION
   --------------------------------------------------------------------- */
const hamburgerBtn = document.getElementById("hamburgerBtn");
const navDrawer = document.getElementById("navDrawer");
const navOverlay = document.getElementById("navOverlay");

function openNav() {
  navDrawer.classList.add("open");
  navOverlay.classList.add("open");
  hamburgerBtn.classList.add("open");
  hamburgerBtn.setAttribute("aria-expanded", "true");
}
function closeNav() {
  navDrawer.classList.remove("open");
  navOverlay.classList.remove("open");
  hamburgerBtn.classList.remove("open");
  hamburgerBtn.setAttribute("aria-expanded", "false");
}
hamburgerBtn.addEventListener("click", () => {
  navDrawer.classList.contains("open") ? closeNav() : openNav();
});
navOverlay.addEventListener("click", closeNav);

document.querySelectorAll(".navlink[data-target]").forEach((link) => {
  link.addEventListener("click", () => {
    const target = document.getElementById(link.dataset.target);
    if (target) target.scrollIntoView({ behavior: "smooth" });
    closeNav();
  });
});

document.querySelectorAll("[data-scrollto]").forEach((el) => {
  el.addEventListener("click", () => {
    const target = document.getElementById(el.dataset.scrollto);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  });
});

/* ---------------------------------------------------------------------
   RENDERING
   --------------------------------------------------------------------- */
function initials(name) {
  if (!name) return "?";
  return name
    .replace(/\[|\]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function photoStyle(photoUrl) {
  return photoUrl ? `style="background-image:url('${photoUrl}')"` : "";
}

function renderPersonCard(person, { editPrefix } = {}) {
  const editAttrs = editPrefix
    ? `data-edit-group="${editPrefix}"`
    : "";
  return `
    <div class="person-card" ${editAttrs}>
      <div class="person-photo" data-edit-field="${editPrefix}.photoUrl" data-edit-type="photo" ${photoStyle(person.photoUrl)}>
        ${person.photoUrl ? "" : initials(person.name)}
      </div>
      <div class="person-info">
        <div class="person-name" data-edit-field="${editPrefix}.name" data-edit-type="text">${person.name || "[Name]"}</div>
        <div class="person-title" data-edit-field="${editPrefix}.title" data-edit-type="text">${person.title || "[Title]"}</div>
        <div class="person-bio" data-edit-field="${editPrefix}.bio" data-edit-type="textarea">${person.bio || "[Bio]"}</div>
      </div>
    </div>
  `;
}

function renderTrophyCard(item, index) {
  const prefix = `achievements.${index}`;
  return `
    <div class="trophy-card">
      <div class="trophy-photo" data-edit-field="${prefix}.photoUrl" data-edit-type="photo" ${photoStyle(item.photoUrl)}>
        ${item.photoUrl ? "" : "TROPHY"}
      </div>
      <div class="trophy-info">
        <div class="trophy-top">
          <div class="trophy-title" data-edit-field="${prefix}.title" data-edit-type="text">${item.title || "[Achievement]"}</div>
          <div class="trophy-year" data-edit-field="${prefix}.year" data-edit-type="text">${item.year || "[Year]"}</div>
        </div>
        <div class="trophy-event" data-edit-field="${prefix}.event" data-edit-type="text">${item.event || "[Event]"}</div>
        <div class="trophy-desc" data-edit-field="${prefix}.description" data-edit-type="textarea">${item.description || "[Description]"}</div>
      </div>
    </div>
  `;
}

function renderPlayerCard(player, prefix) {
  return `
    <div class="player-card-sq">
      <div class="player-photo-sq" data-edit-field="${prefix}.photoUrl" data-edit-type="photo" ${photoStyle(player.photoUrl)}>
        ${player.photoUrl ? "" : initials(player.name)}
      </div>
      <div class="player-name-sq" data-edit-field="${prefix}.name" data-edit-type="text">${player.name || "[Player name]"}</div>
      <div class="player-gamingid-sq" data-edit-field="${prefix}.gamingId" data-edit-type="text">${player.gamingId || "[Gaming ID]"}</div>
      <div class="player-role-sq" data-edit-field="${prefix}.role" data-edit-type="text">${player.role || "[Role]"}</div>
    </div>
  `;
}

function renderAnnouncementCard(item, prefix) {
  return `
    <div class="announcement-card">
      <div class="announcement-top">
        <div class="announcement-title" data-edit-field="${prefix}.title" data-edit-type="text">${item.title || "[Announcement title]"}</div>
        <div class="announcement-date" data-edit-field="${prefix}.date" data-edit-type="text">${item.date || "[Date]"}</div>
      </div>
      <div class="announcement-body" data-edit-field="${prefix}.body" data-edit-type="textarea">${item.body || "[Details]"}</div>
    </div>
  `;
}

function renderSquads() {
  const squad = (siteContent.squads && siteContent.squads[currentGame]) || { players: [], announcements: [] };
  const squadPrefix = `squads.${currentGame}`;

  document.querySelectorAll(".game-switch-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.game === currentGame);
  });

  const players = squad.players || [];
  document.getElementById("playerGrid").innerHTML = players.length
    ? players.map((p, i) => renderPlayerCard(p, `${squadPrefix}.players.${i}`)).join("")
    : `<div class="empty-note">No players added for ${currentGame} yet.</div>`;

  const announcements = squad.announcements || [];
  document.getElementById("announcementList").innerHTML = announcements.length
    ? announcements.map((a, i) => renderAnnouncementCard(a, `${squadPrefix}.announcements.${i}`)).join("")
    : `<div class="empty-note">No announcements for ${currentGame} yet.</div>`;

  attachEditHandlers();

  document.querySelectorAll('.admin-add-btn[data-add="player"], .admin-add-btn[data-add="announcement"]').forEach((btn) => {
    btn.classList.toggle("hidden", !isAdminUser());
  });
}

document.querySelectorAll(".game-switch-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentGame = btn.dataset.game;
    renderSquads();
  });
});

function renderAll() {
  const c = siteContent;

  // Hero
  document.querySelector('[data-edit-field="hero.tagline"]').textContent = c.hero?.tagline || "";
  document.querySelector('[data-edit-field="hero.headline"]').textContent = c.hero?.headline || "";
  document.querySelector('[data-edit-field="hero.subtext"]').textContent = c.hero?.subtext || "";

  // Founder
  document.getElementById("founderCard").innerHTML = renderPersonCard(c.founder || {}, { editPrefix: "founder" });

  // Co-founders
  document.getElementById("coFoundersGrid").innerHTML = (c.coFounders || [])
    .map((p, i) => renderPersonCard(p, { editPrefix: `coFounders.${i}` }))
    .join("");

  // Team
  document.getElementById("teamGrid").innerHTML = (c.team || [])
    .map((p, i) => renderPersonCard(p, { editPrefix: `team.${i}` }))
    .join("");

  // Achievements
  document.getElementById("trophyList").innerHTML = (c.achievements || [])
    .map((a, i) => renderTrophyCard(a, i))
    .join("");

  // Squads (players + announcements for the currently selected game)
  renderSquads();

  // Contact
  const contact = c.contact || {};
  const contactRows = [
    ["Email", contact.email],
    ["Phone", contact.phone],
    ["Address", contact.address]
  ].filter(([, v]) => v);

  document.getElementById("contactGrid").innerHTML = [
    rowHtml("Email", contact.email, "contact.email"),
    rowHtml("Phone", contact.phone, "contact.phone"),
    rowHtml("Address", contact.address, "contact.address")
  ].join("");

  const socials = [
    ["Instagram", contact.instagram, "contact.instagram"],
    ["Twitter / X", contact.twitter, "contact.twitter"],
    ["YouTube", contact.youtube, "contact.youtube"],
    ["Discord", contact.discord, "contact.discord"]
  ];
  document.getElementById("socialRow").innerHTML = socials
    .map(([label, url, field]) => {
      if (isAdminUser()) {
        return `<a class="social-pill" href="${url || "#"}" target="_blank" rel="noopener" data-edit-field="${field}" data-edit-type="text">${label}</a>`;
      }
      return url ? `<a class="social-pill" href="${url}" target="_blank" rel="noopener">${label}</a>` : "";
    })
    .join("");

  attachEditHandlers();

  // Show admin-only "add" buttons
  document.querySelectorAll(".admin-add-btn").forEach((btn) => {
    btn.classList.toggle("hidden", !isAdminUser());
  });
}

function rowHtml(label, value, field) {
  return `
    <div class="contact-row">
      <span class="contact-label">${label}</span>
      <span class="contact-value" data-edit-field="${field}" data-edit-type="text">${value || "[Add " + label.toLowerCase() + "]"}</span>
    </div>
  `;
}

/* ---------------------------------------------------------------------
   ADMIN "+ ADD" BUTTONS (team, achievements, players, announcements)
   --------------------------------------------------------------------- */
const blankItemFor = {
  team: () => ({ name: "", title: "", bio: "", photoUrl: "" }),
  achievements: () => ({ title: "", event: "", year: "", description: "", photoUrl: "" }),
  player: () => ({ name: "", gamingId: "", role: "", photoUrl: "" }),
  announcement: () => ({ title: "", body: "", date: "" })
};

document.querySelectorAll(".admin-add-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const kind = btn.dataset.add;
    const makeBlank = blankItemFor[kind];
    if (!makeBlank) return;

    if (kind === "team") {
      siteContent.team = siteContent.team || [];
      siteContent.team.push(makeBlank());
    } else if (kind === "achievements") {
      siteContent.achievements = siteContent.achievements || [];
      siteContent.achievements.push(makeBlank());
    } else if (kind === "player") {
      siteContent.squads = siteContent.squads || {};
      siteContent.squads[currentGame] = siteContent.squads[currentGame] || { players: [], announcements: [] };
      siteContent.squads[currentGame].players = siteContent.squads[currentGame].players || [];
      siteContent.squads[currentGame].players.push(makeBlank());
    } else if (kind === "announcement") {
      siteContent.squads = siteContent.squads || {};
      siteContent.squads[currentGame] = siteContent.squads[currentGame] || { players: [], announcements: [] };
      siteContent.squads[currentGame].announcements = siteContent.squads[currentGame].announcements || [];
      siteContent.squads[currentGame].announcements.push(makeBlank());
    }

    try {
      await apiRequest("/content", {
        method: "PUT",
        body: JSON.stringify(siteContent)
      });
      showToast("Added — click its fields to fill them in.");
      renderAll();
    } catch (err) {
      showToast(err.message || "Could not save. Try again.");
    }
  });
});

/* ---------------------------------------------------------------------
   ADMIN INLINE EDITING
   --------------------------------------------------------------------- */
const editModalOverlay = document.getElementById("editModalOverlay");
const editModalTitle = document.getElementById("editModalTitle");
const editModalTextarea = document.getElementById("editModalTextarea");
const editModalCancel = document.getElementById("editModalCancel");
const editModalSave = document.getElementById("editModalSave");

let activeEditField = null;
let activeEditType = null;

function attachEditHandlers() {
  if (!isAdminUser()) return;

  document.querySelectorAll("[data-edit-field]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openEditModal(el);
    });
  });
}

function getValueByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}
function setValueByPath(obj, path, value) {
  const keys = path.split(".");
  let target = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (target[key] == null) target[key] = {};
    target = target[key];
  }
  target[keys[keys.length - 1]] = value;
}

function openEditModal(el) {
  activeEditField = el.dataset.editField;
  activeEditType = el.dataset.editType;

  const currentValue = getValueByPath(siteContent, activeEditField) || "";
  editModalTitle.textContent =
    activeEditType === "photo" ? "Paste a photo URL" : `Edit: ${activeEditField}`;
  editModalTextarea.value = currentValue;
  editModalTextarea.placeholder =
    activeEditType === "photo" ? "https://example.com/photo.jpg" : "";
  editModalOverlay.classList.remove("hidden");
  editModalTextarea.focus();
}

editModalCancel.addEventListener("click", () => {
  editModalOverlay.classList.add("hidden");
});

editModalSave.addEventListener("click", async () => {
  const newValue = editModalTextarea.value.trim();
  setValueByPath(siteContent, activeEditField, newValue);
  editModalOverlay.classList.add("hidden");

  try {
    await apiRequest("/content", {
      method: "PUT",
      body: JSON.stringify(siteContent)
    });
    showToast("Saved.");
    renderAll();
  } catch (err) {
    showToast(err.message || "Could not save. Try again.");
  }
});

/* ---------------------------------------------------------------------
   TOAST
   --------------------------------------------------------------------- */
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

/* ---------------------------------------------------------------------
   MANAGE ADMINS (admin only)
   --------------------------------------------------------------------- */
async function loadUserList() {
  try {
    const users = await apiRequest("/users");
    renderUserList(users);
  } catch (err) {
    showToast(err.message || "Could not load accounts.");
  }
}

function renderUserList(users) {
  const listEl = document.getElementById("userList");

  if (!users.length) {
    listEl.innerHTML = `<div class="empty-note">No accounts yet.</div>`;
    return;
  }

  listEl.innerHTML = users
    .map((u) => {
      const isSelf = u.username === currentUser.username;
      const isAdminUser = u.role === "admin";
      const joined = u.createdAt
        ? new Date(u.createdAt).toLocaleDateString()
        : "";

      const actionButton = isAdminUser
        ? `<button class="role-toggle-btn remove-admin" data-username="${u.username}" data-newrole="user" ${isSelf ? "disabled title=\"You can't remove your own admin access\"" : ""}>Remove admin</button>`
        : `<button class="role-toggle-btn make-admin" data-username="${u.username}" data-newrole="admin">Make admin</button>`;

      return `
        <div class="user-row">
          <div class="user-row-info">
            <div class="user-row-name">${u.username}${isSelf ? " (you)" : ""}</div>
            <div class="user-row-meta">Joined ${joined}</div>
          </div>
          <div class="user-row-actions">
            <span class="user-role-pill ${isAdminUser ? "admin" : ""}">${isAdminUser ? "Admin" : "Fan"}</span>
            ${actionButton}
          </div>
        </div>
      `;
    })
    .join("");

  listEl.querySelectorAll(".role-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const username = btn.dataset.username;
      const newRole = btn.dataset.newrole;
      btn.disabled = true;

      try {
        await apiRequest(`/users/${encodeURIComponent(username)}/role`, {
          method: "PUT",
          body: JSON.stringify({ role: newRole })
        });
        showToast(newRole === "admin" ? `${username} is now an admin.` : `${username}'s admin access removed.`);
        loadUserList();
      } catch (err) {
        showToast(err.message || "Could not update that account.");
        btn.disabled = false;
      }
    });
  });
}

const adminCreateForm = document.getElementById("adminCreateForm");
const adminCreateError = document.getElementById("adminCreateError");

adminCreateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  adminCreateError.textContent = "";

  const username = document.getElementById("newAccUsername").value.trim();
  const password = document.getElementById("newAccPassword").value;
  const isAdmin = document.getElementById("newAccIsAdmin").checked;
  const submitBtn = adminCreateForm.querySelector(".auth-btn");
  submitBtn.disabled = true;

  try {
    await apiRequest("/users", {
      method: "POST",
      body: JSON.stringify({ username, password, role: isAdmin ? "admin" : "user" })
    });
    showToast(`Account "${username}" created.`);
    adminCreateForm.reset();
    loadUserList();
  } catch (err) {
    adminCreateError.textContent = err.message || "Could not create account.";
  } finally {
    submitBtn.disabled = false;
  }
});
