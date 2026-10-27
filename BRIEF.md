# College End-Term Project Brief & Evaluation Rubric

## Course Information
- **Course**: CS489 / End-Term Capstone Software Engineering Project
- **Submission Type**: Solo Student Submission
- **Deadline**: 27 Oct 2026, 11:59 PM IST
- **Target Project**: CampusSlot - Campus Resource Reservation & Conflict Resolution System

---

## 1. Problem Statement & Objective
College campuses frequently suffer from resource misallocation. Premium study rooms, specialized computer labs, seminar halls, sports courts, and equipment (e.g., projectors, lab gear) are informally reserved through WhatsApp chats, physical paper logbooks, or verbal agreements. 

This causes:
1. **Double Bookings**: Multiple parties arriving expecting exclusive access.
2. **Ghost Reservations / No-Shows**: Slots locked by users who never show up while others are turned away.
3. **Zero Visibility & Equity**: Lack of real-time availability grids, fair waitlisting, or administrative approval controls.

The objective of this project is to implement **CampusSlot**: a robust, production-ready MERN web application with server-enforced concurrency control, atomic reservation mechanics, automated FIFO waitlist promotion, attendance check-in enforcement, and administrative analytics.

---

## 2. Evaluation Rubric (Total: 100 Marks)

| Category | Max Marks | Evaluator Criteria |
| :--- | :---: | :--- |
| **1. Problem & Product Understanding** | **10** | Clear domain modeling; accurate identification of concurrency edge-cases; practical workflows matching campus logistics. |
| **2. Core Product Implementation** | **25** | End-to-end functionality of Resource Catalog, Slot Grid availability, multi-slot bookings, cancelations, check-ins, and admin oversight. |
| **3. Engineering & Application Logic** | **20** | Atomic slot-key conflict prevention (preventing race conditions via partial unique indexes); FIFO waitlist promotion engine; check-in verification windows; 3-strike no-show restriction. |
| **4. Architecture & Technical Decisions** | **15** | Layered backend architecture (controllers -> services -> models); clean separation of concerns; stateless JWT auth; robust background cron jobs; justified trade-offs. |
| **5. UX & Reliability** | **10** | Responsive Tailwind UI down to 360px; interactive slot grid; empty/loading/error states; toasts; cold-start server awakening indicators. |
| **6. Code Quality & Structure** | **10** | Strict Zod validation; robust error handling; modular file layout; clean git history (minimum 12 meaningful commits); comprehensive unit/integration test coverage. |
| **7. Deployment & Documentation** | **10** | Single-service Render deployment specification (`render.yaml`); comprehensive `README.md` and `docs/ARCHITECTURE.md` with Mermaid diagrams. |

---

## 3. Evaluator Non-Negotiables & Strict Disqualifiers
- ❌ **NO Basic CRUD or Tutorial Clones**: Projects with simple form-submitting CRUD without complex business logic will be penalized.
- ❌ **NO Shallow API Wrappers**: All business logic (slot calculation, conflict prevention, waitlist promotion, no-show penalty) must reside in custom backend services.
- ❌ **NO Unchecked Race Conditions**: Double-booking the same physical slot concurrently must fail atomically at the database constraint level.
- ❌ **NO Incomplete Workflows**: All 4 core workflows must be fully functional end-to-end:
  1. Authentication & Role-Based Access Control (Student vs Admin).
  2. Conflict-Free Resource Discovery & Booking.
  3. Waitlist Queuing, Automated Promotion, Check-in, and Notifications.
  4. Administrative Approvals, Resource Management, Blocked Windows, and Utilization Analytics.
