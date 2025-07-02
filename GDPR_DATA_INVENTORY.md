# GDPR Data Inventory & Data Flow Map for POS Shop System

## 1. Personal Data Collected

| Data Field         | Source (Controller/Service)         | Storage (DB Table/Model) | Who Has Access (Role/API)         | Third-Party Shared? |
|--------------------|-------------------------------------|--------------------------|------------------------------------|---------------------|
| User ID            | authController, userController      | User                     | Admin, User (self), System         | No                  |
| Name               | authController, userController      | User                     | Admin, User (self), System         | No                  |
| Email              | authController, userController      | User                     | Admin, User (self), System         | No                  |
| Password (hashed)  | authController                     | User                     | System (never exposed/logged)      | No                  |
| Role               | authController, userController      | User                     | Admin, System                      | No                  |
| CreatedAt/UpdatedAt| All user-related controllers        | User                     | Admin, User (self), System         | No                  |
| Sales Data         | salesController, salesService       | Sale, SaleItem           | Admin, User (self, if allowed)     | No                  |
| Inventory Actions  | inventoryController, inventoryService| Inventory, InventoryHistory| Admin, User (if allowed)         | No                  |
| Customer Info      | customerController                  | Customer                 | Admin, User (if allowed)           | No                  |
| SMS (phone numbers)| smsService                          | (Not stored, sent via SMS API) | Admin, System                | Yes (SMS provider)  |
| Audit Logs         | All controllers (via logger)        | AuditLog                 | Admin, System                      | No                  |

## 2. Data Flow Map

- **User Registration/Login:**
  - Data: Name, Email, Password
  - Flow: Frontend → authController → User (DB)
  - Access: User (self), Admin

- **User Data Access/Export/Erasure:**
  - Data: User profile fields
  - Flow: Frontend → userController → User (DB)
  - Access: User (self)

- **Sales/Inventory/Customer Management:**
  - Data: Sales, Inventory, Customer info
  - Flow: Frontend → respective controllers/services → DB
  - Access: Admin, User (if allowed by role)

- **SMS Notifications:**
  - Data: Phone number, message content
  - Flow: Backend → smsService → Third-party SMS API
  - Access: Admin, System
  - Third-party: Yes (SMS provider)

- **Logging/Audit:**
  - Data: Event metadata (never PII)
  - Flow: All controllers/middleware → logger → AuditLog (DB or file)
  - Access: Admin, System

## 3. Third-Party Services

| Service         | Data Shared           | Purpose                | GDPR DPA in Place? |
|-----------------|----------------------|------------------------|--------------------|
| SMS Provider    | Phone number, message| Transactional SMS      | (To be confirmed)  |
| Sentry (if used)| Error metadata       | Error monitoring       | (To be confirmed)  |

## 4. Notes

- No sensitive data (passwords, tokens) is logged or shared with third parties.
- All data access is role-based and logged.
- Data minimization is enforced in all controllers/services.

---

**Update this document as your data model or integrations change.**
