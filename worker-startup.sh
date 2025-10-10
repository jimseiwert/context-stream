#!/bin/bash

# Fix ownership of the app directory (excluding git files)
sudo find /app -not -path '/app/.git*' -exec chown node:node {} \;

# Switch to node user and start worker
su node -c 'npm install && npx tsx src/lib/jobs/worker.ts'
