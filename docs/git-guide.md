# Uruvia Git Workflow Guide

This guide outlines the standard procedure for pushing code updates from your local environment to the GitHub repository.

## 🚀 Standard Update (Daily Workflow)

Run these three commands in order whenever you want to save your progress to GitHub:

1. **Stage Changes**: Prepares all modified files for the commit.
   ```bash
   git add .
   ```

2. **Commit**: Creates a labeled snapshot of your work.
   ```bash
   git commit -m "Brief description of your changes"
   ```

3. **Push**: Uploads your labeled snapshot to GitHub.
   ```bash
   git push
   ```

## 🛠 Troubleshooting Common Issues

### 1. Permission Denied (Public Key)
If you get a permission error, ensure your GitHub CLI is authenticated:
```bash
gh auth login
```

### 2. "Updates were rejected" (Remote changes exist)
If GitHub has changes that you don't have locally, pull them first:
```bash
git pull --rebase origin main
```
Then try your `git push` again.

### 3. Check Status
If you are unsure what state your files are in:
```bash
git status
```

### 4. View History
To see your previous commits:
```bash
git log --oneline -n 10
```
