# Uruvia: SME Insights Platform Overview

## 1. Core Concept & Logic
Uruvia is a production-grade digital management platform designed specifically for Small and Medium Enterprises (SMEs). Its primary logic centers around **Financial Clarity** and **Operational Efficiency**.

### Key Architectural Pillars:
- **Sequential Binary IDs**: A unique identifier system (e.g., `UI-00001`, `BI-00010`, `TD-00101`) is used for Users, Businesses, Transactions, and Inventory items to provide a professional, structured database appearance.
- **Optimistic UI (Non-Blocking)**: The app leverages Firebase's offline persistence and custom non-blocking wrapper functions. Mutations happen instantly in the UI while syncing in the background.
- **Role-Based Access Control (RBAC)**: 
    - `smeOwner`: Manages their specific business, logs sales/expenses, and tracks inventory.
    - `admin`: Oversees all registered businesses, manages user feedback, and pushes AI-generated advice to owners.
- **SSR-Safe Firebase**: Initialization is strictly client-side with proper hydration safety checks to prevent Next.js 15 rendering errors.

## 2. Design Elements
- **Tech Stack**: Next.js 15 (App Router), React 19, Tailwind CSS, and ShadCN UI.
- **Visual Identity**: 
    - **Palette**: Deep professional blues (`--primary`) contrasted with growth-oriented greens (`--accent`).
    - **Typography**: Inter (Sans-serif) for high readability.
    - **Responsiveness**: A persistent, collapsible sidebar for desktop and a touch-optimized drawer for mobile.
    - **Themes**: Full support for System, Light, and Dark modes via `next-themes`.
- **Dashboards**: Uses `Recharts` for "Cash Pulse" visualizations and `Progress` components for tracking strategic revenue goals.

## 3. Current Feature Set

### A. SME Management (Owner Features)
- **Business Command Center**: KPI cards for Total Revenue, Total Expenses, Net Income, and a "Burn Rate" flame alert for high overhead.
- **Transaction Ledger**: Searchable and filterable logs. Supports logging sales (linked to inventory) and expenses (with receipt proof).
- **Professional Receipts**: Dynamic generation of digital receipts that can be printed or downloaded as PDFs via `jspdf` and `html2canvas`.
- **Inventory System**: Tracks "Goods" (with stock levels and reorder points) and "Services" (fixed value). Includes low-stock alerts and a **CSV Bulk Import** tool.
- **Strategic Goals**: Allows owners to set monthly revenue targets with AI-powered "Copilot Insights" providing progress-based encouragement.

### B. Admin & Platform Tools (Admin Features)
- **Feedback Portal**: A centralized hub to manage user reports (Bugs, Features, Improvements) with status tracking.
- **Business Analysis**: Deep-dive views into any registered SME's finances and inventory without leaving the admin portal.
- **AI Advice Pusher**: Uses **Genkit** to analyze business trends and generate professional consultant-grade advice which is then "pushed" to the SME's dashboard.

### C. Security & Resilience
- **Strict Firestore Rules**: Prevents unauthorized data access, blocks manual role elevation, and validates data structures at the database level.
- **Global Error Boundaries**: Robust `error.tsx` and `global-error.tsx` files to capture and display diagnostic IDs for system crashes.
- **Sync Status**: A real-time "Cloud Sync" indicator showing when the app is in "Offline Mode" or actively backing up data.
- **Email Verification**: Profile editing features are locked until the user verifies their email for enhanced security.