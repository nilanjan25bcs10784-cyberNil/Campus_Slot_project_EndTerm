import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import {
  User,
  Resource,
  Booking,
  WaitlistEntry,
  Notification,
  BlockedWindow,
} from '../models/index.js';
import {
  createUtcDate,
  generateSlotKeys,
  formatKolkataDate,
} from '../utils/time.js';

function getDateStr(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return formatKolkataDate(d);
}

export async function seedDatabase() {
  console.log('[Seed] Starting database seeding...');

  // 1. Clear existing collections to ensure idempotence
  await Promise.all([
    User.deleteMany({}),
    Resource.deleteMany({}),
    Booking.deleteMany({}),
    WaitlistEntry.deleteMany({}),
    Notification.deleteMany({}),
    BlockedWindow.deleteMany({}),
  ]);
  console.log('[Seed] Cleared old demo records.');

  // 2. Create Users
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('Admin@123', salt);
  const studentHash = await bcrypt.hash('Student@123', salt);

  const admin = await User.create({
    name: 'Dr. Ramesh Sharma (Admin)',
    email: 'admin@campusslot.test',
    passwordHash: adminHash,
    role: 'admin',
    department: 'Campus Facilities Administration',
  });

  const student1 = await User.create({
    name: 'Aarav Patel',
    email: 'student1@campusslot.test',
    passwordHash: studentHash,
    role: 'student',
    department: 'Computer Science & Engineering',
  });

  const student2 = await User.create({
    name: 'Priya Sundaram',
    email: 'student2@campusslot.test',
    passwordHash: studentHash,
    role: 'student',
    department: 'Electronics & Communication',
  });

  console.log('[Seed] Created 3 users: 1 Admin, 2 Students.');

  // 3. Create 8 Varied Resources
  const resourcesData = [
    {
      name: 'Quiet Study Pod 2A',
      type: 'study_room',
      description: 'Sound-dampened individual/small-group study pod with whiteboard and USB power docks.',
      location: 'Central Library, 2nd Floor',
      capacity: 4,
      openTime: '08:00',
      closeTime: '22:00',
      slotMinutes: 30,
      maxDurationSlots: 4, // 2 hours
      requiresApproval: false,
      isActive: true,
    },
    {
      name: 'Collaborative Think Tank Room 101',
      type: 'study_room',
      description: 'Large conference-style discussion room equipped with smart display, video conferencing, and dual glass whiteboards.',
      location: 'Academic Block B, Ground Floor',
      capacity: 10,
      openTime: '08:00',
      closeTime: '21:00',
      slotMinutes: 60,
      maxDurationSlots: 3, // 3 hours
      requiresApproval: false,
      isActive: true,
    },
    {
      name: 'Advanced Robotics & AI Lab',
      type: 'lab',
      description: 'High-performance GPU cluster nodes, ROS-enabled robotic arms, and sensor workstations for project development.',
      location: 'Turing Innovation Centre, Room 304',
      capacity: 15,
      openTime: '09:00',
      closeTime: '20:00',
      slotMinutes: 60,
      maxDurationSlots: 4,
      requiresApproval: true, // Needs faculty signoff
      isActive: true,
    },
    {
      name: 'IoT & Embedded Systems Lab',
      type: 'lab',
      description: 'Bench power supplies, digital oscilloscopes, soldering fume extractors, and micro-controller dev boards.',
      location: 'ECE Department, Lab Block 1',
      capacity: 12,
      openTime: '09:00',
      closeTime: '21:00',
      slotMinutes: 60,
      maxDurationSlots: 4,
      requiresApproval: false,
      isActive: true,
    },
    {
      name: 'Indoor Badminton Court 1',
      type: 'court',
      description: 'BWF-approved maple wood court with anti-glare LED tournament lighting.',
      location: 'Student Activity & Sports Complex',
      capacity: 4,
      openTime: '06:00',
      closeTime: '22:00',
      slotMinutes: 60,
      maxDurationSlots: 2, // 2 hours max
      requiresApproval: false,
      isActive: true,
    },
    {
      name: 'Synthetic Tennis Court West',
      type: 'court',
      description: 'Outdoor all-weather plexicushion tennis court with automated floodlights.',
      location: 'South Campus Sports Arena',
      capacity: 4,
      openTime: '06:00',
      closeTime: '21:00',
      slotMinutes: 60,
      maxDurationSlots: 2,
      requiresApproval: false,
      isActive: true,
    },
    {
      name: '4K Cinema Camera Kit (Sony FX3)',
      type: 'equipment',
      description: 'Professional cinema camera rig with GM 24-70mm f/2.8 lens, wireless lavalier mics, and carbon fiber tripod.',
      location: 'Media Production Centre, Room 12',
      capacity: 1,
      openTime: '09:00',
      closeTime: '18:00',
      slotMinutes: 60,
      maxDurationSlots: 4,
      requiresApproval: true,
      isActive: true,
    },
    {
      name: 'Laser Cutter & 3D Prototyping Station',
      type: 'equipment',
      description: 'Industrial 80W CO2 laser cutter and dual-extrusion Ultimaker 3D printer for architectural & mechanical models.',
      location: 'Maker Space & FabLab, Workshop 4',
      capacity: 2,
      openTime: '09:00',
      closeTime: '19:00',
      slotMinutes: 30,
      maxDurationSlots: 4,
      requiresApproval: true,
      isActive: true,
    },
  ];

  const createdResources = await Resource.insertMany(resourcesData);
  console.log(`[Seed] Created ${createdResources.length} resources.`);

  const [
    studyPod,
    thinkTank,
    roboticsLab,
    iotLab,
    badmintonCourt,
    tennisCourt,
    cameraKit,
    laserCutter,
  ] = createdResources;

  // 4. Create ~20 realistic bookings across past, today, and future 7 days
  const now = new Date();
  const bookingsToCreate = [];

  // Helper to construct a booking object
  const makeBooking = ({
    user,
    resource,
    dayOffset,
    startTime,
    endTime,
    purpose,
    status,
    checkedInAt = null,
    lateCancellation = false,
    decisionNote = null,
    expiresAt = null,
  }) => {
    const dateStr = getDateStr(dayOffset);
    const startAt = createUtcDate(dateStr, startTime);
    const endAt = createUtcDate(dateStr, endTime);
    const slotKeys = ['pending', 'approved'].includes(status)
      ? generateSlotKeys(resource._id, dateStr, startTime, endTime, resource.slotMinutes)
      : [];

    return {
      user: user._id,
      resource: resource._id,
      date: dateStr,
      startTime,
      endTime,
      startAt,
      endAt,
      purpose,
      status,
      checkedInAt,
      lateCancellation,
      decisionNote,
      expiresAt,
      slotKeys,
    };
  };

  // Past Bookings (for analytics, no-show rate, history)
  bookingsToCreate.push(
    makeBooking({
      user: student1,
      resource: studyPod,
      dayOffset: -3,
      startTime: '10:00',
      endTime: '11:30',
      purpose: 'End-term algorithm revision',
      status: 'completed',
      checkedInAt: createUtcDate(getDateStr(-3), '10:02'),
    }),
    makeBooking({
      user: student2,
      resource: badmintonCourt,
      dayOffset: -3,
      startTime: '17:00',
      endTime: '18:00',
      purpose: 'Inter-branch practice game',
      status: 'completed',
      checkedInAt: createUtcDate(getDateStr(-3), '16:55'),
    }),
    makeBooking({
      user: student1,
      resource: iotLab,
      dayOffset: -2,
      startTime: '14:00',
      endTime: '16:00',
      purpose: 'Sensor calibration for smart grid project',
      status: 'completed',
      checkedInAt: createUtcDate(getDateStr(-2), '14:05'),
    }),
    makeBooking({
      user: student2,
      resource: tennisCourt,
      dayOffset: -2,
      startTime: '08:00',
      endTime: '09:00',
      purpose: 'Morning warm-up matches',
      status: 'no_show', // No-show strike
    }),
    makeBooking({
      user: student1,
      resource: roboticsLab,
      dayOffset: -1,
      startTime: '11:00',
      endTime: '13:00',
      purpose: 'Kinematics verification with robotic arm',
      status: 'completed',
      checkedInAt: createUtcDate(getDateStr(-1), '10:58'),
      decisionNote: 'Approved by Dr. Ramesh Sharma',
    }),
    makeBooking({
      user: student2,
      resource: studyPod,
      dayOffset: -1,
      startTime: '15:00',
      endTime: '16:30',
      purpose: 'Competitive programming sprint',
      status: 'cancelled',
      lateCancellation: true,
      decisionNote: 'Cancelled due to urgent family call',
    })
  );

  // Today & Tomorrow Upcoming Approved Bookings
  bookingsToCreate.push(
    makeBooking({
      user: student1,
      resource: badmintonCourt,
      dayOffset: 1,
      startTime: '18:00',
      endTime: '19:00',
      purpose: 'Campus singles tournament preparation',
      status: 'approved',
    }),
    makeBooking({
      user: student2,
      resource: thinkTank,
      dayOffset: 1,
      startTime: '14:00',
      endTime: '16:00',
      purpose: 'Solar car club design sprint & battery pack sizing',
      status: 'approved',
    }),
    makeBooking({
      user: student1,
      resource: iotLab,
      dayOffset: 2,
      startTime: '10:00',
      endTime: '12:00',
      purpose: 'Zigbee mesh networking testing',
      status: 'approved',
    }),
    makeBooking({
      user: student2,
      resource: studyPod,
      dayOffset: 2,
      startTime: '09:00',
      endTime: '10:30',
      purpose: 'Final year thesis literature review',
      status: 'approved', // target of our demo waitlist entry!
    })
  );

  // Pending Bookings requiring Admin Review (for the Approval Queue)
  bookingsToCreate.push(
    makeBooking({
      user: student1,
      resource: roboticsLab,
      dayOffset: 2,
      startTime: '15:00',
      endTime: '17:00',
      purpose: 'Computer Vision drone tracking demo for semester submission',
      status: 'pending',
      expiresAt: new Date(now.getTime() + 20 * 60 * 60 * 1000),
    }),
    makeBooking({
      user: student2,
      resource: cameraKit,
      dayOffset: 3,
      startTime: '10:00',
      endTime: '13:00',
      purpose: 'Filming cultural festival documentary teaser video',
      status: 'pending',
      expiresAt: new Date(now.getTime() + 18 * 60 * 60 * 1000),
    }),
    makeBooking({
      user: student1,
      resource: laserCutter,
      dayOffset: 3,
      startTime: '14:00',
      endTime: '15:30',
      purpose: 'Cutting acrylic chassis for quadcopter prototype',
      status: 'pending',
      expiresAt: new Date(now.getTime() + 22 * 60 * 60 * 1000),
    }),
    makeBooking({
      user: student2,
      resource: roboticsLab,
      dayOffset: 4,
      startTime: '10:00',
      endTime: '12:00',
      purpose: 'Deep reinforcement learning agent validation on physical robot',
      status: 'pending',
      expiresAt: new Date(now.getTime() + 23 * 60 * 60 * 1000),
    })
  );

  // Later Future Approved Bookings (Day 4 to 7)
  bookingsToCreate.push(
    makeBooking({
      user: student1,
      resource: thinkTank,
      dayOffset: 4,
      startTime: '16:00',
      endTime: '18:00',
      purpose: 'Hackathon team sync-up and wireframe testing',
      status: 'approved',
    }),
    makeBooking({
      user: student2,
      resource: badmintonCourt,
      dayOffset: 5,
      startTime: '07:00',
      endTime: '08:00',
      purpose: 'Morning fitness drill',
      status: 'approved',
    }),
    makeBooking({
      user: student1,
      resource: tennisCourt,
      dayOffset: 5,
      startTime: '17:00',
      endTime: '19:00',
      purpose: 'Club semi-finals match against Faculty team',
      status: 'approved',
    }),
    makeBooking({
      user: student2,
      resource: iotLab,
      dayOffset: 6,
      startTime: '13:00',
      endTime: '15:00',
      purpose: 'PCB debugging and firmware flashing',
      status: 'approved',
    }),
    makeBooking({
      user: student1,
      resource: studyPod,
      dayOffset: 6,
      startTime: '11:00',
      endTime: '12:30',
      purpose: 'Machine learning journal paper peer review',
      status: 'approved',
    }),
    makeBooking({
      user: student2,
      resource: thinkTank,
      dayOffset: 7,
      startTime: '11:00',
      endTime: '13:00',
      purpose: 'End-term presentation rehearsal',
      status: 'approved',
    })
  );

  const createdBookings = await Booking.insertMany(bookingsToCreate);
  console.log(`[Seed] Created ${createdBookings.length} realistic bookings across past & next 7 days.`);

  // 5. Create 1 Active Waitlist Entry for demo
  // Student 1 is waiting on the slot booked by Student 2 (studyPod on Day 2, 09:00 to 10:30)
  const waitlistDate = getDateStr(2);
  await WaitlistEntry.create({
    user: student1._id,
    resource: studyPod._id,
    date: waitlistDate,
    startTime: '09:00',
    endTime: '10:30',
    status: 'waiting',
  });
  console.log(`[Seed] Created 1 active waitlist entry for Student 1 on ${studyPod.name} (${waitlistDate} 09:00-10:30).`);

  // 6. Create 1 Blocked Window for demo (e.g. routine court floor polishing)
  const blockDate = getDateStr(3);
  await BlockedWindow.create({
    resource: badmintonCourt._id,
    startAt: createUtcDate(blockDate, '08:00'),
    endAt: createUtcDate(blockDate, '12:00'),
    reason: 'Scheduled anti-skid court refinishing and net maintenance',
    createdBy: admin._id,
  });
  console.log(`[Seed] Created 1 blocked maintenance window for ${badmintonCourt.name}.`);

  // 7. Create Demo Notifications
  await Notification.insertMany([
    {
      user: student1._id,
      type: 'booking_approved',
      message: `Your booking for ${badmintonCourt.name} on ${getDateStr(1)} (18:00-19:00) is confirmed!`,
      bookingId: createdBookings[6]._id,
      read: false,
    },
    {
      user: student1._id,
      type: 'booking_created',
      message: `Your booking request for ${roboticsLab.name} on ${getDateStr(2)} (15:00-17:00) is submitted and pending faculty approval.`,
      bookingId: createdBookings[10]._id,
      read: true,
    },
    {
      user: student2._id,
      type: 'no_show',
      message: `Your booking for ${tennisCourt.name} on ${getDateStr(-2)} (08:00) was marked as a No-Show because you did not check in within 15 minutes of start.`,
      bookingId: createdBookings[3]._id,
      read: false,
    },
  ]);
  console.log('[Seed] Created demo notifications.');

  console.log('----------------------------------------------------');
  console.log('✅ DATABASE SEED COMPLETE!');
  console.log('Demo Credentials:');
  console.log('  Admin:   admin@campusslot.test    / Admin@123');
  console.log('  Student: student1@campusslot.test / Student@123');
  console.log('  Student: student2@campusslot.test / Student@123');
  console.log('----------------------------------------------------');
}

// Standalone execution support
if (process.argv[1]?.endsWith('seed\\index.js') || process.argv[1]?.endsWith('seed/index.js')) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[Seed Fatal Error]', err);
      process.exit(1);
    }
  })();
}
