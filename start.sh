#!/bin/bash

# Start Flask in background
echo "Starting Flask..."
python3 flask/app.py &

# Wait for Flask to initialize
sleep 5

# Start Node.js
echo "Starting Node.js..."
cd backend
npm start
