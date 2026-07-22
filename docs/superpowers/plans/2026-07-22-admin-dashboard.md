# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a password-protected, read-only dashboard for expo and salon registrations with search, filters, details, and CSV export.

**Architecture:** Add signed-cookie authentication and a unified submissions API to the existing Express server. Add a standalone mobile-first `public/admin.html` that consumes the protected API and performs client-side filtering and CSV generation.

**Tech Stack:** Node.js, Express, PostgreSQL/Neon, built-in Node crypto, static HTML/CSS/JavaScript, Node test runner.

---

### Task 1: Authentication Tests and Server Support

**Files:**
- Create: `tests/admin-server.test.mjs`
- Modify: `server.js`
- Modify: `render.yaml`

- [ ] Write integration tests for missing configuration, unauthorized API access, wrong password, correct login, signed session, logout, and login throttling.
- [ ] Add constant-time password comparison, HMAC-signed 8-hour Cookie sessions, and an in-memory 5-attempt/15-minute limiter.
- [ ] Add `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` as `sync: false` Render variables.
- [ ] Run the admin server tests and confirm they pass.

### Task 2: Unified Data API

**Files:**
- Modify: `server.js`
- Modify: `tests/admin-server.test.mjs`

- [ ] Test that authenticated admins receive both expo and salon records in a normalized newest-first response.
- [ ] Add table initialization helpers shared by save and read operations.
- [ ] Add PostgreSQL and JSON fallback readers for both submission types.
- [ ] Add `GET /api/admin/submissions` protected by the session middleware.

### Task 3: Admin Page

**Files:**
- Create: `public/admin.html`
- Create: `tests/admin-page.test.mjs`

- [ ] Test the login form, summary counters, type filters, search, refresh, export, detail dialog, and logout contracts.
- [ ] Build the mobile-first page with a compact desktop table and mobile list layout.
- [ ] Implement authenticated loading, client-side search/filtering, escaped rendering, CSV export, details, and session expiry handling.
- [ ] Add a no-index directive and ensure no password is present in client source.

### Task 4: Verify and Deploy

**Files:**
- Verify: `server.js`, `public/admin.html`, `render.yaml`, `tests/*.test.mjs`

- [ ] Run `npm test`, `node --check server.js`, inline admin script syntax validation, and `git diff --check`.
- [ ] Inspect `/admin` at 390px and desktop widths with the local server.
- [ ] Commit, merge to `main`, push, configure the two Render secrets, and verify the live login and data API.
