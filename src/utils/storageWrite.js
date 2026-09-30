// Centralized localStorage.setItem wrapper.
//
// Every write utility in this app persists to localStorage as the only
// datastore — there is no backend. A quota-exceeded or unavailable-storage
// failure (private browsing, a full disk, browser storage settings) used to
// be swallowed silently by each call site's own try/catch, so an assessor's
// edit could vanish with no indication anything went wrong. Every write now
// routes through safeSetItem so a failure is reported once, in one place,
// to anything subscribed (see StorageFailureBanner.jsx) instead of being
// lost in 50+ independent catch blocks.

const listeners = new Set()

// Subscribe to write failures. Returns an unsubscribe function.
export function subscribeToStorageFailures(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Exposed for call sites that need setItem's throwing behavior (e.g. an
// all-or-nothing migration that must abort and leave prior state untouched
// on the first failure) but still want the failure surfaced the same way.
export function notifyStorageFailure(key, error) {
  for (const listener of listeners) {
    try {
      listener({ key, error })
    } catch {
      // A broken listener must never take storage writes down with it.
    }
  }
}

// Attempts to persist a pre-serialized `value` under `key`. Returns true on
// success, false on failure. Never throws — callers already treated storage
// as best-effort; this only adds a single point of failure notification.
export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    notifyStorageFailure(key, error)
    return false
  }
}
