# Backend–Frontend Alignment Audit

This document confirms that the backend APIs are correctly aligned with the frontend after the dashboard and UI updates.

---

## 1. Staff Dashboard (`/staff`)

| Frontend usage | Backend endpoint | Response shape | Status |
|----------------|------------------|----------------|--------|
| Total items | `GET /api/requests/summary` | `{ totalItems, totalRequests, outOfStock }` | ✅ Uses `totalItems` |
| Staff requests list (recent, chart, this-year count) | `GET /api/requests/staff/:userId` | Array of `{ _id, itemName, quantity, requestedAt, createdAt, requestedBy, ... }` | ✅ Matches; frontend uses `requestedAt` / `createdAt`, `itemName`, `quantity` |

**Note:** Staff dashboard no longer calls `GET /api/requests/staff-summary/:userId`; total requests “this year” is derived from the staff requests list. The `staff-summary` endpoint still exists and can be used elsewhere if needed.

---

## 2. Department Admin Dashboard (`/department-admin`)

| Frontend usage | Backend endpoint | Response shape | Status |
|----------------|------------------|----------------|--------|
| Total items | `GET /api/requests/summary` | `{ totalItems, ... }` | ✅ |
| Department requests (recent, chart, this-year count) | `GET /api/requests/department/:department` | Array of request objects with `itemName`, `quantity`, `requestedBy`, `requestedAt` / `createdAt` | ✅ Frontend uses `encodeURIComponent(department)`; backend receives decoded param |

---

## 3. Super Admin Dashboard (`/super-admin`)

| Frontend usage | Backend endpoint | Response shape | Status |
|----------------|------------------|----------------|--------|
| Total users | `GET /api/users/count` | `{ total }` | ✅ |
| Total items & alerts | `GET /api/requests/summary` | `{ totalItems, outOfStock }` | ✅ |
| Request trends (chart + “Total Requests” card) | `GET /api/requests/trends?year=&month=` | Year: `[{ month, requests }]`; Month: `[{ day, requests }]` | ✅ Frontend sums `requests` for selected period |
| Department activity (chart) | `GET /api/requests/department-activity?year=&month=` | `[{ department, requests }]` | ✅ |

---

## 4. Backend routes and controllers (reference)

- **Requests:** `requestRoutes.js` → `requestController.js`  
  - `getSummary`, `getStaffRequests`, `getDepartmentRequests`, `getRequestTrends`, `getDepartmentActivity`, `getStaffSummary` all exist and return the shapes above.
- **Users:** `userRoutes.js` → `userController.js`  
  - `getUserCount` returns `{ total }`.
- **Request model:** `RequestModel.js` includes `requestedAt`, `createdAt` (timestamps), `itemName`, `quantity`, `requestedBy`, `department`, `status` — all fields used by the frontend are present.

---

## 5. Optional backend improvement (legacy data)

- **Trends/activity:** `getRequestTrends` and `getDepartmentActivity` filter only on `requestedAt`. If you have very old requests where `requestedAt` is missing but `createdAt` exists, they won’t appear in trends. If you need to include them, the `$match` stage could be extended to also count documents that have `createdAt` in range when `requestedAt` is null. This is optional and only relevant if you have such legacy data.

---

**Conclusion:** The backend is correctly aligned with the frontend. All endpoints used by the updated dashboards exist, and response shapes match what the frontend expects. No backend changes are required for the current frontend behavior.
