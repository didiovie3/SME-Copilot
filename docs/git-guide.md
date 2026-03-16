# Uruvia Git Workflow Guide

If your GitHub repository is only showing the README, it means your local files haven't been "staged" or "committed" yet. Follow these steps to push your entire codebase.

## 🚀 Pushing All Code (First Time or After Changes)

Run these commands in order from your terminal:

1. **Check Status**: See which files Git is currently ignoring or hasn't noticed.
   ```bash
   git status
   ```

2. **Track All Files**: This tells Git to start watching every file in your project.
   ```bash
   git add .
   ```

3. **Verify Staging**: Run `git status` again. You should see a long list of "new files" or "modified" files in green.

4. **Commit the Codebase**: Save the snapshot locally.
   ```bash
   git commit -m "Pushing full project source including src and docs"
   ```

5. **Push to GitHub**:
   ```bash
   git push
   ```

## 🛠 Troubleshooting

### "Everything up-to-date" but files are missing?
This happens if you haven't run `git commit`. Git only pushes **commits**, not just saved files. Make sure you run step 4 above.

### "Updates were rejected"?
If GitHub has changes you don't have locally, run:
```bash
git pull --rebase
git push
```
