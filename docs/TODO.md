# ClientLens MVP - Status & TODO

## Project Context

**Vision**: ClientLens is a feedback tool for freelancers and creative service providers to collect clear, contextual client feedback via shareable links.

**Launch Target**: Last week of March 2026

**MVP Scope (PRIORITY)**: 
- Internal tool (single-user, no auth required yet)
- Generate shareable links for projects
- **Image comments only** (click-to-comment with pins)
- Clients can leave comments (name/email prompted)
- Simple comment viewing for provider

**Future Scope** (Post-MVP):
- Videos with timestamp comments
- PDFs with page comments
- Multi-user auth & workspaces
- AI translation & summaries
- Light branding (logo/color)
- Pricing tiers

**Core Problem Solved**: Service providers receive disorganized feedback scattered across WhatsApp, email, and voice notes. ClientLens centralizes feedback in one simple, shareable link.

---

## What's Working ✅

### Core Features
- **Project management** - Create, view, delete projects with dashboard
- **File uploads** - Images with object storage
- **Shareable links** - Public URLs via `/p/:publicId` (project) and `/f/:publicId` (file)
- **Click-to-comment on images** - Position-based pins with visual markers
- **Client identity prompt** - Name/email captured before commenting
- **Threaded replies** - Parent/child comment relationships
- **Comment sidebar** - View all comments with navigation to pins

### Tech Stack
- **Frontend**: React + TypeScript + TailwindCSS + Shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Neon) via Drizzle ORM
- **File Storage**: Google Cloud Storage
- **Deployment**: Replit (https://project-forge-iakande1.replit.app/)

---

## What's Missing ❌

### PRIORITY 1: MVP Launchable (Images + Shareable Links) ⭐⭐⭐

#### 1. Shareable Links - Fully Working ⭐ TOP PRIORITY
- **Status**: Partially working (`/p/:publicId` and `/f/:publicId` routes exist)
- **Spec**: Public links work without authentication, clients can view project + leave comments
- **Needs**:
  - Verify `/p/:publicId` loads project page with images
  - Verify `/f/:publicId` loads individual image with comment UI
  - Ensure client can comment without login (name/email only)
  - Test link generation and copying

#### 2. Image Comments (Core MVP Feature) ⭐ TOP PRIORITY
- **Status**: Click-to-comment on images exists, needs verification
- **Spec**: Clients click image → add pin → comment appears + saves to DB
- **Needs**:
  - Verify pins display correctly on image
  - Verify comment threads work on public page
  - Verify comments persist in database
  - Test on mobile (clients likely on phones)
  - Responsive image container

#### 3. Comment Viewing for Provider ⭐ TOP PRIORITY
- **Status**: Comment sidebar exists, needs polish
- **Spec**: Provider can see all comments + client names + navigate to pins
- **Needs**:
  - Verify sidebar loads all comments for a project
  - Add timestamps to comments
  - Sort comments by recency or by image
  - Clear "no comments yet" state
  - Mobile-friendly sidebar (drawer on mobile)

#### 4. Clean Up Multi-Media Support (Remove for Now) ⭐ TOP PRIORITY
- **Status**: Video and PDF support partially implemented, need to remove for MVP
- **Spec**: For MVP, disable/remove video + PDF uploads and commenting
- **Needs**:
  - Remove video upload option from ObjectUploader
  - Remove PDF upload option from ObjectUploader
  - Hide/remove VideoWithComments, PDFWithComments from project page
  - Set validation to accept **images only** (.jpg, .png, .gif, .webp)
  - Backend: Restrict file types in validation

### PRIORITY 2: Polish for Launch ⭐⭐

#### 5. Fix Errors
- **Status**: Needs review
- **Spec**: Eliminate runtime and build errors for a smooth dev/prod experience
- **Needs**:
  - Identify current startup/build errors
  - Resolve dependency or tooling issues (e.g., `cross-env`, tsx/esbuild spawn)
  - Verify `npm run dev` and `npm run build` succeed

#### 5. Basic Error Handling & Edge Cases
- **Status**: Needs testing
- **Spec**: Graceful failures, user-friendly messages
- **Needs**:
  - Handle missing/deleted projects gracefully
  - Handle invalid share links
  - Show "no comments" state
  - Handle image load failures

#### 6. Mobile Responsiveness
- **Status**: Partial
- **Spec**: Works perfectly on mobile (clients will access via phone)
- **Needs**:
  - Test on iPhone/Android browsers
  - Responsive comment sidebar (drawer on mobile)
  - Responsive image container
  - Touch-friendly pin placement

### PRIORITY 3: Future (Post-MVP, Next Sprint)

#### Password Hashing & Security
- **Status**: Passwords currently stored in plain text
- **Needs**: 
  - Install bcrypt or argon2
  - Hash passwords on user creation (seed script and signup)
  - Compare hashed passwords on login
  - Update seed script to use hashed password
- **Notes**: Essential before any production deployment; needed for multi-user auth

#### User Authentication & Authorization
- **Status**: Hardcoded to "user-1"
- **Notes**: Add when scaling to multi-user; not needed for internal MVP

#### AI Translation
- **Status**: Not implemented
- **Notes**: Post-MVP differentiator for cross-border clients

#### AI Feedback Summary
- **Status**: Not implemented
- **Notes**: Post-MVP high-value feature

#### Comment Tag Editing
- **Status**: Tags in DB but no UI
- **Notes**: Post-MVP enhancement

#### Light Branding (Logo + Color)
- **Status**: Not implemented
- **Notes**: Post-MVP polish for public pages

#### Video & PDF Support
- **Status**: Partially implemented, remove for MVP
- **Notes**: Add after image MVP is solid

#### Email Notifications
- **Status**: Not implemented
- **Notes**: Retention feature, post-MVP

#### Custom Domains & White-Labeling
- **Status**: Not implemented
- **Notes**: Pro tier feature, post-MVP

---

## Implementation Order (This Week)

Onboarding & Implementation Plan (step-by-step)

1. Onboard the repo locally
  - Install deps: `npm ci` or `npm install`
  - Copy `.env.example` → `.env` and paste your Neon `DATABASE_URL`
  - Confirm DB connection: `npx tsx server/test-connection.ts` (already done)

2. Apply DB schema (migrations)
  - Run: `npx drizzle-kit push` (or `npm run db:push`)
  - Confirm required tables exist in your Neon project

3. Seed demo data (recommended)
  - Add a small seed script (`server/seed.ts`) to insert a demo user, project and one sample image record
  - Run locally to create a testable project for UI checks

4. Start local dev server
  - `npm run dev` — open `http://localhost:5000`
  - Confirm API routes and client load correctly

5. Smoke-test core API routes
  - Example checks:
    - `GET /api/projects`
    - `GET /api/projects/:id/files`
    - `GET /api/files/:publicId`
    - `POST /api/files/:fileId/comments`

6. Verify public shareable pages
  - Test `/p/:publicId` (project view) and `/f/:publicId` (file view)
  - Ensure clients can leave comments without auth (name/email only)

7. Enforce image-only uploads for MVP
  - Frontend: update `client/src/components/ObjectUploader.tsx` to restrict file types
  - Backend: add validation in upload routes to reject non-image MIME types

8. Validate image comment flow end-to-end
  - Place pins on images, add comments, confirm DB persistence and that pins appear on reload
  - Test threaded replies

9. UI polish and mobile behavior
  - Improve comment sidebar (timestamps, sorting, clear empty state)
  - Make sidebar a drawer on small screens
  - Test touch pin placement on phones

10. Remove or hide video/PDF features for MVP
   - Remove upload buttons and UI components related to `VideoWithComments` and `PDFWithComments`

11. Add error handling and UX states
   - Missing project / invalid publicId
   - Image load failures
   - Friendly messages for comment submission errors

12. Final QA & launch checklist
   - Verify checklist items in the MVP Launchability Checklist
   - Demo end-to-end flow with a sample project

Next step suggestion: I can create `server/seed.ts` and the seed data, then run migrations locally (I won't run commands in your terminal). Tell me if you want the seed script added now or prefer to run migrations first.

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
