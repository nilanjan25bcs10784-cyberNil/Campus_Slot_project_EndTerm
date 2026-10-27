/**
 * Utility functions for time and date calculations in Asia/Kolkata (+05:30)
 */

export const KOLKATA_OFFSET = '+05:30';

/**
 * Parses YYYY-MM-DD and HH:mm in Asia/Kolkata and returns a JavaScript UTC Date
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} timeStr HH:mm
 * @returns {Date}
 */
export function createUtcDate(dateStr, timeStr) {
  const isoString = `${dateStr}T${timeStr}:00${KOLKATA_OFFSET}`;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date or time: ${dateStr} ${timeStr}`);
  }
  return date;
}

/**
 * Converts HH:mm to minutes from midnight
 * @param {string} timeStr HH:mm
 * @returns {number}
 */
export function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight to HH:mm string
 * @param {number} totalMinutes
 * @returns {string} HH:mm
 */
export function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Generates atomic slot keys for a given resource and time window
 * Format: '<resourceId>_<date>_<HH:mm>' for each slot covered
 * @param {string|import('mongoose').Types.ObjectId} resourceId
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} startTimeStr HH:mm
 * @param {string} endTimeStr HH:mm
 * @param {number} slotMinutes 30 or 60
 * @returns {string[]}
 */
export function generateSlotKeys(resourceId, dateStr, startTimeStr, endTimeStr, slotMinutes) {
  const startMin = timeToMinutes(startTimeStr);
  const endMin = timeToMinutes(endTimeStr);
  const keys = [];

  for (let current = startMin; current < endMin; current += slotMinutes) {
    const slotTimeStr = minutesToTime(current);
    keys.push(`${String(resourceId)}_${dateStr}_${slotTimeStr}`);
  }

  return keys;
}

/**
 * Checks if a given time is aligned to slot intervals starting from openTime
 * @param {string} timeStr HH:mm
 * @param {number} slotMinutes
 * @param {string} openTimeStr HH:mm
 * @returns {boolean}
 */
export function isTimeAligned(timeStr, slotMinutes, openTimeStr) {
  const targetMin = timeToMinutes(timeStr);
  const openMin = timeToMinutes(openTimeStr);
  if (targetMin < openMin) return false;
  return (targetMin - openMin) % slotMinutes === 0;
}

/**
 * Formats a Date object to YYYY-MM-DD in Asia/Kolkata
 * @param {Date} date
 * @returns {string}
 */
export function formatKolkataDate(date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Formats a Date object to HH:mm in Asia/Kolkata
 * @param {Date} date
 * @returns {string}
 */
export function formatKolkataTime(date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
}
