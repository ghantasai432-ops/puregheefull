@echo off
title Amrutha Pure Ghee Dev Server
echo Starting local HTTP server...
echo.

:: Start Node.js server in a separate background command window
start "Amrutha Ghee Server" cmd /k "node server.js"

:: Wait 1.5 seconds for the server to spin up
timeout /t 2 /nobreak > nul

:: Open both customer storefront and admin portal in default web browser
start http://localhost:3000/index.html
start http://localhost:3000/admin.html

echo Server started! You can close this window now.
echo Keep the other black cmd window open while testing.
exit
