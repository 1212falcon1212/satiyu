const SESSION_KEY = 'giyim_session_id';

function generateUUID(): string {
  return crypto.randomUUID();
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}
