@echo off
chcp 65001 >nul
rem ติดตั้งตัวดึงคลิปอัตโนมัติ: คัดลอก sync-clips.ps1 ไปที่ %LOCALAPPDATA%\TrendClips แล้วตั้ง Task Scheduler ให้รันทุก 30 นาที
set "TARGET=%LOCALAPPDATA%\TrendClips"
if not exist "%TARGET%" mkdir "%TARGET%"
copy /Y "%~dp0sync-clips.ps1" "%TARGET%\sync-clips.ps1" >nul
schtasks /Create /F /TN "TrendClips-Sync" /SC MINUTE /MO 30 /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%TARGET%\sync-clips.ps1\"" >nul
if errorlevel 1 (
  echo ตั้งงานไม่สำเร็จ - ลองคลิกขวาไฟล์นี้ แล้วเลือก Run as administrator
  pause
  exit /b 1
)
echo ติดตั้งแล้ว: ระบบจะดึงคลิปใหม่ลงโฟลเดอร์ "คลิปพร้อมโพสต์" บน Desktop ทุก 30 นาที
echo กำลังดึงรอบแรก...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%TARGET%\sync-clips.ps1"
echo.
echo ยกเลิกภายหลัง: schtasks /Delete /TN "TrendClips-Sync" /F
pause
