// sentry.js
import * as Sentry from '@sentry/node';

export function initSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN });
    return Sentry;
  }
  return null;
}

export default Sentry;
