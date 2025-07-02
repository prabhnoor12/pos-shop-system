
// smsService.js
// SMS/WhatsApp and Email Service using Twilio and SendGrid (Enterprise Level)
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes message data necessary for communication.
// - Does not log or store personal or sensitive data (e.g., message content, recipient info) beyond what is required for delivery.
// - All service functions are documented with their data processing purpose.
import PQueue from 'p-queue';
import Bottleneck from 'bottleneck';
// --- Rate Limiting and Queue Setup ---
// Configure as needed for your business requirements
const whatsappLimiter = new Bottleneck({
  minTime: 1200, // ~1 msg/sec (Twilio free tier limit)
  maxConcurrent: 1
});
const emailLimiter = new Bottleneck({
  minTime: 500, // ~2 emails/sec (SendGrid free tier limit)
  maxConcurrent: 1
});

// Message queues for reliability and burst handling
const whatsappQueue = new PQueue({ concurrency: 2 });
const emailQueue = new PQueue({ concurrency: 2 });

import twilio from 'twilio';
import sgMail from '@sendgrid/mail';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER; // e.g. 'whatsapp:+14155238886'
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM_EMAIL;

// Allow dependency injection for testability
let twilioClient = null;
let sgMailClient = null;

function getTwilioClient() {
  if (!twilioClient) {
    if (!TWILIO_SID || !TWILIO_AUTH) throw new Error('Twilio config missing');
    twilioClient = twilio(TWILIO_SID, TWILIO_AUTH);
  }
  return twilioClient;
}

function getSendGridClient() {
  if (!sgMailClient) {
    if (!SENDGRID_API_KEY) throw new Error('SendGrid config missing');
    sgMail.setApiKey(SENDGRID_API_KEY);
    sgMailClient = sgMail;
  }
  return sgMailClient;
}

/**
 * Send a WhatsApp message using Twilio
 * @param {string} to - Recipient phone number (E.164 format, e.g. +1234567890)
 * @param {string} message - Message body
 * @param {object} [options] - Optional Twilio message options
 * @returns {Promise<object>} Twilio message response
 */
/**
 * Send a WhatsApp message using Twilio, with queueing and rate limiting
 * @param {string} to - Recipient phone number (E.164 format, e.g. +1234567890)
 * @param {string} message - Message body
 * @param {object} [options] - Optional Twilio message options
 * @returns {Promise<object>} Twilio message response
 */
/**
 * Send a WhatsApp message using Twilio, with queueing and rate limiting
 * Purpose: Only processes and sends message data needed for delivery. No personal data stored or logged beyond delivery.
 */
export async function sendWhatsApp(to, message, options = {}) {
  if (!TWILIO_WHATSAPP) throw new Error('Twilio WhatsApp number missing');
  return whatsappQueue.add(() =>
    whatsappLimiter.schedule(async () => {
      try {
        const client = getTwilioClient();
        const msg = await client.messages.create({
          from: TWILIO_WHATSAPP,
          to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
          body: message,
          ...options
        });
        return msg;
      } catch (err) {
        logError('WhatsApp send error', err);
        throw err;
      }
    })
  );
}

/**
 * Send an email using SendGrid
 * @param {string|string[]} to - Recipient email(s)
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} [html] - HTML body (optional)
 * @param {object} [options] - Additional SendGrid mail options
 * @returns {Promise<object>} SendGrid response
 */
/**
 * Send an email using SendGrid, with queueing and rate limiting
 * @param {string|string[]} to - Recipient email(s)
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} [html] - HTML body (optional)
 * @param {object} [options] - Additional SendGrid mail options
 * @returns {Promise<object>} SendGrid response
 */
/**
 * Send an email using SendGrid, with queueing and rate limiting
 * Purpose: Only processes and sends email data needed for delivery. No personal data stored or logged beyond delivery.
 */
export async function sendEmail(to, subject, text, html, options = {}) {
  if (!SENDGRID_FROM) throw new Error('SendGrid from address missing');
  return emailQueue.add(() =>
    emailLimiter.schedule(async () => {
      try {
        const mail = getSendGridClient();
        const msg = {
          to,
          from: SENDGRID_FROM,
          subject,
          text,
          html: html || text,
          ...options
        };
        const [response] = await mail.send(msg);
        return response;
      } catch (err) {
        logError('SendGrid send error', err);
        throw err;
      }
    })
  );
}
/**
 * Expose queue and limiter status for monitoring
 */
/**
 * Expose queue and limiter status for monitoring
 * Purpose: Only exposes queue status. No personal data processed.
 */
export function getQueueStatus() {
  return {
    whatsapp: {
      size: whatsappQueue.size,
      pending: whatsappQueue.pending,
      isPaused: whatsappQueue.isPaused
    },
    email: {
      size: emailQueue.size,
      pending: emailQueue.pending,
      isPaused: emailQueue.isPaused
    }
  };
}

/**
 * Utility to log errors in a consistent, enterprise-friendly way
 * @param {string} context
 * @param {Error|object} err
 */
/**
 * Utility to log errors in a consistent, enterprise-friendly way
 * Purpose: Only logs error context and message. No personal data logged.
 */
function logError(context, err) {
  // Prefer a centralized logger if available
  if (typeof global !== 'undefined' && global.logger && typeof global.logger.error === 'function') {
    global.logger.error({ context, error: err && err.message ? err.message : err });
  } else {
    // Fallback to console
    console.error(`[${context}]`, err);
  }
}

/**
 * For testing/mocking: allow injection of custom clients
 */
/**
 * For testing/mocking: allow injection of custom clients
 * Purpose: Only used for testing. No personal data processed.
 */
export function _setTwilioClient(client) { twilioClient = client; }
export function _setSendGridClient(client) { sgMailClient = client; }
