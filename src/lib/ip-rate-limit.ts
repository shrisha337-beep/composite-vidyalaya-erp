/**
 * IP-based rate limiter for the login endpoint.
 *
 * Stored in-memory — works perfectly for a local always-on school server
 * (single process, always running). For a multi-instance cloud deploy, swap
 * the store for Redis or a DB table.
 *
 * Rule: 5 failed login attempts from the same IP within 15 minutes
 *       → block that IP for 15 minutes.
 *
 * We track only *failed* attempts so a legitimate admin who types their
 * password wrong a few times isn't permanently inconvenienced.
 */

interface IpRecord {
  count: number;       // failed attempts in the current window
  windowStart: number; // epoch ms when this window started
  blockedUntil: number | null; // epoch ms, or null if not blocked
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;   // 15 minutes
const BLOCK_MS  = 15 * 60 * 1000;   // 15 minutes

// The in-memory store. Cleaned up every hour so it doesn't grow forever.
const store = new Map<string, IpRecord>();

// Cleanup timer — runs every hour, removes stale entries
if (typeof global !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of store.entries()) {
      const isStale =
        (!rec.blockedUntil || rec.blockedUntil < now) &&
        now - rec.windowStart > WINDOW_MS;
      if (isStale) store.delete(ip);
    }
  }, 60 * 60 * 1000).unref?.();
}

/**
 * Call this BEFORE credential verification.
 * Returns { blocked: true, retryAfterSec } if the IP is rate-limited,
 * otherwise returns { blocked: false }.
 */
export function checkIpRateLimit(ip: string): {
  blocked: boolean;
  retryAfterSec?: number;
} {
  const now = Date.now();
  const rec = store.get(ip);

  if (rec) {
    // Currently blocked?
    if (rec.blockedUntil && rec.blockedUntil > now) {
      return {
        blocked: true,
        retryAfterSec: Math.ceil((rec.blockedUntil - now) / 1000),
      };
    }

    // Window expired — reset counter
    if (now - rec.windowStart > WINDOW_MS) {
      store.set(ip, { count: 0, windowStart: now, blockedUntil: null });
    }
  }

  return { blocked: false };
}

/**
 * Call this AFTER a FAILED login attempt.
 * Increments the counter and blocks the IP if the limit is hit.
 */
export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const rec = store.get(ip) ?? { count: 0, windowStart: now, blockedUntil: null };

  // Reset if window has passed
  if (now - rec.windowStart > WINDOW_MS) {
    rec.count = 0;
    rec.windowStart = now;
    rec.blockedUntil = null;
  }

  rec.count += 1;

  if (rec.count >= MAX_ATTEMPTS) {
    rec.blockedUntil = now + BLOCK_MS;
    rec.count = 0;         // reset so next window starts fresh after unblock
    rec.windowStart = now;
  }

  store.set(ip, rec);
}

/**
 * Call this after a SUCCESSFUL login to clear any partial failed-attempt state.
 */
export function clearIpRecord(ip: string): void {
  store.delete(ip);
}
