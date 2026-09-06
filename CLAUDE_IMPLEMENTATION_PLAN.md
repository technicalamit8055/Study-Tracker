# Implementation Plan for Claude Code: "ExamRoadmap" Multi-Exam Prep & Study Platform

## Project Overview

Transform the single-exam **Bihar STET 2026 Psychology Tracker** into **"ExamRoadmap"**—a multi-exam roadmap and study guidance platform for students preparing for **competitive exams** (STET, CTET, UPSC, SSC, Banking, JEE, NEET) and **school exams** (Class 10 & 12 Boards).

Rather than an over-complicated developer flowchart, the platform provides a **structured, guided exam preparation path** featuring:
1. **Phased Learning Journey:** Phase 1: Foundations & NCERTs ➔ Phase 2: High-Yield Scoring Units (80/20 Rule) ➔ Phase 3: PYQ Mastery & Mock Revision.
2. **Syllabus & Weightage Intelligence:** Topic-wise marks, question frequency, and difficulty priority.
3. **Study & Revision Tracker:** 3-tier revision counter (Spaced Repetition: 24h, 7d, 30d), PYQ checklist, confidence stars, topic notes, and 1-click YouTube lecture launcher.
4. **Focus Tools:** Integrated Pomodoro study timer and progress analytics.
5. **Multi-Platform:** Web-first (responsive, installable PWA) ➔ Mobile App (React Native / Expo).

---

## Technical Architecture & File Structure

```
STET-2 TRACKER/
├── CLAUDE_IMPLEMENTATION_PLAN.md     # Master instructions for Claude Code
├── data/
│   ├── exams/                        # Modular JSON datasets for each exam
│   │   ├── bihar-stet-psychology.json
│   │   ├── ctet-paper2-cdp.json
│   │   ├── ssc-cgl-tier1.json
│   │   └── cbse-class12-physics.json
│   └── exams-catalog.json            # Registry of all available exams
├── public/
│   ├── manifest.json                 # PWA Web Manifest
│   ├── sw.js                         # Service Worker for offline-first support
│   └── icons/                        # App icons for web and mobile
├── api/
│   ├── auth/                         # Existing auth routes (register, login, me)
│   ├── progress.js                   # Updated to support multi-exam progress
│   ├── exams.js                      # API to fetch exam roadmaps
│   └── health.js
├── src/ (or modular client scripts)
│   ├── state.js                      # Central state manager (active exam, user progress, offline sync)
│   ├── roadmap-renderer.js           # Phased roadmap and milestone UI renderer
│   ├── study-drawer.js               # Topic detail modal/drawer (notes, revisions, YT links)
│   └── catalog-modal.js              # Exam switcher and search modal
├── index.html                        # Main single-page application shell
├── server.js                         # Express dev & production server
└── vercel.json                       # Serverless config
```

---

## Phased Execution Roadmap for Claude Code

### Phase 1: Universal Exam & Roadmap Data Schema
**Objective:** Decouple the hardcoded Bihar STET syllabus from HTML into clean, modular JSON schemas.

- **Tasks:**
  1. Create `data/exams/bihar-stet-psychology.json` with the schema:
     ```json
     {
       "id": "bihar-stet-psychology",
       "title": "Bihar STET 2026: Paper 2 (Psychology)",
       "category": "Teaching Exams",
       "totalMarks": 150,
       "passingMarks": 75,
       "targetAudience": "Class 11-12 Higher Secondary Teachers",
       "phases": [
         {
           "id": "phase-1",
           "name": "Phase 1: Foundations & Core Concepts",
           "description": "Establish conceptual baseline before diving into high-yield topics",
           "units": [ ... ]
         },
         {
           "id": "phase-2",
           "name": "Phase 2: High-Yield Scoring Units (80/20)",
           "description": "Units carrying 60%+ of exam weightage",
           "units": [ ... ]
         },
         {
           "id": "phase-3",
           "name": "Phase 3: Pedagogy, Art of Teaching & General Skills",
           "description": "Compulsory 50-mark section",
           "units": [ ... ]
         }
       ]
     }
     ```
  2. Create `data/exams-catalog.json` listing categories:
     - *Teaching Exams* (Bihar STET, CTET, UP TET)
     - *Civil Services & State PSCs* (UPSC Prelims, BPSC)
     - *SSC & Railways* (SSC CGL, CHSL, RRB)
     - *School & Board Exams* (CBSE Class 10 & 12)
     - *Engineering & Medical* (JEE Main, NEET)
  3. Create at least one additional seed roadmap (e.g., `data/exams/ctet-paper2-cdp.json` or `data/exams/ssc-cgl-tier1.json`) to validate multi-exam functionality.

- **Acceptance Criteria:**
  - JSON schemas validate with clear IDs, unit weightage, topic checklists, and resource queries.

---

### Phase 2: Exam Catalog & Active Roadmap Switcher UI
**Objective:** Allow students to browse available exams, switch roadmaps, and save their active exam selection.

- **Tasks:**
  1. Add a top navigation bar with:
     - **Active Exam Badge / Switcher Button** (e.g., "🎯 Bihar STET 2026 [Switch Exam]").
     - **Exam Category Filter** (Teaching, SSC, Boards, etc.).
     - Search bar to quickly find any exam or topic.
  2. Implement an **Exam Catalog Modal / Drawer**:
     - Displays cards with exam title, marks, subject, and syllabus completion % (if started).
     - "Start Roadmap" or "Continue" action.
  3. Persist `activeExamId` in `localStorage` and sync with user account upon login.

- **Acceptance Criteria:**
  - Clicking "Switch Exam" opens catalog. Selecting an exam dynamically loads that exam's roadmap without full page reloads.

---

### Phase 3: The Phased Roadmap UI & Progress Engine
**Objective:** Build a guided, visually engaging roadmap view that motivates students step-by-step.

- **Tasks:**
  1. **Milestone Journey View:**
     - Render syllabus in ordered **Phases** (Foundations ➔ High-Yield Core ➔ Pedagogy/Skills ➔ Revision).
     - Each unit displays:
       - Weightage tag (`🔥 High-Yield: 8-10 Marks`, `Standard: 4-6 Marks`).
       - Completion ring/bar.
       - Quick status toggle (`Not Started`, `In Progress`, `Completed`).
  2. **Topic Detail Drawer / Modal:**
     - Subtopics checklist with checkboxes.
     - **3-Tier Spaced Repetition Tracker:** Buttons for `Rev 1 (24h)`, `Rev 2 (7d)`, `Rev 3 (30d)`.
     - Confidence Rating (1 to 5 stars).
     - Direct "Search YouTube" launcher for video lectures.
     - Personal Student Notes (markdown/plain text).
  3. **Progress Summary Cards:**
     - Total Topics Done, Expected Score Estimation based on completed unit weightages, and Revision count.
     - Integrated Pomodoro focus timer linked to the active topic.

- **Acceptance Criteria:**
  - Marking topics updates total syllabus %, estimated marks, and local storage state instantly.
  - Spaced repetition counters and notes persist cleanly per unit.

---

### Phase 4: Multi-Exam Backend API & Cloud Sync
**Objective:** Upgrade the existing Express + Vercel backend to store and sync progress for multiple exams per student.

- **Tasks:**
  1. Update `api/progress.js`:
     - Accept query/body parameter `examId`.
     - Store progress partitioned by `userId + examId` in MongoDB / local fallback.
     - Document schema:
       ```javascript
       {
         userId: "...",
         examId: "bihar-stet-psychology",
         completedTopics: ["u1_t1", "u1_t2"],
         revisionCounts: { "u1_t1": 2 },
         confidenceStars: { "u1_t1": 4 },
         notes: { "u1_t1": "Key definitions..." },
         lastUpdated: new Date()
       }
       ```
  2. Add `/api/exams` endpoint to serve available exam roadmaps from the serverless backend.
  3. Maintain seamless offline fallback: if offline or no DB, continue working locally via `localStorage`.

- **Acceptance Criteria:**
  - Progress for Exam A does not collide with Exam B.
  - Syncing works transparently in the background.

---

### Phase 5: PWA (Progressive Web App) & Mobile Readiness
**Objective:** Make the web app installable on Android/iOS phones with offline capabilities, paving the way for the native app.

- **Tasks:**
  1. Create `public/manifest.json` with app name, theme colors, icons, and display mode `standalone`.
  2. Create a lightweight Service Worker (`public/sw.js`) caching assets for offline study.
  3. Ensure mobile touch gestures: swipe-friendly drawers, touch-friendly checkboxes, and responsive layouts.
  4. Create a starter guide/scaffold for a future **React Native / Expo** mobile companion using the exact same API.

- **Acceptance Criteria:**
  - Chrome / Safari prompts "Install App" or "Add to Home Screen".
  - App opens full screen like a native mobile app.

---

### Phase 6: Admin Security, RBAC & Storage Foundation
**Objective:** Establish secure role-based access control and dual-storage (MongoDB + Local Filesystem) for exam roadmaps.

- **Tasks:**
  1. Add `role: 'student' | 'admin' | 'superadmin'` to user documents in `lib/db.js` and `api/auth/register.js`.
  2. Implement `lib/admin-auth.js` middleware verifying admin privileges on API routes.
  3. Implement `lib/exam-storage.js` supporting dual-write to MongoDB collections (`exams`, `catalog`) and local files (`data/exams/`, `data/exams-catalog.json`), with cache invalidation for `api/exams.js`.
  4. Scaffold `public/admin.html` and `src/admin/admin.js` with responsive glassmorphic navigation shell.

- **Acceptance Criteria:**
  - Non-admins cannot access `/api/admin/*` routes.
  - Updating an exam immediately invalidates the `/api/exams` cache.

---

### Phase 7: Personal AI Prompt Studio & Bulk Sanitization Engine
**Objective:** Enable zero-API prompt generation and resilient bulk intake for personal ChatGPT/Claude/Gemini responses.

- **Tasks:**
  1. Build **Prompt Studio** (`src/admin/prompt-studio.js`) with 1-click clipboard prompt generator embedding strict 3-Phase schema rules, section marks balance rule, and topic ID constraints.
  2. Implement client-side **Bulk Sanitizer & Auto-Repair Engine** (`src/admin/sanitizer.js`):
     - Auto-strips markdown fences (````json ... ````) and conversational AI preambles.
     - Auto-fixes trailing commas and syntax quirks.
     - Auto-reindexes topic IDs strictly to `${unitId}_t0`, `${unitId}_t1`, etc.
     - Normalizes priorities to `high`, `medium`, or `standard`.
     - Verifies `sectionMarksSum === totalMarks` with a 1-click "⚡ Auto-Balance Marks" action.
  3. Implement `api/admin/validate.js` matching `scripts/validate-exams.js` standards.

- **Acceptance Criteria:**
  - Raw pasted text from personal AI chats with markdown fences parses and validates without manual cleanup.
  - Discrepancies in marks or missing IDs are automatically repaired or clearly highlighted.

---

### Phase 8: Split-Screen Visual Reviewer & Live Simulator
**Objective:** Provide side-by-side verification and in-line tweaking before publishing.

- **Tasks:**
  1. Build split-screen layout in `src/admin/admin.js`:
     - Left: Sanitized JSON editor with real-time lint status and auto-fix actions.
     - Right: Live interactive student simulator embedding `src/roadmap-renderer.js`.
  2. Add visual in-line quick editing:
     - Click-to-edit topic names directly in the simulator.
     - Add/delete subtopics without raw JSON manipulation.
     - Move units between Phase 1, Phase 2, and Phase 3 with up/down controls.
  3. Implement 1-click **"🚀 Save & Publish"**:
     - Persists to database/storage via `POST /api/admin/exams`.
     - Automatically updates catalog and busts client caches.

- **Acceptance Criteria:**
  - Changes in simulator update the underlying JSON in real time.
  - Published exams immediately appear in the student app catalog without server restart.

---

### Phase 9: Visual Exam Catalog & Tree Editor (Full CRUD)
**Objective:** Complete visual management of existing exam roadmaps (editing, cloning, archiving, deleting).

- **Tasks:**
  1. Build **Catalog Manager** (`src/admin/catalog-manager.js`) with search, category filtering, and status badges (`available`, `featured`).
  2. Implement **Visual Tree Editor** for exam metadata, sections, 3 phases, units, and topics.
  3. Implement 1-click **Duplicate Exam** (clones an existing roadmap with a new slug) and **Export JSON**.
  4. Implement **Category Manager** (create/edit categories with custom emojis and theme colors).

- **Acceptance Criteria:**
  - Admins can duplicate, edit, feature, and archive exams visually.
  - All changes pass `node scripts/validate-exams.js`.

---

### Phase 10: Student Directory, Platform Insights & System Hub
**Objective:** Administer students, monitor learning bottlenecks, and manage system operations.

- **Tasks:**
  1. Build **Student Directory** (`api/admin/users.js` & `src/admin/user-manager.js`) showing registered users, active exams, completion rates, and Pomodoro focus hours.
  2. Implement **Platform Insights** (`api/admin/analytics.js`):
     - Active enrollments per exam.
     - Difficult units detector (units where student confidence stars or completion rates are lowest).
  3. Build **System Hub** (`api/admin/system.js`):
     - MongoDB connection status and collection counts.
     - 1-click **Asset Re-sync** (runs `scripts/sync-assets.js` logic).
     - 1-click **Full Platform Backup** (downloads all exams and catalog as a single backup package).

- **Acceptance Criteria:**
  - Admins can inspect student progress and identify difficult units across exams.
  - One-click backup and asset sync execute cleanly.

---

## Instructions for Running via Claude Code CLI

When running Claude Code in the terminal, prompt it step-by-step:

```bash
# ==========================================
# PHASE 1 - 5 (CORE MULTI-EXAM FOUNDATION)
# ==========================================

# Step 1
claude "Read CLAUDE_IMPLEMENTATION_PLAN.md and execute Phase 1: Create the universal exam schema and extract Bihar STET into data/exams/bihar-stet-psychology.json along with exams-catalog.json."

# Step 2
claude "Read CLAUDE_IMPLEMENTATION_PLAN.md and execute Phase 2: Build the Exam Catalog and Roadmap Switcher UI in index.html and client scripts."

# Step 3
claude "Read CLAUDE_IMPLEMENTATION_PLAN.md and execute Phase 3: Implement the phased roadmap journey view and topic detail drawer."

# Step 4
claude "Read CLAUDE_IMPLEMENTATION_PLAN.md and execute Phase 4: Update backend api/progress.js and api/exams.js to support multi-exam progress storage."

# Step 5
claude "Read CLAUDE_IMPLEMENTATION_PLAN.md and execute Phase 5: Add PWA manifest, service worker, and mobile responsiveness."

# ==========================================
# PHASE 6 - 10 (SUPER ADMIN & AI INGESTION)
# ==========================================

# Step 6
claude "Read CLAUDE_IMPLEMENTATION_PLAN.md and execute Phase 6: Admin Security, RBAC & Storage Foundation (user roles, lib/admin-auth.js, lib/exam-storage.js, and public/admin.html shell)."

# Step 7
claude "Read CLAUDE_IMPLEMENTATION_PLAN.md and execute Phase 7: Personal AI Prompt Studio & Bulk Sanitization Engine (clipboard prompt generator, markdown/syntax auto-repair, and schema validator)."

# Step 8
claude "Read CLAUDE_IMPLEMENTATION_PLAN.md and execute Phase 8: Split-Screen Visual Reviewer & Live Simulator (dual-pane raw JSON editor, live student simulator, in-line topic editor, and 1-click publish)."

# Step 9
claude "Read CLAUDE_IMPLEMENTATION_PLAN.md and execute Phase 9: Visual Exam Catalog & Tree Editor (catalog manager table, visual hierarchy editor, duplicate exam, and category manager)."

# Step 10
claude "Read CLAUDE_IMPLEMENTATION_PLAN.md and execute Phase 10: Student Directory, Platform Insights & System Hub (user progress inspector, difficulty bottleneck detector, asset sync, and backup export)."
```

