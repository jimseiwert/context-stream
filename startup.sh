#!/bin/bash

# Fix ownership of the app directory (excluding git files)
sudo find /app -not -path '/app/.git*' -exec chown node:node {} \;

# Switch to node user and install dependencies
su node -c 'npm install'

# Keep container running
sleep infinity
