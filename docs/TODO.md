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

1. **Shareable links verification** - Ensure `/p/:publicId` and `/f/:publicId` work end-to-end
2. **Image-only restriction** - Remove video/PDF uploads, keep images only
3. **Image comment verification** - Test pin placement, threading, persistence on mobile
4. **Comment sidebar polish** - Add timestamps, better sorting, mobile drawer
5. **Error handling** - Missing projects, invalid links, load failures
6. **Mobile testing** - Full responsive testing on iOS/Android
7. **Final QA** - Demo run-through with real feedback flow

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
