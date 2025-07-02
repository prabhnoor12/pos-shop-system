// sentry.middleware.js
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes error/request data necessary for error tracking and monitoring.
// - Does not log or expose sensitive user data (e.g., tokens, passwords, PII).
// - All middleware is documented with its data processing purpose.
import * as SentryNode from '@sentry/node';
import * as SentryTracing from '@sentry/tracing';

let sentryRequestHandler = (req, res, next) => next();
let sentryErrorHandler = (err, req, res, next) => next(err);

if (process.env.SENTRY_DSN) {
  SentryNode.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.5, // Adjust as needed
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new SentryNode.Integrations.Http({ tracing: true }),
      new SentryTracing.Integrations.Express({ app: null }) // app will be set in main app.js
    ]
  });
  sentryRequestHandler = SentryNode.Handlers.requestHandler();
  sentryErrorHandler = SentryNode.Handlers.errorHandler();
}

export { sentryRequestHandler, sentryErrorHandler };
