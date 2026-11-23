#!/usr/bin/env bash
# One-time setup script for an Ubuntu 22.04/24.04 EC2 instance.
# Run from the project root on the server:   bash deploy/setup-ec2.sh
# Before running, create server/.env (see README step 5).
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo ">> Project directory: $PROJECT_DIR"

echo ">> Installing Node.js 20, Nginx and PM2"
sudo apt-get update -y
sudo apt-get install -y curl nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

if [ ! -f "$PROJECT_DIR/server/.env" ]; then
  echo "!! server/.env not found. Copy server/.env.example to server/.env and set MONGO_URI first."
  exit 1
fi

echo ">> Installing dependencies and building React"
cd "$PROJECT_DIR"
npm run install-all
npm run build

echo ">> Starting the app with PM2"
pm2 delete expense-tracker 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$USER" --hp "$HOME"

echo ">> Configuring Nginx"
sudo cp deploy/nginx.conf /etc/nginx/sites-available/expense-tracker
sudo ln -sf /etc/nginx/sites-available/expense-tracker /etc/nginx/sites-enabled/expense-tracker
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo ""
echo ">> Done! Open http://<your-ec2-public-ip> in your browser."
