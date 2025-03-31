@echo off
cd property-data-tester
echo Starting the server...
start cmd /k "npm run server"
echo Starting the client...
start cmd /k "npm start"
echo Application started!