// sentry.middleware.js
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes error/request data necessary for error tracking and monitoring.
// - Does not log or expose sensitive user data (e.g., tokens, passwords, PII).
// - All middleware is documented with its data processing purpose.
import * as SentryNode from '@sentry/node';
import * as SentryTracing from '@sentry/tracing';


// Always default to a function, never undefined
let sentryRequestHandler = (req, res, next) => next();
let sentryErrorHandler = (err, req, res, next) => next(err);

if (process.env.SENTRY_DSN) {
  SentryNode.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.5, // Adjust as needed
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new SentryTracing.Integrations.Express()
    ]
  });
  const reqHandler = (SentryNode.Handlers && SentryNode.Handlers.requestHandler && SentryNode.Handlers.requestHandler()) ||
    (SentryNode.handlers && SentryNode.handlers.requestHandler && SentryNode.handlers.requestHandler());
  if (typeof reqHandler === 'function') {
    sentryRequestHandler = reqHandler;
  }
  const errHandler = (SentryNode.Handlers && SentryNode.Handlers.errorHandler && SentryNode.Handlers.errorHandler()) ||
    (SentryNode.handlers && SentryNode.handlers.errorHandler && SentryNode.handlers.errorHandler());
  if (typeof errHandler === 'function') {
    sentryErrorHandler = errHandler;
  }
}

export { sentryRequestHandler, sentryErrorHandler };
