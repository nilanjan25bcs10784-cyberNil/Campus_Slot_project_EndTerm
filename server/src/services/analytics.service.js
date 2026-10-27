import { Booking } from '../models/Booking.js';
import { Resource } from '../models/Resource.js';
import { User } from '../models/User.js';

export async function getAdminAnalytics() {
  const [
    totalBookings,
    totalResources,
    totalStudents,
    pendingApprovals,
    allBookings,
    resources,
  ] = await Promise.all([
    Booking.countDocuments(),
    Resource.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'student' }),
    Booking.countDocuments({ status: 'pending' }),
    Booking.find().lean(),
    Resource.find({ isActive: true }).lean(),
  ]);

  // 1. No-show rate calculation
  const noShows = allBookings.filter((b) => b.status === 'no_show').length;
  const completed = allBookings.filter((b) => b.status === 'completed').length;
  const approvedPast = allBookings.filter(
    (b) => b.status === 'approved' && new Date(b.endAt) < new Date()
  ).length;
  const totalConcluded = noShows + completed + approvedPast;
  const noShowRate = totalConcluded > 0 ? Number(((noShows / totalConcluded) * 100).toFixed(1)) : 0;

  // 2. Bookings per weekday (Monday - Sunday)
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

  // 3. Bookings per hour (08:00 to 22:00)
  const hourCounts = {};
  for (let h = 8; h <= 21; h++) {
    const key = `${String(h).padStart(2, '0')}:00`;
    hourCounts[key] = 0;
  }

  // 4. Resource usage count map
  const resourceBookingsCount = {};

  allBookings.forEach((b) => {
    // Weekday count
    const d = new Date(b.startAt);
    const dayName = weekdays[d.getDay()];
    if (weekdayCounts[dayName] !== undefined) {
      weekdayCounts[dayName]++;
    }

    // Hour count
    if (b.startTime) {
      const hourPrefix = `${b.startTime.slice(0, 2)}:00`;
      if (hourCounts[hourPrefix] !== undefined) {
        hourCounts[hourPrefix]++;
      }
    }

    // Top resources count
    const resId = String(b.resource);
    resourceBookingsCount[resId] = (resourceBookingsCount[resId] || 0) + 1;
  });

  const bookingsByWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
    (day) => ({
      day,
      count: weekdayCounts[day] || 0,
    })
  );

  const bookingsByHour = Object.entries(hourCounts).map(([hour, count]) => ({
    hour,
    count,
  }));

  // 5. Utilization per resource (%)
  // Based on booked hours vs total operational availability
  const utilizationPerResource = resources.map((res) => {
    const resId = String(res._id);
    const resBookings = allBookings.filter(
      (b) => String(b.resource) === resId && ['approved', 'completed', 'pending'].includes(b.status)
    );

    // Total booked minutes
    const bookedMinutes = resBookings.reduce((acc, b) => {
      const duration = (new Date(b.endAt) - new Date(b.startAt)) / (1000 * 60);
      return acc + (isNaN(duration) ? 0 : duration);
    }, 0);

    // Assume 30 operational days * open daily hours
    const [openH, openM] = res.openTime.split(':').map(Number);
    const [closeH, closeM] = res.closeTime.split(':').map(Number);
    const dailyOpenMinutes = (closeH * 60 + closeM) - (openH * 60 + openM);
    const capacityMonthMinutes = Math.max(dailyOpenMinutes * 14, 60); // 14-day booking horizon

    const rate = Math.min(100, Number(((bookedMinutes / capacityMonthMinutes) * 100).toFixed(1)));

    return {
      id: res._id,
      name: res.name,
      type: res.type,
      utilizationRate: rate,
      totalBookings: resourceBookingsCount[resId] || 0,
    };
  });

  // 6. Top 5 resources
  const topResources = [...utilizationPerResource]
    .sort((a, b) => b.totalBookings - a.totalBookings)
    .slice(0, 5);

  return {
    summary: {
      totalBookings,
      totalResources,
      totalStudents,
      pendingApprovals,
      noShowRate,
    },
    utilizationPerResource,
    bookingsByWeekday,
    bookingsByHour,
    topResources,
  };
}
