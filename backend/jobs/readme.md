
# Background Job Queue (BullMQ)

This directory contains **BullMQ-based background job logic** for multi-tenant SaaS.

---

## Structure

- **`queueManager.js`**: Initializes and exports BullMQ queues and schedulers.
- **`auditLogCleanup.worker.js`**: Worker for tenant-aware audit log cleanup jobs.
- **`addAuditLogCleanupJob.js`**: Helper to enqueue audit log cleanup jobs for a tenant.

---

## Usage

### Start the worker

```bash
node jobs/auditLogCleanup.worker.js
```

### Enqueue a job from anywhere in backend

```js
import { addAuditLogCleanupJob } from './jobs/addAuditLogCleanupJob.js';
await addAuditLogCleanupJob(
  tenantId,
  new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
);
```

## Advanced Features

- **Report Generation Jobs:**
  - `reportGeneration.worker.js`: Worker for tenant-aware report generation (e.g., sales reports).
  - `addReportGenerationJob.js`: Helper to enqueue report generation jobs for a tenant.

- **Queue Monitoring & Events:**
  - All queues emit `failed` events to the logger for observability.
  - You can extend with more events (completed, stalled, etc.) as needed.

---

**All jobs must include `tenantId` for strict tenant isolation and traceability.**
