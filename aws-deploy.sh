#!/usr/bin/env bash
# =====================================================================
# Deploy the MERN Expense Tracker on Amazon Linux 2023 (EC2).
# Repo: https://github.com/sudhir-timalsina/mern-expense-tracker
#
#   Run:            sudo bash aws-deploy.sh
#   Change DB URL:  sudo bash aws-deploy.sh --new-url
#   Safe to run again: it pulls the latest code, rebuilds and restarts.
#
# Layout on the server:
#   /opt/expense-tracker        code from GitHub
#   /etc/expense-tracker.env    MongoDB URL (root-only, never on GitHub)
#   Browser -> Nginx :80 -> Express :5000 (serves React build + /api)
# =====================================================================
set -euo pipefail

REPO_URL="https://github.com/sudhir-timalsina/mern-expense-tracker.git"
APP_DIR="/opt/expense-tracker"
ENV_FILE="/etc/expense-tracker.env"
SERVICE="expense-tracker"
API_PORT=5000
DB_NAME="mernapp"

say() { echo -e "\n\033[1;34m>> $*\033[0m"; }
die() { echo -e "\n\033[1;31m!! $*\033[0m"; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Please run with sudo:  sudo bash aws-deploy.sh"

# Clean a pasted MongoDB URL: keep one copy if pasted twice, encode "#"
# in the password as %23, and add the database name if it's missing.
clean_url() {
  local u="$1" rest
  u="$(echo "$u" | tr -d '\r' | xargs)"
  u="${u%% *}"
  rest="${u#mongodb}"
  if [[ "$rest" == *"mongodb+srv://"* ]]; then
    u="mongodb${rest%%mongodb+srv://*}"
  elif [[ "$rest" == *"mongodb://"* ]]; then
    u="mongodb${rest%%mongodb://*}"
  fi
  u="${u//\#/%23}"
  u="$(echo "$u" | sed -E "s|(\.mongodb\.net)/?(\?.*)?$|\1/${DB_NAME}\2|")"
  echo "$u"
}

# ---------------------------------------------------------------------
say "1/6  MongoDB connection"
if [ ! -s "$ENV_FILE" ] || [ "${1:-}" = "--new-url" ]; then
  echo "Paste your MongoDB Atlas URL (right-click -> Paste ONCE), then press Enter:"
  read -r RAW_URL
  MONGO_URI="$(clean_url "$RAW_URL")"
  [[ "$MONGO_URI" == mongodb* ]] || die "That doesn't look like a MongoDB URL. Run the script again."
  umask 077
  printf 'MONGO_URI=%s\n' "$MONGO_URI" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Saved (password hidden): $(echo "$MONGO_URI" | sed -E 's|://([^:]+):[^@]+@|://\1:****@|')"
else
  echo "Using the saved URL in $ENV_FILE  (run with --new-url to change it)"
fi

# ---------------------------------------------------------------------
say "2/6  Installing Git, Nginx and Node.js 22"
dnf install -y git nginx
if ! node -v 2>/dev/null | grep -qE '^v(2[0-9]|[3-9][0-9])\.'; then
  curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
  dnf install -y nodejs
fi
echo "Node $(node -v), npm $(npm -v)"

if [ -z "$(swapon --show)" ]; then
  echo "Adding 1 GB swap so the React build doesn't run out of memory"
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
fi

# ---------------------------------------------------------------------
say "3/6  Removing leftovers from earlier attempts"
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete all >/dev/null 2>&1 || true; pm2 kill >/dev/null 2>&1 || true
  sudo -u ec2-user pm2 delete all >/dev/null 2>&1 || true; sudo -u ec2-user pm2 kill >/dev/null 2>&1 || true
fi
systemctl disable --now pm2-root pm2-ec2-user movie-reviews >/dev/null 2>&1 || true
rm -f /etc/systemd/system/movie-reviews.service
rm -f /etc/nginx/conf.d/react-app.conf /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/movie-reviews.conf

# ---------------------------------------------------------------------
say "4/6  Getting your code from GitHub"
if [ -d "$APP_DIR/.git" ]; then
  git config --global --add safe.directory "$APP_DIR"
  git -C "$APP_DIR" fetch --quiet origin
  git -C "$APP_DIR" reset --hard "origin/$(git -C "$APP_DIR" rev-parse --abbrev-ref HEAD)" --quiet
else
  rm -rf "$APP_DIR"
  git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi
[ -f "$APP_DIR/server/server.js" ]    || die "server/server.js not found. Are server/ and client/ at the top level of your repo?"
[ -f "$APP_DIR/client/package.json" ] || die "client/package.json not found. Are server/ and client/ at the top level of your repo?"
chown -R ec2-user:ec2-user "$APP_DIR"

# ---------------------------------------------------------------------
say "5/6  Installing packages, building React, starting the server"
sudo -u ec2-user bash -c "cd '$APP_DIR/server' && npm install --omit=dev --no-audit --no-fund"
sudo -u ec2-user bash -c "cd '$APP_DIR/client' && npm install --no-audit --no-fund && npm run build"
[ -f "$APP_DIR/client/dist/index.html" ] || die "React build failed (client/dist/index.html missing)."

cat > "/etc/systemd/system/$SERVICE.service" <<EOF
[Unit]
Description=MERN Expense Tracker (Express + React build)
After=network-online.target
Wants=network-online.target

[Service]
User=ec2-user
WorkingDirectory=$APP_DIR/server
EnvironmentFile=$ENV_FILE
Environment=PORT=$API_PORT
Environment=NODE_ENV=production
ExecStart=$(command -v node) server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null 2>&1
systemctl restart "$SERVICE"

# ---------------------------------------------------------------------
say "6/6  Nginx: forward port 80 to the app on port $API_PORT"
sed -i 's/ default_server//' /etc/nginx/nginx.conf
cat > "/etc/nginx/conf.d/$SERVICE.conf" <<EOF
server {
    listen 80 default_server;
    server_name $SERVICE;

    location / {
        proxy_pass http://127.0.0.1:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF
if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" = "Enforcing" ]; then
  setsebool -P httpd_can_network_connect 1
fi
nginx -t
systemctl enable nginx >/dev/null 2>&1
systemctl restart nginx

# ---------------------------------------------------------------------
say "Checking everything (waiting for the database connection)"
API_CODE="000"
for i in $(seq 1 15); do
  API_CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$API_PORT/api/health" || true)"
  [ "$API_CODE" = "200" ] && break
  sleep 2
done
WEB_CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1/" || true)"
echo "API   /api/health -> HTTP $API_CODE"
echo "Site  /           -> HTTP $WEB_CODE"

if [ "$API_CODE" != "200" ]; then
  echo -e "\n\033[1;33mThe app is not running yet. Last log lines:\033[0m"
  journalctl -u "$SERVICE" -n 20 --no-pager || true
  echo -e "\nIf you see 'MongoDB connection failed': the password is wrong"
  echo "(fix: sudo bash aws-deploy.sh --new-url) or Atlas IP Access List lacks 0.0.0.0/0."
  exit 1
fi

IP="$(curl -s --max-time 5 https://checkip.amazonaws.com || echo '<your-EC2-public-IP>')"
echo -e "\n\033[1;32m======================================================"
echo "DEPLOYMENT COMPLETE!  Open:  http://$IP"
echo -e "======================================================\033[0m"
echo "Logs:     sudo journalctl -u $SERVICE -f"
echo "Restart:  sudo systemctl restart $SERVICE"
