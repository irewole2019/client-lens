# ClientLens — Development Roadmap

## Vision
ClientLens is a feedback tool for freelancers and creative service providers to collect clear, contextual client feedback via shareable links. Like Google Docs for visual feedback.

**Launch Target**: Last week of March 2026  
**Deployment**: https://project-forge-iakande1.replit.app/

**Primary Users (MVP)**: Event Planners  
**Future Users**: Graphic Designers, 3D Visualizers, Video Editors, Artists

---

## Organization Model
Keep it simple: **Folders → Projects → Files → Comments**

Users organize however they want:
- One folder per client
- One folder per event
- One folder per project type

---

## Current Progress: ~50-60% Complete

### ✅ Done (Working)

| Feature | Status |
|---------|--------|
| Project management | Create, view, delete projects with dashboard |
| Image uploads | Working with local storage + GCS wired |
| Shareable links | `/p/:publicId` (project) and `/f/:publicId` (file) |
| Click-to-comment on images | Position-based pins with visual markers |
| Client identity prompt | Name/email captured before commenting |
| Threaded replies | Parent/child comment relationships |
| Comment sidebar | View all comments with navigation to pins |
| Comment status tagging | "To Do", "In Progress", "Resolved" in DB schema |
| Multi-user seed data | Mario, Sonic, Vanitas projects with comments |
| Tech stack | React + TailwindCSS + Express + PostgreSQL (Neon) |
| Folders | Full CRUD backend + dashboard UI (create, rename, delete, group projects) |

### 🟡 Partial / Needs Verification

| Feature | Notes |
|---------|-------|
| Video timestamp comments | Schema supports it, UI partially implemented but hidden for MVP |
| PDF page comments | Schema supports it, UI partially implemented but hidden for MVP |
| Mobile responsiveness | Needs testing on actual devices |
| Comment tag editing UI | Tags exist in DB but no UI to change them yet |

---

## What's Missing

### PRIORITY 1: MVP Critical (Must Have for Launch) ⭐⭐⭐
**Feasibility: High — 1-2 days each**

#### 1. Project Folders (Organization) — ✅ DONE
- **Status**: 100% Complete (backend + frontend)
- **Done**:
  - ✅ Add `folders` table to schema (id, userId, name, createdAt)
  - ✅ Add `folderId` column to `projects` table (nullable)
  - ✅ Create folder CRUD API routes (GET, POST, PATCH, DELETE)
  - ✅ Storage layer with folder operations
  - ✅ Dashboard UI: collapsible folders with nested projects
  - ✅ Create/rename/delete folders (UI)
  - ✅ "Unfiled" section for projects without folder
  - ✅ Assign folder when creating new project (dropdown in create modal)
  - ✅ Move existing project to folder (dropdown in project detail page)
  - ✅ PATCH endpoint for updating project folder

#### 2. Tag Editing UI (Approval Workflow)
- **Status**: Tags exist in DB, no UI
- **Effort**: 4-6 hours
- **Why**: Event planners need to track "approved" vs "pending" items per vendor.
- **Tasks**:
  - Add dropdown to change tag (To Do / In Progress / Resolved)
  - Visual indicator of tag status in sidebar (color/icon)
  - Show progress indicator per project ("3/5 items resolved")

#### 3. Enforce Images-Only Uploads
- **Status**: Video/PDF support partially implemented, needs cleanup
- **Effort**: 2-4 hours
- **Tasks**:
  - Remove video upload option from ObjectUploader
  - Remove PDF upload option from ObjectUploader
  - Hide/remove VideoWithComments, PDFWithComments components
  - Set validation to accept images only (.jpg, .png, .gif, .webp)
  - Backend: Restrict MIME types in upload routes

#### 4. Comment Sidebar Polish
- **Status**: Sidebar exists, needs UX improvements
- **Effort**: 4-6 hours
- **Tasks**:
  - Add timestamps to comments (display createdAt)
  - Sort comments by recency or by image
  - Clear "no comments yet" empty state
  - Mobile-friendly sidebar (drawer on mobile)

#### 5. Verify Core Flow End-to-End
- **Status**: Needs QA pass
- **Effort**: 2-3 hours
- **Tasks**:
  - Verify `/p/:publicId` loads project with images
  - Verify `/f/:publicId` loads single image with comment UI
  - Confirm pins display correctly and persist on reload
  - Test link generation and copying

### PRIORITY 2: MVP Polish (Should Have) ⭐⭐
**Feasibility: Medium — 1-3 days each**

#### 6. Mobile Responsiveness
- **Status**: Partial implementation
- **Effort**: 1-2 days
- **Tasks**:
  - Test on iPhone/Android browsers
  - Responsive comment sidebar (drawer on small screens)
  - Responsive image container
  - Touch-friendly pin placement

#### 7. Error Handling & Edge Cases
- **Status**: Needs implementation
- **Effort**: 4-6 hours
- **Tasks**:
  - Handle missing/deleted projects gracefully (404 page)
  - Handle invalid share links
  - Handle image load failures
  - Friendly error messages for comment submission failures

#### 8. Fix Build/Runtime Errors
- **Status**: Needs review
- **Effort**: 2-4 hours
- **Tasks**:
  - Verify `npm run dev` runs without errors
  - Verify `npm run build` succeeds
  - Resolve any dependency or tooling issues

### PRIORITY 3: MVP Nice-to-Have (Could Have) ⭐
**Feasibility: Medium — requires new integration**

#### 9. AI Translation
- **Status**: Not implemented
- **Effort**: 1-2 days
- **Tasks**:
  - Integrate OpenAI API (GPT-4o)
  - Translate comments to provider's preferred language
  - Add language preference setting
- **Notes**: Differentiator for cross-border clients

#### 10. AI Feedback Summary
- **Status**: Not implemented
- **Effort**: 1-2 days
- **Tasks**:
  - Generate project-level summary of all feedback
  - Highlight key action items
- **Notes**: High-value feature for busy providers

#### 11. Light Branding (Logo + Color)
- **Status**: Not implemented
- **Effort**: 1 day
- **Tasks**:
  - Allow provider to upload logo for public pages
  - Allow accent color customization
  - Display branding on `/p/:publicId` pages

#### 12. Simple 3D Model Viewer (Read-only)
- **Status**: Not implemented
- **Effort**: 1-2 days
- **Tasks**:
  - Allow uploading `.glb` / `.gltf` files (or enable as a hidden/limited beta)
  - Add a basic 3D viewer on file pages (orbit controls + loading state)
  - Start with standard comments (no 3D pin placement)
  - Add basic limits/guardrails (file size cap, mobile fallback)

---

---

# Growth Roadmap (Post-MVP)

## Phase 2: Stability & Security (April 2026)
- Password hashing (bcrypt/argon2)
- Proper user authentication (replace hardcoded)
- Rate limiting
- Input sanitization
- Error logging & monitoring

## Phase 3: Organization & UX (May 2026)
- Search projects by name
- Filter projects by folder
- Drag-drop reorder files within project
- Archive/trash for old projects
- Duplicate project (copy as template)
- Bulk move projects to folder

## Phase 4: Collaboration (June 2026)
- Email notifications (new comment alerts via Resend)
- @mentions in comments
- Real-time updates (WebSocket for live comments)
- Comment reactions (✓ 👍 ❓)

## Phase 5: Artist Features (Q3 2026)
- Re-enable Video support (timestamp comments)
- Re-enable PDF support (page comments)
- Drawing/annotation tools on images
- Version history (track revisions)
- Before/after comparison slider

## Phase 6: Pro Features (Q4 2026)
- 3D model feedback (.glb/.gltf with Three.js)
- Team/agency workspaces
- White-labeling & custom domains
- Slack/Notion integrations
- Analytics dashboard
- PDF export of feedback

---

## Tech Stack

- **Frontend**: React + TypeScript + TailwindCSS + Shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Neon) via Drizzle ORM
- **File Storage**: Google Cloud Storage (local `/images` for dev)
- **AI**: OpenAI API (GPT-4o) — planned
- **Deployment**: Replit

---

## Pricing Strategy (Post-MVP)

**Starter** — $0/mo: 3 projects, platform branding  
**Pro** — $15/mo: Unlimited projects, 20 AI credits, logo + color  
**Elite** — $29/mo: Unlimited AI, white-label, custom domain  
**Studio** — $99/mo: 5 users, shared workspace  
**Agency** — $199/mo: 15 users, branded portals, integrations

---

## MVP Launchability Checklist

Before sharing with users, verify:
- [ ] Shareable link generates & works (no auth required for clients)
- [ ] Image upload works smoothly
- [ ] Click-to-comment creates pins and saves comments
- [ ] Client name/email prompt works
- [ ] Comments persist after page reload
- [ ] Mobile responsive (tested on phone)
- [ ] No console errors
- [ ] Demo project has sample comments visible
- [ ] Loading states + error messages clear
- [ ] Video/PDF uploads hidden (images only)
- [ ] Timestamps visible on comments
- [ ] Project folders working
- [ ] Tag editing functional

---

## Quick Start (Dev Onboarding)

1. Install deps: `npm install`
2. Copy `.env.example` → `.env` (add Neon `DATABASE_URL`)
3. Push schema: `npm run db:push`
4. Seed data: `npx tsx server/seed.ts`
5. Run dev: `npm run dev` → http://localhost:5000

**Seeded Users**:
- `mario-designer` — owns "Mario Feedback Board" (3 Mario images)
- `client-two` — owns "Sonic Campaign" + "Vanitas Lookbook" (3 images each)

All passwords: `demo-password`
