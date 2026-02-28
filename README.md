# Uruvia

Uruvia is a modern digital business management platform designed for smart entrepreneurs to move beyond manual bookkeeping.

## Live Application
You can access the live version of the app at:
**[https://harbor-ie-tracker.web.app](https://harbor-ie-tracker.web.app)**

## Deployment & Branding
To successfully push and deploy your changes, follow these steps in your terminal:

1. **Rename Branch**: If your terminal shows `main`, rename it:
   - `git branch -m main uruvia`
2. **Resolve Conflicts**: Run this command to sync with the remote repository:
   - `git pull origin uruvia --allow-unrelated-histories`
   - *Note: if a text editor opens, type `:wq` and press Enter to save the merge.*
3. **Save and Push**:
   - `git add .`
   - `git commit -m "fix: resolve build errors and update branding"`
   - `git push -u origin uruvia`

## Git LFS (Large File Storage)
If you have files larger than 100MB (like a high-res logo):
1. Install Git LFS on your machine.
2. Run this in your terminal: `git lfs install`
3. The `.gitattributes` file is already configured to track `.png` and other image types.
4. Add and commit your changes as usual.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS & ShadCN UI
- **Database/Auth:** Firebase (Firestore & Authentication)
- **AI Integration:** Genkit (Google AI)
