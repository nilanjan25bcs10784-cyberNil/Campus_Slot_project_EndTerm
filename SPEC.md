# CampusSlot - Product & Engineering Spec (source of truth)

Read this file fully before writing any code. Also read BRIEF.md (the college assignment brief and rubric). If anything here conflicts with BRIEF.md, BRIEF.md wins. Do not invent features outside this spec.

## 1. Context
- College End-Term Software Project, solo student submission, deadline 27 Oct 2026 11:59 PM IST.
- Evaluated on: Problem & Product Understanding 10, Core Product Implementation 25, Engineering & Application Logic 20, Architecture & Technical Decisions 15, UX & Reliability 10, Code Quality & Structure 10, Deployment & Documentation 10.
- Rejected by evaluators: basic CRUD, API wrappers, UI-only, tutorial clones, incomplete features. Depth over feature count. 3-5 workflows done properly.

## 2. Product
- Name: CampusSlot
- Problem: students and clubs book shared college resources (study rooms, labs, sports courts, equipment) via WhatsApp and paper registers -> double bookings, no visibility, no accountability.
- Users: Student (books), Admin/faculty (manages resources, approves, views analytics).
- Why software: atomic conflict prevention, fair FIFO waitlist, single source of truth, audit trail.

## 3. Stack (fixed, do not change)
- Frontend: React 18 + Vite + Tailwind CSS + React Router + Axios + Recharts (analytics) + react-hot-toast
- Backend: Node 20, Express, Mongoose, Zod, bcryptjs, jsonwebtoken, helmet, cors, express-rate-limit, node-cron, morgan
- DB: MongoDB Atlas
- Tests: Vitest + supertest + mongodb-memory-server
- Deploy: single Render web service; Express serves client/dist in production; render.yaml included
- Repo layout: /client, /server, /docs, README.md, SPEC.md, BRIEF.md, render.yaml, .gitignore

## 4. Server folder structure
server/src/{config,models,validators,middleware,routes,controllers,services,jobs,utils,seed}
- Controllers are thin; business rules live in services. Services are unit/integration testable.

## 5. Data models (Mongoose, with timestamps)
User: name, email (unique, lowercase), passwordHash, role ('student'|'admin'), department, createdAt.
Resource: name, type ('study_room'|'lab'|'court'|'equipment'), description, location, capacity (number), openTime ('HH:mm'), closeTime ('HH:mm'), slotMinutes (30|60), maxDurationSlots (default 4), requiresApproval (bool), isActive (bool).
Booking: user (ref), resource (ref), date ('YYYY-MM-DD'), startTime ('HH:mm'), endTime ('HH:mm'), startAt (Date), endAt (Date), purpose, status ('pending'|'approved'|'rejected'|'cancelled'|'completed'|'no_show'), checkedInAt, lateCancellation (bool), decisionNote, expiresAt (for pending).
 - Index: { resource, startAt, endAt, status }.
 - Race safety: also store per-slot keys `slotKeys: ['<resourceId>_<date>_<HH:mm>', ...]` for every slot covered, with a PARTIAL UNIQUE INDEX on slotKeys applying only to active statuses (pending, approved). A duplicate-key error (11000) must be translated to a 409 "Slot already booked". Slot keys are cleared (unset) when status leaves active.
WaitlistEntry: user, resource, date, startTime, endTime, status ('waiting'|'promoted'|'expired'|'cancelled'), createdAt. Unique per (user, resource, date, startTime).
Notification: user, type, message, bookingId (optional), read (bool), createdAt.
BlockedWindow: resource, startAt, endAt, reason, createdBy.

## 6. Business rules (enforce server-side in bookingService)
1. Times in Asia/Kolkata; store startAt/endAt as UTC Dates.
2. Booking must be in the future, within 14 days ahead, within resource open/close hours, aligned to slotMinutes, length <= maxDurationSlots * slotMinutes.
3. No overlap with any pending/approved booking on the same resource and no overlap with a BlockedWindow.
4. A student may hold at most 3 active (pending/approved, future) bookings, and cannot book two resources at overlapping times.
5. If resource.requiresApproval -> status 'pending' (expires in 24h if not decided), else 'approved'.
6. Student can cancel only own bookings. Cancelling < 60 min before start sets lateCancellation = true. Cancelling frees slotKeys.
7. On cancel/reject/expire of a booking: run waitlist promotion - find the oldest 'waiting' entry whose range is now fully free and passes rules 2-4; create a booking for that user (status per rule 5), mark entry 'promoted', create a Notification.
8. Check-in is allowed from 10 min before start to 15 min after start. If not checked in by start+15, a job marks it 'no_show'. After endAt, an approved checked-in booking becomes 'completed'.
9. Admin can approve/reject pending (with note), create/edit/deactivate resources, create blocked windows (blocked window creation cancels conflicting bookings and notifies the users, triggering promotion logic is NOT required there).
10. A student with 3 no-shows in 30 days cannot create new bookings for 7 days (return 403 with a clear message).

## 7. API (all JSON, prefix /api, errors as { error: { code, message, details? } })
Auth: POST /auth/register, POST /auth/login, GET /auth/me
Resources: GET /resources (query: type, q, minCapacity, date, startTime, endTime -> when date+time given return only available), GET /resources/:id, GET /resources/:id/availability?date= (returns slot grid with state free|booked|blocked|mine), POST/PUT/DELETE (admin; DELETE = deactivate)
Bookings: POST /bookings, GET /bookings/mine, GET /bookings/:id, POST /bookings/:id/cancel, POST /bookings/:id/check-in
Waitlist: POST /waitlist, GET /waitlist/mine, DELETE /waitlist/:id
Admin: GET /admin/bookings?status=, POST /admin/bookings/:id/approve, POST /admin/bookings/:id/reject, POST /admin/blocked-windows, GET /admin/analytics (utilization per resource %, bookings per weekday/hour, no-show rate, top resources)
Notifications: GET /notifications, POST /notifications/:id/read, POST /notifications/read-all
System: GET /health
Every route: Zod validation, auth middleware, role middleware where needed. Ownership checks in services.

## 8. Background jobs (node-cron, every minute)
- expirePendingBookings, markNoShows, completeFinishedBookings, sendUpcomingReminders (30 min before start, once per booking).
- Each job logs a one-line summary and never crashes the process (try/catch).

## 9. Frontend pages
Login, Register, Dashboard (upcoming bookings, notifications summary), Browse Resources (search, filters), Resource Detail with SLOT GRID (pick date, click contiguous slots, live availability, "Join waitlist" on booked slots), My Bookings (tabs: Upcoming/Past/Waitlist, cancel, check-in buttons), Notifications dropdown (bell + unread count, polling every 30s), Admin: Resources manager, Approvals queue, Blocked windows, Analytics (Recharts), 404 page.
- Guarded routes; role-based nav; token in localStorage with auto-logout on 401.
- Every data view has loading skeleton, empty state, and error state with retry. Toasts for success/failure. Responsive down to 360px. Clean, modern, consistent Tailwind design (indigo accent, light theme, rounded cards).
- Render cold start: show a "Waking up server..." banner if first request takes > 4s.

## 10. Security
bcrypt (cost 10), JWT 7d expiry, JWT_SECRET from env, helmet, CORS restricted to CLIENT_URL, rate limit (auth: 10/15min/IP; global: 300/15min), body limit 100kb, no stack traces in production, never log secrets. .env gitignored; .env.example lists: PORT, MONGODB_URI, JWT_SECRET, CLIENT_URL, NODE_ENV, TZ.

## 11. Seed script (npm run seed)
1 admin (admin@campusslot.test / Admin@123), 2 students (student1@campusslot.test, student2@campusslot.test / Student@123), 8 varied resources (some requiring approval), ~20 realistic bookings across the next 7 days including pending ones and one waitlist entry, so the demo is never empty. Idempotent (safe to re-run).

## 12. Required tests (must pass with `npm test` in /server)
1. Register/login/me happy path + wrong password + duplicate email
2. Overlapping booking -> 409
3. Concurrent booking attempts for same slot (Promise.all of 5) -> exactly 1 succeeds
4. Student cannot cancel or view another student's booking (403/404)
5. Cancel -> first waitlisted user auto-promoted + notification created
6. Booking outside opening hours / in the past / > max duration -> 400
7. Student non-admin hitting admin route -> 403
8. 3 active bookings cap enforced

## 13. Documentation deliverables
README.md with sections: Project Name, Problem Statement, Target Users, Solution, Key Features, Tech Stack, Architecture (Mermaid diagram + component explanation), Local Setup, Environment Variables, Deployment (placeholder for live URL). Plus: Data Model, API table, Design Decisions & Trade-offs (why atomic slot keys, why cron instead of a queue, why single-service deploy), Known Limitations, AI Usage note, Demo credentials.
docs/ARCHITECTURE.md with the booking sequence diagram (Mermaid) and the waitlist promotion flow.

## 14. Definition of done
- All 4 workflows work end to end locally: (1) auth/roles, (2) search + book with conflict prevention, (3) cancel/waitlist/check-in/notifications, (4) admin approvals + analytics
- npm test passes, npm run build passes, no console errors in browser on main flows
- No secrets committed, .env.example complete
- Git history has at least 12 meaningful commits (one per feature/phase)
- Deployed via render.yaml, /api/health returns 200
