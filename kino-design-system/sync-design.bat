@echo off
cd /d "C:\DATA\AI_OS\projects\Kino"
echo Syncing design system...
git add kino-design-system/
git commit -m "Update design system"
git push
echo.
echo Done! Design system updated in repo.
pause
