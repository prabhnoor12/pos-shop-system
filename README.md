# POS Shop System

> Enterprise-grade, extensible Point of Sale (POS) Shop System — Node.js, Express, Prisma, Joi, Winston, ESM


## Key Features

- **Multi-Store & Multi-Register:** Manage unlimited stores and registers per tenant. Assign users to stores with granular roles. All sales and inventory operations are tracked by store and register.
- **Robust Offline Mode:** Idempotent offline sales and inventory sync (with `offlineId`, `synced`, `source` fields) for seamless operation when disconnected. Conflict resolution and safe retries.
- **Modular, Production-Ready Backend:** Node.js, Express, ESM modules, scalable architecture.
- **Authentication & RBAC:** JWT, roles, bcrypt, and role-based access control middleware. Per-action and per-resource permissions.
- **Full CRUD:** Products, categories, customers, suppliers, inventory, sales, stores, registers, users.
- **Inventory Management:** Batch updates, adjustment history, low stock/expiring alerts, warehouse and stock movement tracking, batch/serial numbers, multi-warehouse support.
- **Barcode:** Generation & scanning (API endpoints), supports standard barcode formats.
- **Audit Logging:** Winston (file, optional external service), all critical actions logged for compliance and troubleshooting.
- **Validation & Security:** Joi validation, XSS sanitization, CSRF protection, centralized error handling, rate limiting, secure headers.
- **Pagination, Filtering, Search:** On all major endpoints, optimized for large datasets.
- **Prisma ORM, PostgreSQL:** Multi-tenant schema, optimized queries, connection pooling, migrations.
- **Real-time Updates:** WebSocket plugin for inventory/sales events, instant UI updates.
- **Reporting:** Sales and inventory reports, analytics, CSV export.
- **Plugin System:** Drop-in plugins for business logic or integrations. Auto-loaded at startup, clear API for extension.
- **Integrations:** Ready for payment gateways, e-commerce, accounting, ERP (see roadmap).


## Frontend Features

- **Modern UI:** Dashboard, Inventory, Sales, Reports, Users, Profile, and Auth pages. Responsive/mobile-friendly (Tailwind CSS).
- **Charts & Analytics:** Real-time sales and inventory analytics (Chart.js).
- **Inventory Management:** Search, filter by category, low stock toggle, add/edit/delete, batch updates, and real-time updates.
- **Sales Register:** Fast sales entry, product/quantity selection, search/filter, CSV export, register selection, and offline mode support.
- **User Management:** Add, edit, delete, search users; assign roles and stores.
- **Profile:** Update user/business details, change password.
- **Navigation:** Mobile-responsive menu.
- **Offline Mode:** Sales and inventory can be created offline and synced when reconnected.
- **Accessibility:** Keyboard navigation and screen reader support (in progress).


## Project Structure

```text
pos-shop-system/
  backend/
    config/
    controllers/
    middleware/
    routes/
    services/
    plugins/
    prisma/
    app.js
  frontend/
    (HTML, JS, CSS, assets)
  logs/
    (service logs)
```


## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Configure environment:**
   - Copy `.env.example` to `.env` and set your `DATABASE_URL`, `JWT_SECRET`, and other required variables.
3. **Setup database:**
   ```sh
   npx prisma migrate dev --name init
   npx prisma generate
   ```
4. **Run the backend:**
   ```sh
   npm start
   ```
5. **Access the frontend:**
   - Open `frontend/` HTML files in your browser, or integrate with a modern frontend framework (see roadmap).


## API Endpoints (Highlights)

- `/api/auth` — Login, register, password reset, profile
- `/api/products`, `/api/categories`, `/api/customers`, `/api/suppliers` — Full CRUD
- `/api/inventory` — CRUD, batch, adjustment history, low stock, expiring, warehouses, stock movement, batch/serial
- `/api/inventory/registers` — List/create registers
- `/api/inventory/sync/sales` — Sync offline sales
- `/api/inventory/sync/inventory` — Sync offline inventory
- `/api/pos` — Process sales
- `/api/sales` — Sales history, details, analytics
- `/api/barcode` — Generate/scan barcodes
- `/api/reports` — Sales/inventory reports, analytics
- `/api/stores` — CRUD, assign/remove users, analytics
- `/api/registers` — List/create registers


## Performance & Scalability

- **Redis Caching:** Hot data (products, inventory) cached in Redis for fast access and reduced DB load.
- **Connection Pooling:** Prisma configured for efficient pooling and optimized queries.
- **Idempotent Sync:** Offline sync endpoints are idempotent and safe for unreliable networks.
- **Horizontal Scalability:** Designed for multi-tenant, multi-store deployments.


## Admin Dashboard

- **Secure Admin Dashboard:** (Planned) Real-time monitoring and management (users, inventory, sales, plugins, logs, etc.).


## Plugin/Extension System

- **Plugins:** Drop-in plugins in `backend/plugins/` to extend business logic or integrate with external services. Plugins are auto-loaded at startup. See `backend/plugins/examplePlugin.js` for a template.


## Security & Best Practices

- JWT authentication, role-based access
- Input validation (Joi), XSS sanitization, CSRF protection
- Centralized error handling
- Audit logging (Winston, file)
- ESM modules throughout
- Rate limiting, secure HTTP headers

---


## Advanced Features

- **Multi-Store, Multi-Register:** All sales and inventory operations are tracked by store and register. Users can be assigned to specific stores with roles.
- **Offline Mode:** Sales and inventory can be created offline and synced later. Sync endpoints are idempotent and support conflict resolution.
- **Real-time Updates:** WebSocket plugin for instant inventory/sales updates.
- **Reporting:** Sales and inventory reports with analytics.
- **Audit Logging:** All critical actions are logged for compliance and troubleshooting.
- **Extensible:** Plugin system for custom business logic and integrations.
- **Multi-warehouse:** Track inventory across multiple warehouses and locations.
- **Batch/Serial Tracking:** Full support for batch and serial number management.


## Roadmap & Recommendations

- **Loyalty/Rewards:** Customer loyalty, points, and rewards.
- **Integrations:** Payment gateways, e-commerce, accounting, ERP.
- **Advanced Analytics:** Predictive analytics, AI-driven insights.
- **Mobile App:** Native or PWA for mobile POS.
- **More granular permissions:** Per-action or per-resource RBAC.
- **UI/UX:** Further polish and accessibility improvements.
- **Internationalization:** Multi-language and multi-currency support.
- **Public API & Webhooks:** For integrations and automation.
- **Community & Marketplace:** Plugin marketplace and developer docs.

---


## Database Models (Prisma)

- **User, Store, Register, Product, Category, Inventory, InventoryHistory, Warehouse, Batch, SerialNumber, StockMovement, Customer, Supplier, Sale, SaleItem, AuditLog, Tenant, StoreUser**
- See `backend/prisma/schema.prisma` for full schema and relationships.

---


## License

MIT
