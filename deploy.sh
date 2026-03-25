#!/bin/bash
set -e

SERVER="satiyu"
BACKEND_DIR="/home/satiyu-api/htdocs/api.satiyu.com"
FRONTEND_DIR="/home/satiyu/htdocs/www.satiyu.com"
BRANCH="main"

echo "=== Deploy started at $(date) ==="

# Push latest changes to GitHub
echo ">> Pushing to GitHub..."
git push origin "$BRANCH"

# Deploy on server
ssh "$SERVER" bash -s << 'ENDSSH'
set -e

BACKEND_DIR="/home/satiyu-api/htdocs/api.satiyu.com"
FRONTEND_DIR="/home/satiyu/htdocs/www.satiyu.com"
BRANCH="main"

# Backend
echo ">> Deploying backend..."
cd "$BACKEND_DIR"
git pull origin "$BRANCH"
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart

# Frontend
echo ">> Deploying frontend..."
cd "$FRONTEND_DIR"
git pull origin "$BRANCH"
npm ci
npm run build

echo ">> Restarting PM2..."
pm2 restart satiyu-frontend || pm2 start npm --name "satiyu-frontend" -- start

echo "=== Deploy completed at $(date) ==="
ENDSSH
