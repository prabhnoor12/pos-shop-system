
// Express session middleware for use with lusca and authentication (ESM version)
import session from 'express-session';

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-very-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // set to true if using HTTPS
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
});

export default sessionMiddleware;
