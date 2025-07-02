import { createLogger, format, transports } from 'winston';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

const logTransports = [
  new transports.Console({
    format: isProduction
      ? format.combine(format.timestamp(), format.json())
      : format.combine(
          format.colorize(),
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          format.printf(({ timestamp, level, message, ...meta }) => {
            let msg = `[${timestamp}] ${level}: ${message}`;
            if (Object.keys(meta).length) {
              msg += ` ${JSON.stringify(meta)}`;
            }
            return msg;
          })
        ),
  })
];

if (isProduction) {
  logTransports.push(
    new transports.File({ filename: path.resolve('logs/error.log'), level: 'error' }),
    new transports.File({ filename: path.resolve('logs/combined.log') })
  );
}

const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: format.combine(
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'pos-shop-system' },
  transports: logTransports,
  exitOnError: false,
});

// GDPR: Log all access to sensitive endpoints and data changes
// (Already implemented via Winston and AuditLog in controllers/middleware)

// Security: Monitor for suspicious activity
logger.on('data', (log) => {
  if (log.level === 'warn' || log.level === 'error') {
    // Optionally, send alerts to Sentry or email for critical events
    // e.g., if (log.message.includes('AUTH_INVALID_TOKEN')) { ... }
  }
});

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new transports.Console(),
  ...(isProduction ? [new transports.File({ filename: path.resolve('logs/exceptions.log') })] : [])
);

process.on('unhandledRejection', (ex) => {
  logger.error('Unhandled Rejection:', ex);
});

export default logger;
