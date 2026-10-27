import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import {
  User,
  Resource,
  Booking,
  WaitlistEntry,
  Notification,
  BlockedWindow,
} from '../src/models/index.js';
import { formatKolkataDate } from '../src/utils/time.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongod;
let app;

// Helper to get future dates in YYYY-MM-DD
function getFutureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return formatKolkataDate(d);
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_secret_for_vitest_supertest_suite_12345';
  process.env.TZ = 'Asia/Kolkata';

  mongod = await MongoMemoryServer.create({
    binary: {
      downloadDir: path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server'),
    },
  });
  const uri = mongod.getUri();
  await mongoose.connect(uri, { autoIndex: true });

  // Ensure unique and partial indexes are built
  await Promise.all([
    User.syncIndexes(),
    Resource.syncIndexes(),
    Booking.syncIndexes(),
    WaitlistEntry.syncIndexes(),
  ]);

  app = createApp();
}, 600000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

beforeEach(async () => {
  // Clear all data before each test for total isolation
  await Promise.all([
    User.deleteMany({}),
    Resource.deleteMany({}),
    Booking.deleteMany({}),
    WaitlistEntry.deleteMany({}),
    Notification.deleteMany({}),
    BlockedWindow.deleteMany({}),
  ]);
});

describe('CampusSlot Automated Test Suite (Spec Compliance)', () => {
  // Test 1: Register/login/me happy path + wrong password + duplicate email
  it('1. Register, login, and fetch me profile; rejects wrong password and duplicate email', async () => {
    // 1. Register student
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Student',
        email: 'student@campusslot.test',
        password: 'Password@123',
        department: 'Computer Science',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data).toHaveProperty('token');
    expect(regRes.body.data.user.email).toBe('student@campusslot.test');
    expect(regRes.body.data.user.role).toBe('student');

    const token = regRes.body.data.token;

    // 2. GET /me with token
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('student@campusslot.test');
    expect(meRes.body.data.user.name).toBe('Test Student');

    // 3. Login with correct password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@campusslot.test',
        password: 'Password@123',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data).toHaveProperty('token');

    // 4. Login with wrong password -> 401
    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@campusslot.test',
        password: 'WrongPassword!',
      });

    expect(wrongPassRes.status).toBe(401);
    expect(wrongPassRes.body.error.code).toBe('INVALID_CREDENTIALS');

    // 5. Duplicate registration -> 409
    const dupRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Another User',
        email: 'student@campusslot.test',
        password: 'Password@123',
        department: 'Information Tech',
      });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  // Test 2: Overlapping booking -> 409
  it('2. Overlapping booking on same resource returns 409 Conflict', async () => {
    // Create resource
    const resource = await Resource.create({
      name: 'Seminar Hall A',
      type: 'study_room',
      description: 'Air conditioned hall',
      location: 'Ground Floor',
      capacity: 20,
      openTime: '08:00',
      closeTime: '20:00',
      slotMinutes: 60,
      maxDurationSlots: 4,
      requiresApproval: false,
      isActive: true,
    });

    // Register User 1
    const user1Res = await request(app).post('/api/auth/register').send({
      name: 'User One',
      email: 'u1@campusslot.test',
      password: 'Password@123',
      department: 'CS',
    });
    const token1 = user1Res.body.data.token;

    // Register User 2
    const user2Res = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email: 'u2@campusslot.test',
      password: 'Password@123',
      department: 'Mech',
    });
    const token2 = user2Res.body.data.token;

    const bookingDate = getFutureDate(3);

    // User 1 books 10:00 - 12:00
    const b1 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        resourceId: resource._id.toString(),
        date: bookingDate,
        startTime: '10:00',
        endTime: '12:00',
        purpose: 'Study Group Discussion',
      });

    expect(b1.status).toBe(201);
    expect(b1.body.data.status).toBe('approved');

    // User 2 attempts to book overlapping slot (11:00 - 13:00) -> 409
    const b2 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        resourceId: resource._id.toString(),
        date: bookingDate,
        startTime: '11:00',
        endTime: '13:00',
        purpose: 'Overlapping reservation attempt',
      });

    expect(b2.status).toBe(409);
    expect(b2.body.error.code).toBe('SLOT_ALREADY_BOOKED');
  });

  // Test 3: Concurrent booking attempts for same slot (Promise.all of 5) -> exactly 1 succeeds
  it('3. Concurrent booking attempts for same slot (Promise.all of 5) results in exactly 1 success and 4 conflicts', async () => {
    const resource = await Resource.create({
      name: 'Badminton Court A',
      type: 'court',
      description: 'Wooden court',
      location: 'Sports Complex',
      capacity: 4,
      openTime: '06:00',
      closeTime: '22:00',
      slotMinutes: 60,
      maxDurationSlots: 2,
      requiresApproval: false,
      isActive: true,
    });

    // Create 5 different users
    const tokens = [];
    for (let i = 1; i <= 5; i++) {
      const reg = await request(app).post('/api/auth/register').send({
        name: `Student Racer ${i}`,
        email: `racer${i}@campusslot.test`,
        password: 'Password@123',
        department: 'Sports',
      });
      tokens.push(reg.body.data.token);
    }

    const bookingDate = getFutureDate(4);

    // Execute 5 concurrent booking requests simultaneously via Promise.all
    const promises = tokens.map((t) =>
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${t}`)
        .send({
          resourceId: resource._id.toString(),
          date: bookingDate,
          startTime: '16:00',
          endTime: '17:00',
          purpose: 'High Concurrency Race Test',
        })
    );

    const responses = await Promise.all(promises);

    const successes = responses.filter((r) => r.status === 201);
    const conflicts = responses.filter((r) => r.status === 409);

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(4);
    conflicts.forEach((r) => {
      expect(r.body.error.code).toBe('SLOT_ALREADY_BOOKED');
    });
  });

  // Test 4: Student cannot cancel or view another student's booking (403/404)
  it("4. Student cannot cancel or view another student's booking", async () => {
    const resource = await Resource.create({
      name: 'Study Room 1',
      type: 'study_room',
      description: 'Quiet room',
      location: 'Library',
      capacity: 4,
      openTime: '08:00',
      closeTime: '20:00',
      slotMinutes: 30,
      maxDurationSlots: 4,
      requiresApproval: false,
      isActive: true,
    });

    const user1Res = await request(app).post('/api/auth/register').send({
      name: 'Student Owner',
      email: 'owner@campusslot.test',
      password: 'Password@123',
      department: 'CS',
    });
    const tokenOwner = user1Res.body.data.token;

    const user2Res = await request(app).post('/api/auth/register').send({
      name: 'Student Intruder',
      email: 'intruder@campusslot.test',
      password: 'Password@123',
      department: 'EE',
    });
    const tokenIntruder = user2Res.body.data.token;

    const bookingDate = getFutureDate(2);

    // Owner creates booking
    const bRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        resourceId: resource._id.toString(),
        date: bookingDate,
        startTime: '10:00',
        endTime: '11:00',
        purpose: 'Private Study',
      });
    expect(bRes.status).toBe(201);
    const bookingId = bRes.body.data._id;

    // Intruder tries to GET booking -> 403
    const getRes = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${tokenIntruder}`);
    expect(getRes.status).toBe(403);
    expect(getRes.body.error.code).toBe('FORBIDDEN');

    // Intruder tries to cancel booking -> 403
    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${tokenIntruder}`)
      .send({ reason: 'Malicious cancellation' });
    expect(cancelRes.status).toBe(403);
    expect(cancelRes.body.error.code).toBe('FORBIDDEN');
  });

  // Test 5: Cancel -> first waitlisted user auto-promoted + notification created
  it('5. Cancelling a booking automatically promotes the first waitlisted user and generates a notification', async () => {
    const resource = await Resource.create({
      name: 'Robotics Bench',
      type: 'lab',
      description: 'Robotics Station',
      location: 'Lab 2',
      capacity: 2,
      openTime: '09:00',
      closeTime: '18:00',
      slotMinutes: 60,
      maxDurationSlots: 4,
      requiresApproval: false,
      isActive: true,
    });

    // Student A (Primary Booker)
    const userARes = await request(app).post('/api/auth/register').send({
      name: 'Student A',
      email: 'studentA@campusslot.test',
      password: 'Password@123',
      department: 'Robotics',
    });
    const tokenA = userARes.body.data.token;

    // Student B (Waitlisted)
    const userBRes = await request(app).post('/api/auth/register').send({
      name: 'Student B',
      email: 'studentB@campusslot.test',
      password: 'Password@123',
      department: 'Robotics',
    });
    const tokenB = userBRes.body.data.token;
    const studentBId = userBRes.body.data.user.id;

    const bookingDate = getFutureDate(3);

    // Student A books 10:00 - 11:00
    const bRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        resourceId: resource._id.toString(),
        date: bookingDate,
        startTime: '10:00',
        endTime: '11:00',
        purpose: 'Initial Booking',
      });
    expect(bRes.status).toBe(201);
    const bookingIdA = bRes.body.data._id;

    // Student B joins waitlist for 10:00 - 11:00
    const wlRes = await request(app)
      .post('/api/waitlist')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        resourceId: resource._id.toString(),
        date: bookingDate,
        startTime: '10:00',
        endTime: '11:00',
      });
    expect(wlRes.status).toBe(201);
    expect(wlRes.body.data.status).toBe('waiting');
    const waitlistEntryId = wlRes.body.data._id;

    // Student A cancels the booking
    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingIdA}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ reason: 'Plans changed' });
    expect(cancelRes.status).toBe(200);

    // Verify Waitlist entry status is now 'promoted'
    const updatedEntry = await WaitlistEntry.findById(waitlistEntryId);
    expect(updatedEntry.status).toBe('promoted');

    // Verify a new booking was created for Student B
    const studentBBooking = await Booking.findOne({
      user: studentBId,
      resource: resource._id,
      date: bookingDate,
      startTime: '10:00',
      status: 'approved',
    });
    expect(studentBBooking).toBeTruthy();
    expect(studentBBooking.purpose).toBe('Promoted from waitlist');

    // Verify a notification was created for Student B
    const notif = await Notification.findOne({
      user: studentBId,
      type: 'waitlist_promoted',
    });
    expect(notif).toBeTruthy();
    expect(notif.message).toContain('promoted from the waitlist');
  });

  // Test 6: Booking outside opening hours / in the past / > max duration -> 400
  it('6. Rejects bookings outside operating hours, in the past, or exceeding max duration', async () => {
    const resource = await Resource.create({
      name: 'Electronics Bench',
      type: 'lab',
      description: 'ECE Lab',
      location: 'Block A',
      capacity: 5,
      openTime: '09:00',
      closeTime: '17:00',
      slotMinutes: 60,
      maxDurationSlots: 2, // max 2 hours (120 min)
      requiresApproval: false,
      isActive: true,
    });

    const userRes = await request(app).post('/api/auth/register').send({
      name: 'Rule Tester',
      email: 'rules@campusslot.test',
      password: 'Password@123',
      department: 'ECE',
    });
    const token = userRes.body.data.token;

    // A. Booking in the past -> 400 PAST_TIME
    const pastRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        resourceId: resource._id.toString(),
        date: '2020-01-01',
        startTime: '10:00',
        endTime: '11:00',
        purpose: 'Past booking',
      });
    expect(pastRes.status).toBe(400);
    expect(pastRes.body.error.code).toBe('PAST_TIME');

    // B. Booking outside operating hours (open is 09:00, attempting 07:00) -> 400 OUTSIDE_OPERATING_HOURS
    const outsideRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        resourceId: resource._id.toString(),
        date: getFutureDate(2),
        startTime: '07:00',
        endTime: '08:00',
        purpose: 'Early morning attempt',
      });
    expect(outsideRes.status).toBe(400);
    expect(outsideRes.body.error.code).toBe('OUTSIDE_OPERATING_HOURS');

    // C. Booking exceeding maxDurationSlots (max is 2 slots / 2h, requesting 3h 10:00-13:00) -> 400 EXCEEDS_MAX_DURATION
    const excessiveRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        resourceId: resource._id.toString(),
        date: getFutureDate(2),
        startTime: '10:00',
        endTime: '13:00',
        purpose: 'Too long session',
      });
    expect(excessiveRes.status).toBe(400);
    expect(excessiveRes.body.error.code).toBe('EXCEEDS_MAX_DURATION');
  });

  // Test 7: Student non-admin hitting admin route -> 403
  it('7. Student non-admin hitting admin routes receives 403 Forbidden', async () => {
    const studentRes = await request(app).post('/api/auth/register').send({
      name: 'Regular Student',
      email: 'regular@campusslot.test',
      password: 'Password@123',
      department: 'Civil',
    });
    const studentToken = studentRes.body.data.token;

    // Student attempting to get all admin bookings
    const adminBookingsRes = await request(app)
      .get('/api/admin/bookings')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(adminBookingsRes.status).toBe(403);
    expect(adminBookingsRes.body.error.code).toBe('FORBIDDEN');

    // Student attempting to fetch admin analytics
    const adminAnalyticsRes = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(adminAnalyticsRes.status).toBe(403);
    expect(adminAnalyticsRes.body.error.code).toBe('FORBIDDEN');
  });

  // Test 8: 3 active bookings cap enforced
  it('8. Enforces student cap of at most 3 active future bookings', async () => {
    const resource = await Resource.create({
      name: 'Conference Room',
      type: 'study_room',
      description: 'Room for meetings',
      location: 'Block C',
      capacity: 8,
      openTime: '08:00',
      closeTime: '22:00',
      slotMinutes: 60,
      maxDurationSlots: 4,
      requiresApproval: false,
      isActive: true,
    });

    const userRes = await request(app).post('/api/auth/register').send({
      name: 'Active Booker',
      email: 'cap@campusslot.test',
      password: 'Password@123',
      department: 'Management',
    });
    const token = userRes.body.data.token;

    // Create 3 valid active bookings on different days
    for (let day = 1; day <= 3; day++) {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resourceId: resource._id.toString(),
          date: getFutureDate(day),
          startTime: '10:00',
          endTime: '11:00',
          purpose: `Booking ${day}`,
        });
      expect(res.status).toBe(201);
    }

    // 4th booking attempt must be rejected with 400
    const fourthRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        resourceId: resource._id.toString(),
        date: getFutureDate(4),
        startTime: '10:00',
        endTime: '11:00',
        purpose: 'Attempting fourth booking',
      });

    expect(fourthRes.status).toBe(400);
    expect(fourthRes.body.error.code).toBe('ACTIVE_BOOKINGS_LIMIT_REACHED');
  });
});
