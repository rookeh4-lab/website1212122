@echo off
title 5.55 Client - GitHub Uploader
echo ========================================================
echo   Uploading 5.55 Client Website Source to GitHub
echo ========================================================
echo.
cd /d "%~dp0"
git init
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/rookeh4-lab/5.55-web.git
git add -A
git commit -m "Full 5.55 Client web source for Netlify"
echo.
echo Pushing to https://github.com/rookeh4-lab/5.55-web ...
git push -u origin main --force
echo.
echo ========================================================
echo   Done! Check your Netlify deploy now.
echo ========================================================
pause
