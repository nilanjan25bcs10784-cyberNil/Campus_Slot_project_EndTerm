# CampusSlot - Campus Resource Reservation & Conflict Resolution System

> **College End-Term Software Engineering Project (MERN)**  
> **Course Rubric Compliant**: Problem & Product Understanding (10), Core Product Implementation (25), Engineering & Application Logic (20), Architecture & Technical Decisions (15), UX & Reliability (10), Code Quality & Structure (10), Deployment & Documentation (10).

---

## 1. Problem Statement
On higher-education campuses, high-demand shared academic and athletic facilities—such as seminar halls, specialized computing & robotics laboratories, quiet study pods, sports courts, and media production gear—are informally reserved via WhatsApp chats, verbal bookings, and handwritten paper registers.

This analog approach results in:
1. **Unresolved Double Bookings**: Multiple academic groups or sports teams arriving simultaneously claiming exclusive access.
2. **Ghost Reservations & No-Shows**: Slots locked days in advance by students who fail to arrive, denying access to peers while facilities sit idle.
3. **Zero Visibility & Inequity**: Lack of a centralized source of truth, absence of automated waitlists, and missing audit trails for faculty oversight.

---

## 2. Target Users
1. **Students**: Discover campus facilities, view real-time availability grids, atomically reserve contiguous time slots, queue for occupied slots via FIFO waitlists, and check in on-site.
2. **Faculty & Administrators**: Oversee facility listings, review pending requests requiring faculty approval, schedule facility maintenance lockout windows, and inspect utilization analytics.

---

## 3. Solution
**CampusSlot** is an enterprise-grade fullstack web application that replaces informal reservation channels with:
- **Atomic Concurrency Protection**: High-concurrency conflict prevention using per-slot atomic keys and database partial unique indexes.
- **Fair FIFO Waitlist Automation**: Automatic slot reassignment and notifications whenever active bookings are cancelled, rejected, or expired.
- **Strict Attendance & No-Show Governance**: Strict check-in verification windows (-10m to +15m) and a 3-strike penalty mechanism restricting habitual no-shows.
- **Unified Analytics**: Actionable utilization rates, peak-demand metrics, and booking patterns across the campus.

---

## 4. Key Features

### 🛡️ Concurrency & Reservation Engine
- **Slot Grid Selector**: Intuitive contiguous slot selection (30m or 60m granularity) adhering to operational hours and duration limits.
- **Atomic Slot Keys (`<resourceId>_<date>_<HH:mm>`)**: Enforced via MongoDB partial unique indexes on active statuses (`pending`, `approved`), preventing race conditions.
- **Asia/Kolkata Timezone Engine**: Strict alignment with `Asia/Kolkata` (+05:30) stored as UTC Date representations.

### ⏱️ Automated FIFO Waitlist Promotion
- **1-Click Waitlist Joining**: Students can join the queue on any reserved slot.
- **Self-Healing Promotion Pipeline**: Triggered on cancellation, faculty rejection, or cron expiration. Validates candidate eligibility (under 3 active bookings, no overlapping slots) and automatically allocates the slot.

### 📍 Attendance Verification & Penalty System
- **Check-in Window**: Active from 10 minutes prior to booking start until 15 minutes post-start.
- **Background Cron Engine**: Auto-flags unverified reservations as `no_show`, freeing slots and logging strikes.
- **3-Strike Restriction Rule**: Accumulating 3 no-shows within 30 days triggers an automatic 7-day restriction on creating new reservations.

### 📊 Administrative Portal & Analytics
- **Faculty Approval Queue**: Review requests for specialized laboratories and cinema gear, approving or rejecting with mandatory rationale.
- **Maintenance Blocked Windows**: Schedule facility downtime, with automated notification and cancellation of conflicting student bookings.
- **Recharts Analytics Suite**: Visualizes facility utilization percentages, hourly demand curves, weekly traffic trends, and no-show rates.

---

## 5. Tech Stack

| Tier | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6, Axios, Recharts, react-hot-toast, Lucide React |
| **Backend** | Node.js 20+, Express, Mongoose, Zod, bcryptjs, jsonwebtoken, Helmet, CORS, express-rate-limit, node-cron, Morgan |
| **Database** | MongoDB Atlas (Production & Seed) / `mongodb-memory-server` (Automated Tests) |
| **Testing** | Vitest, Supertest, MongoMemoryServer |
| **Deployment** | Single Web Service on Render (Express serves compiled Vite SPA from `client/dist`) via `render.yaml` |

---

## 6. Architecture

```mermaid
graph TD
    Client["React 18 + Vite SPA (Client)<br/>Tailwind CSS • Recharts • Axios"]
    
    subgraph ExpressApp ["Node 20 / Express Server (/server)"]
        Security["Security Layer<br/>Helmet • CORS • Rate Limiting"]
        Routes["API Routing Layer (/api/*)<br/>Zod Schemas • Auth Middleware"]
        Controllers["Thin Controllers<br/>HTTP Request/Response Mapping"]
        Services["Domain Services (Business Engine)<br/>Booking • Waitlist • Analytics"]
        Jobs["Background Cron Jobs (node-cron)<br/>No-show • Expiration • Reminders"]
    end

    subgraph DataStore ["Database Tier"]
        MongoDB[(MongoDB Atlas / MongoMemoryServer)<br/>Partial Unique Indexes • BSON Models]
    end

    Client -->|HTTPS / REST API| Security
    Security --> Routes
    Routes --> Controllers
    Controllers --> Services
    Jobs --> Services
    Services --> MongoDB
```

*For comprehensive sequence diagrams and workflow logic, refer to [`docs/ARCHITECTURE.md`](file:///c:/Users/ghorp/Downloads/MERN%20END%20TERM%20PROJECT/docs/ARCHITECTURE.md).*

---

## 7. Local Setup & Installation

### Prerequisites
- Node.js version 20+ installed (`node -v`)
- npm version 10+ installed (`npm -v`)
- A local or MongoDB Atlas connection URI

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd "MERN END TERM PROJECT"

# Install both server and client packages
npm install --prefix server
npm install --prefix client
```

### 2. Environment Variables Configuration
Create a `.env` file in `/server` based on `.env.example`:
```bash
cp .env.example server/.env
```

Ensure `server/.env` contains:
```env
PORT=5000
NODE_ENV=development
TZ=Asia/Kolkata
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/campusslot?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_key_change_in_production_min_32_characters
CLIENT_URL=http://localhost:5173
```

### 3. Seed Realistic Demo Data
Populate the database with 1 Admin, 2 Students, 8 varied facilities, and ~20 realistic reservations across past and future days:
```bash
npm run seed
```

### 4. Run Automated Test Suite
Run the 8 spec-mandated integration tests against an in-memory database:
```bash
npm test
```

### 5. Start Development Servers
In two separate terminals:
```bash
# Terminal 1: Backend API Server (Port 5000)
npm run server

# Terminal 2: Vite Frontend Client (Port 5173)
npm run client
```
Open your browser at `http://localhost:5173`.

---

## 8. Demo Credentials

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Faculty Admin** | `admin@campusslot.test` | `Admin@123` | Full access: Approvals queue, facility manager, maintenance blocks, utilization analytics |
| **Student 1** | `student1@campusslot.test` | `Student@123` | Facility discovery, booking slots, check-ins, waitlisting |
| **Student 2** | `student2@campusslot.test` | `Student@123` | Alternative student account for testing collisions, waitlist promotion, and attendance |

*(The login screen also provides 1-click demo autofill buttons).*

---

## 9. API Reference Table

All API endpoints are prefixed with `/api`. Responses are serialized JSON.

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new student account |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current authenticated user profile |
| `GET` | `/api/resources` | Public | Query facilities with optional type, capacity, or slot availability |
| `GET` | `/api/resources/:id` | Public | Fetch facility metadata |
| `GET` | `/api/resources/:id/availability?date=YYYY-MM-DD` | Public (Soft Auth) | Generate slot availability grid (`free`, `booked`, `blocked`, `mine`) |
| `POST` | `/api/resources` | Admin | Create a new campus facility |
| `PUT` | `/api/resources/:id` | Admin | Update facility configurations |
| `DELETE` | `/api/resources/:id` | Admin | Deactivate a facility |
| `POST` | `/api/bookings` | Authenticated | Reserve facility slots with atomic concurrency protection |
| `GET` | `/api/bookings/mine` | Authenticated | Retrieve personal booking history |
| `GET` | `/api/bookings/:id` | Authenticated | Fetch specific booking details |
| `POST` | `/api/bookings/:id/cancel` | Authenticated | Cancel personal booking & trigger waitlist promotion |
| `POST` | `/api/bookings/:id/check-in` | Authenticated | Record physical arrival within -10m to +15m window |
| `POST` | `/api/waitlist` | Authenticated | Join the FIFO waitlist for an occupied slot |
| `GET` | `/api/waitlist/mine` | Authenticated | View queued waitlist positions |
| `DELETE` | `/api/waitlist/:id` | Authenticated | Remove oneself from waitlist queue |
| `GET` | `/api/admin/bookings?status=` | Admin | Query bookings across the campus |
| `POST` | `/api/admin/bookings/:id/approve` | Admin | Approve pending booking with optional note |
| `POST` | `/api/admin/bookings/:id/reject` | Admin | Reject pending booking with mandatory note |
| `POST` | `/api/admin/blocked-windows` | Admin | Schedule maintenance block (auto-cancels conflicting bookings) |
| `GET` | `/api/admin/analytics` | Admin | Aggregate utilization, hourly distribution, and no-show rates |
| `GET` | `/api/notifications` | Authenticated | Fetch in-app notifications |
| `POST` | `/api/notifications/:id/read` | Authenticated | Mark individual notification as read |
| `POST` | `/api/notifications/read-all` | Authenticated | Mark all notifications as read |
| `GET` | `/api/health` | Public | Server health ping |

---

## 10. Design Decisions & Technical Trade-offs

### 1. Why Atomic Slot Keys instead of In-Memory Locks or Redis Distributed Locks?
- **Trade-off**: Redis adds distributed locking (`Redlock`) overhead, network round-trips, and an external dependency that can fail independently.
- **Decision**: Storing per-slot keys (e.g. `<resourceId>_<date>_<HH:mm>`) on the `Booking` document with a **partial unique index** (`status IN ['pending', 'approved']`) guarantees atomic, ACID-compliant constraint enforcement at the storage engine level.
- **Benefit**: If 5 students submit requests for the same slot simultaneously (`Promise.all`), MongoDB's storage engine enforces the unique index, allowing exactly one insert to succeed and rejecting the other four with duplicate key error code 11000 (translated by the backend to HTTP 409).

### 2. Why Background Cron (`node-cron`) instead of Message Queues (BullMQ / RabbitMQ)?
- **Trade-off**: Running message queues requires dedicated worker processes and Redis.
- **Decision**: Node-cron runs in-process every minute to evaluate check-in expirations, trigger reminders, and expire pending faculty approvals.
- **Benefit**: Zero external infrastructure requirements, keeping the project deployable on a single free-tier Web Service while providing deterministic state transitions.

### 3. Why Single-Service Render Web Deployment?
- **Trade-off**: Separate services for frontend (Vercel) and backend (Render) introduce cross-origin preflight requests (CORS overhead) and independent cold-start synchronization issues.
- **Decision**: In production, the Express backend serves the statically compiled client (`client/dist`).
- **Benefit**: Single-click deployment via `render.yaml`, unified environment management, zero CORS preflight latency in production, and seamless fallback routing.

---

## 11. Known Limitations & Future Roadmap
1. **Single-Node In-Process Cron**: Suitable for single-instance web services. In a multi-replica clustered production deployment, cron jobs should use database locking (`Agenda` or Redis-backed `BullMQ`) to prevent duplicate executions.
2. **Fixed Timezone Requirement**: The system operates in `Asia/Kolkata` as specified by the college assignment. Multi-campus deployments would require dynamic timezone conversion per facility.
3. **Hardware QR Code Integration**: Future iterations can replace the digital check-in button with physical dynamic QR codes affixed to study room doorways.

---

## 12. AI Usage Disclosure
Generative AI was utilized as an assistive pair-programmer to accelerate boilerplate generation, verify timezone boundary mathematics, and validate test coverage scenarios. All core application logic, database indexes, state management, and business rules were designed, verified, and debugged to adhere strictly to the engineering specification.

---

## 13. Deployment
- **Configuration**: Declaratively defined in [`render.yaml`](file:///c:/Users/ghorp/Downloads/MERN%20END%20TERM%20PROJECT/render.yaml).
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Live Deployment URL**: *(Deployment placeholder: https://campusslot.onrender.com)*
