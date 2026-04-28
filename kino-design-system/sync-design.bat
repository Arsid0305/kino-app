@echo off
cd /d "C:\DATA\AI_OS\projects\Kino"
echo Синхронизируем дизайн-систему...
git add kino-design-system/
git commit -m "Update design system"
git push
echo.
echo Готово! Дизайн-система обновлена в репо.
pause
