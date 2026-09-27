// Minimal admin protection using a shared secret token set in .env (ADMIN_TOKEN).
// Client must send:  Authorization: Bearer <ADMIN_TOKEN>
// This is intentionally simple — for a real production admin panel, replace
// with proper hashed-password login + sessions/JWT before handling real users.
function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!process.env.ADMIN_TOKEN) {
    const err = new Error('Admin routes are not configured (ADMIN_TOKEN missing)');
    err.status = 500;
    return next(err);
  }

  if (!token || token !== process.env.ADMIN_TOKEN) {
    const err = new Error('Unauthorized');
    err.status = 401;
    return next(err);
  }

  next();
}

module.exports = adminAuth;
