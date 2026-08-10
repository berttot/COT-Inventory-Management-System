# COT-Inventory-Management-System
The College of Technologies (COT) Inventory Management System is a comprehensive, web-based solution designed to streamline and automate supply inventory tracking and request management.

## System Overview

This system manages inventory items, tracks stock levels, handles item requests and approvals, and records audit logs for accountability. Key features include:

- Centralized inventory catalog with item details and stock quantities.
- Request and approval workflow so staff can request items and admins can approve or deny requests.
- Role-based access control to separate duties and protect sensitive operations.
- Audit logging and reporting for change history, usage insights, and exports.
- Optional integrations for notifications and calendar scheduling.

## User Roles

The application supports three primary user roles with distinct responsibilities:

- Superadmin: Full system owner with access to all settings, user management, system-wide reports, and the ability to seed or modify global data. Responsible for configuring departments and managing department admins.
- Department Admin: Manages inventory and requests within a specific department. Can approve or reject staff requests, adjust stock for departmental items, and view departmental reports and logs.
- Staff: Regular users who can browse available items, submit requests for needed supplies, and view the status of their requests.

## Setup

- **Backend:** Copy `backend/.env.example` to `backend/.env` and fill in your values. Run `npm install` in `backend/`.
- **Frontend:** Copy `frontend/.env.example` to `frontend/.env` and fill in your values. Run `npm install` in `frontend/`.

Never commit real `.env` files or share them—they contain secrets.
