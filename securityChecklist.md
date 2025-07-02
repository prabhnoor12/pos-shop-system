
# Security & Data Breach Response Checklist (GDPR)

## 1. Encryption

- [ ] **At Rest:**
  - Use PostgreSQL's built-in encryption (e.g., disk encryption, encrypted tablespaces) or full-disk encryption on your server.
  - Ensure backups are encrypted.

- [ ] **In Transit:**
  - Use HTTPS for all frontend/backend/API communication.
  - Use SSL/TLS for PostgreSQL connections (set `sslmode=require` in your DATABASE_URL if supported).

## 2. Password Hashing

- [ ] Use `bcrypt` (or `argon2`) for password hashing in your authentication logic.
- [ ] Never log or return raw passwords or password hashes.

## 3. Access Controls & Audit Logs

- [ ] Regularly review user roles and permissions in your database and application.
- [ ] Log all access to sensitive endpoints and data changes (already implemented with Winston/AuditLog).
- [ ] Periodically review audit logs for suspicious activity.

## 4. Data Breach Notification Process

- [ ] **Detection:**
  - Monitor logs for unauthorized access, failed logins, or suspicious activity.
  - Use error monitoring (e.g., Sentry) for real-time alerts.

- [ ] **Response:**
  - Investigate incidents immediately.
  - Contain and mitigate the breach (e.g., revoke tokens, reset passwords).

- [ ] **Notification:**
  - Notify affected users and authorities (e.g., data protection authority) within 72 hours.
  - Provide details: nature of breach, data affected, mitigation steps, and contact info.

- [ ] **Documentation:**
  - Keep a record of all breaches, investigations, and notifications.

## 5. Staff Training

- [ ] Train all staff on security best practices and breach response procedures.

---

**Tip:**

- Add a `security.md` or `incident-response.md` to your repo for your team.
- Use environment variables for all secrets (never hard-code them).
- Regularly update dependencies to patch vulnerabilities.
