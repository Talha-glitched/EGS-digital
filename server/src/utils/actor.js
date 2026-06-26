export function getActor(req) {
  const user = req.user || req.admin;
  if (!user) {
    return { userId: null, displayName: 'admin', email: null };
  }
  return {
    userId: user.userId || null,
    displayName: user.displayName || user.username || 'admin',
    email: user.email || user.username || null,
  };
}

export function attachUserToRequest(req, session) {
  req.user = session;
  req.admin = session;
}
