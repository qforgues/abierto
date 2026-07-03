// Shared open/closed status logic, used by both the internal /api/businesses
// routes and the public /api/v1 API so they never diverge.

// Puerto Rico / Vieques is UTC-4 year-round (no DST).
function getViequesNow() {
  const now = new Date();
  const local = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const dayOfWeek = local.getUTCDay();
  const timeStr = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
  return { dayOfWeek, timeStr };
}

// Compute what status to show publicly.
// todayHours: { open_time, close_time, is_closed } or null if no hours configured
function computeStatus(stored, returnTime, todayHours, timeStr, quickOverride) {
  // Quick manual override — bypass hours until next scheduled reset
  if (quickOverride) return stored || 'Closed';

  // Permanent overrides — stay until owner changes them
  if (stored === 'Closed for the Season') return stored;

  // Out to Lunch auto-expires when return_time passes
  if (stored === 'Out to Lunch') {
    if (!returnTime || timeStr < returnTime) return 'Out to Lunch';
    // return time has passed — fall through to hours or manual
  }

  // No hours configured → honour manual Open/Closed
  if (!todayHours) return stored || 'Closed';

  // Hours configured for today but marked closed
  if (todayHours.is_closed) return 'Closed';

  // Hours incomplete — fall back to stored
  if (!todayHours.open_time || !todayHours.close_time) return stored || 'Closed';

  // Time-based (handle overnight ranges where close < open)
  const isOpen = todayHours.close_time <= todayHours.open_time
    ? (timeStr >= todayHours.open_time || timeStr < todayHours.close_time)  // overnight
    : (timeStr >= todayHours.open_time && timeStr < todayHours.close_time); // same day
  return isOpen ? 'Open' : 'Closed';
}

// Statuses that count as "currently open" for the is_open convenience boolean.
const OPEN_STATUSES = ['Open', 'Open 24 Hours', 'Opening Late', 'Back Soon'];
function deriveIsOpen(status) {
  return OPEN_STATUSES.includes(status);
}

module.exports = { getViequesNow, computeStatus, deriveIsOpen, OPEN_STATUSES };
