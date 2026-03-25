#!/bin/bash

echo "🚀 Pushing Google Drive Clone to GitHub..."

# Make sure we're in the right directory
cd /c/Users/asus/gdrive

# Check git status
git status

# Push to GitHub
git push -u origin main

echo "✅ Successfully pushed to GitHub!"
echo "🌐 Repository URL: https://github.com/"
