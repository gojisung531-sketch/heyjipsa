@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo    HEYJIPSA - 헤이집사 실행
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js 가 설치되어 있지 않아요.
  echo     https://nodejs.org 에서 LTS 버전을 설치한 뒤
  echo     이 파일을 다시 더블클릭해 주세요.
  echo.
  pause
  exit /b
)

echo [1/2] 필요한 파일 설치 중... 처음 한 번만, 몇 분 걸려요.
echo.
call npm install
if errorlevel 1 (
  echo.
  echo [!] 설치 중 문제가 생겼어요. 위 빨간 글씨를 캡처해서 보내주세요.
  pause
  exit /b
)

echo.
echo [2/2] 앱을 시작합니다. 잠시 후 브라우저가 자동으로 열려요.
echo     안 열리면 크롬 주소창에 http://localhost:5173 직접 입력하세요.
echo     끄려면 이 검은 창에서 Ctrl + C 를 누르세요.
echo.
call npm run dev -- --open
pause
