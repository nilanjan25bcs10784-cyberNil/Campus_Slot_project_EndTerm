# CampusSlot - Architecture & Engineering Design

This document details the software architecture, concurrency mechanics, data flow pipelines, and technical trade-offs implemented in **CampusSlot**.

---

## 1. System Architecture Overview

CampusSlot follows a decoupled, three-tier modular architecture designed for high cohesion, low coupling, and verifiable unit/integration testability.

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

---

## 2. Core Workflows & Sequence Diagrams

### Workflow 1: Atomic Booking Creation & Concurrency Control

Preventing double bookings under high concurrent load is guaranteed at the database constraint level using atomic `slotKeys` combined with MongoDB partial unique indexes.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student Client
    participant API as Express Router & Validator
    participant Service as BookingService
    participant DB as MongoDB (Bookings Collection)
    participant Notif as NotificationService

    Student->>API: POST /api/bookings { resourceId, date, startTime, endTime, purpose }
    API->>API: Validate JWT Auth & Zod Payload Structure
    API->>Service: createBooking(params)

    Note over Service: 1. Fetch Facility & Validate Operating Hours<br/>2. Verify Times in Asia/Kolkata (+05:30)<br/>3. Verify Slot Alignment & Max Duration<br/>4. Check Student Active Bookings Cap (<= 3)<br/>5. Check 3-Strike No-Show Penalty (Last 30 Days)<br/>6. Check Overlapping Student Reservations

    Service->>Service: Generate atomic slot keys:<br/>[resourceId_date_10:00, resourceId_date_10:30]
    Service->>DB: INSERT Booking with slotKeys & status='approved'/'pending'

    alt Slot is Available (No Database Collision)
        DB-->>Service: Document Inserted (201 Created)
        Service->>Notif: Create in-app confirmation notification
        Service-->>API: Return Populated Booking Object
        API-->>Student: 201 Created { data: booking }
    else Slot is Already Reserved (Race Condition / Collision)
        DB-->>Service: MongoServerError: E11000 duplicate key error on slotKeys
        Service->>Service: Catch 11000 & Translate to ApiError.conflict()
        Service-->>API: ApiError(409, 'SLOT_ALREADY_BOOKED')
        API-->>Student: 409 Conflict { error: { code: 'SLOT_ALREADY_BOOKED', message: 'Slot already booked' } }
    end
```

---

### Workflow 2: Automated FIFO Waitlist Promotion Engine

When an active booking is cancelled by a student, rejected by faculty, or auto-expired by the background cron job, the slot keys are cleared and the oldest eligible waitlisted candidate is automatically promoted.

```mermaid
flowchart TD
    Trigger([Trigger: Booking Cancelled / Rejected / Expired]) --> Step1[Set Booking status = 'cancelled' / 'rejected']
    Step1 --> Step2[Clear slotKeys = empty array<br/>Freed from Partial Unique Index]
    Step2 --> Step3[Call processWaitlistPromotion resourceId, date]
    
    Step3 --> Step4[Query WaitlistEntry<br/>WHERE resourceId & date & status='waiting'<br/>ORDER BY createdAt ASC FIFO]
    
    Step4 --> CheckCandidate{Candidate Found?}
    CheckCandidate -- No --> EndNoWaitlist([No Action Needed])
    
    CheckCandidate -- Yes --> ValidateSlot{Is Requested Range<br/>Fully Free from Bookings & Blocks?}
    ValidateSlot -- No --> NextCandidate[Examine Next Waitlist Candidate in FIFO Order]
    NextCandidate --> CheckCandidate

    ValidateSlot -- Yes --> ValidateUser{Does Candidate Pass Rules?<br/>- Slot in future<br/>- Under 3 active bookings<br/>- No overlapping reservations<br/>- No active 7-day penalty}
    
    ValidateUser -- Fails --> SkipUser[Skip Disqualified User]
    SkipUser --> NextCandidate

    ValidateUser -- Passes --> Promote[1. Generate Atomic Slot Keys<br/>2. Create Booking for Candidate<br/>3. Set WaitlistEntry status = 'promoted'<br/>4. Generate in-app Notification]
    
    Promote --> EndSuccess([Waitlist Candidate Successfully Promoted])
```

---

### Workflow 3: Check-in Window Enforcement & No-Show Strike Policy

```mermaid
flowchart LR
    Start([Booking Start Time T]) --> PreWindow[T - 10 Minutes<br/>Check-in Window Opens]
    PreWindow --> PostWindow[T + 15 Minutes<br/>Check-in Window Closes]
    
    PreWindow -.->|Student Clicks Check-In| CheckedIn([Status: Checked In<br/>checkedInAt Recorded])
    PostWindow -.->|Background Cron Runs| CronCheck{Checked In?}
    CronCheck -- Yes --> Complete[Marked 'completed' after End Time]
    CronCheck -- No --> Strike[Marked 'no_show'<br/>slotKeys freed<br/>Strike recorded against user]
    
    Strike --> PenaltyCheck{>= 3 No-Shows in Last 30 Days?}
    PenaltyCheck -- Yes --> Restriction[7-Day Booking Restriction Imposed]
    PenaltyCheck -- No --> Warning[Warning Notification Sent]
```

---

## 3. Database Schema & Indexing Strategy

```mermaid
erDiagram
    User ||--o{ Booking : creates
    User ||--o{ WaitlistEntry : joins
    User ||--o{ Notification : receives
    User ||--o{ BlockedWindow : schedules
    Resource ||--o{ Booking : reserves
    Resource ||--o{ WaitlistEntry : queues
    Resource ||--o{ BlockedWindow : locks

    User {
        ObjectId _id PK
        string name
        string email UK
        string passwordHash
        string role "student | admin"
        string department
        date createdAt
    }

    Resource {
        ObjectId _id PK
        string name
        string type "study_room | lab | court | equipment"
        string location
        number capacity
        string openTime "HH:mm"
        string closeTime "HH:mm"
        number slotMinutes "30 | 60"
        number maxDurationSlots
        boolean requiresApproval
        boolean isActive
    }

    Booking {
        ObjectId _id PK
        ObjectId user FK
        ObjectId resource FK
        string date "YYYY-MM-DD"
        string startTime "HH:mm"
        string endTime "HH:mm"
        date startAt
        date endAt
        string purpose
        string status "pending | approved | rejected | cancelled | completed | no_show"
        date checkedInAt
        boolean lateCancellation
        string decisionNote
        date expiresAt
        string[] slotKeys "Partial Unique Index"
        boolean reminderSent
    }

    WaitlistEntry {
        ObjectId _id PK
        ObjectId user FK
        ObjectId resource FK
        string date "YYYY-MM-DD"
        string startTime "HH:mm"
        string endTime "HH:mm"
        string status "waiting | promoted | expired | cancelled"
        date createdAt
    }

    BlockedWindow {
        ObjectId _id PK
        ObjectId resource FK
        date startAt
        date endAt
        string reason
        ObjectId createdBy FK
    }

    Notification {
        ObjectId _id PK
        ObjectId user FK
        string type
        string message
        ObjectId bookingId FK
        boolean read
        date createdAt
    }
```

### Critical Partial Unique Index Definition
```javascript
bookingSchema.index(
  { slotKeys: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'approved'] },
    },
  }
);
```
- **Why it matters**: MongoDB enforces uniqueness across any active reservation slot. When a reservation is cancelled, rejected, completed, or marked as a no-show, `slotKeys` is reset to `[]`, immediately freeing the slot for other students or waitlist candidates without deleting historical records.
