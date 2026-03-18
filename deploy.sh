#!/bin/bash
set -e

PROJECT_DIR="/var/www/keskinkamp"
BRANCH="main"

echo "=== Deploy started at $(date) ==="

cd "$PROJECT_DIR"

# Pull latest changes
echo ">> Pulling latest changes..."
git pull origin "$BRANCH"

# Backend
echo ">> Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
composer install --no-dev --optimize-autoloader --no-interaction

echo ">> Running migrations..."
php artisan migrate --force

echo ">> Caching config, routes, views..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo ">> Restarting queue workers..."
php artisan queue:restart

# Frontend
echo ">> Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend"
npm ci

echo ">> Building frontend..."
npm run build

echo ">> Restarting PM2 process..."
pm2 restart keskinkamp-frontend || pm2 start npm --name "keskinkamp-frontend" -- start

echo "=== Deploy completed at $(date) ==="
