# Harbor SME Insights (Uruvia)

Harbor SME Insights is a production-grade digital management platform for SMEs, featuring real-time financial tracking, inventory alerts, and professional receipt generation.

## 📄 Project Documentation
For a full breakdown of the app logic, design, and features, see [Project Overview](./docs/project-overview.md).

## 🚀 Deployment to Uruvia
If you are deploying using the terminal, follow these steps to avoid cache and space errors:

1. **Clean Start**:
   ```bash
   npm run nuke
   ```
   *This frees up disk space and removes corrupted hidden caches.*

2. **Deploy**:
   ```bash
   firebase deploy --only hosting:uruvia,functions
   ```

## 🛠 Troubleshooting
- **Disk Space Error (ENOSPC)**: Run `npm run clean` to clear build artifacts. If it persists, run `npm run nuke`.
- **Site Not Detected**: Ensure `firebase.json` has `"site": "uruvia"` set correctly.
- **Function Pre-deploy Errors**: Unused variables in TypeScript files are not allowed. Check `functions/src/index.ts`.

## Key Features
- **Dashboard**: KPI metrics and "Cash Pulse" visualizations.
- **Transactions**: Automated sale logging and expense tracking.
- **Inventory**: Low-stock alerts and CSV bulk import.
- **Resilience**: Built-in global error boundaries and SSR-safe Firebase initialization.
