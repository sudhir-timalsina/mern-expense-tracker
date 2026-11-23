# 💰 MERN Expense Tracker

A simple, useful full‑stack web app for tracking daily expenses, built with the **MERN** stack and ready to deploy on **AWS EC2**.

**Features**
- Add, edit and delete expenses (full **CRUD**)
- Categories (Food, Transport, Rent, Education…), date and optional note
- Filter by category and month
- Live summary: total spent and a spending bar for each category (computed with a **MongoDB aggregation**)

---

## 1. How the MERN stack fits together

| Letter | Technology | What it does in this project | Where |
|---|---|---|---|
| **M** | MongoDB | Stores every expense as a document in the `expenses` collection | `server/models/Expense.js`, `server/config/db.js` |
| **E** | Express.js | REST API: receives HTTP requests and talks to MongoDB | `server/server.js`, `server/routes/`, `server/controllers/` |
| **R** | React | The user interface in the browser (form, list, summary, filters) | `client/src/` |
| **N** | Node.js | The JavaScript runtime that runs the Express server | everything in `server/` |

**Request flow (example: adding an expense)**

```
React form  ──POST /api/expenses (JSON)──▶  Express route  ──▶  Controller
                                                                     │
React list  ◀──────── JSON response ◀──── Mongoose  ◀──── MongoDB ◀──┘
```

---

## 2. Project structure

```
mern-expense-tracker/
├── package.json              # helper scripts for the whole project
├── server/                   # BACKEND (Node + Express + MongoDB)
│   ├── server.js             # entry point; also serves the React build in production
│   ├── .env.example          # copy to .env and set MONGO_URI
│   ├── config/db.js          # MongoDB connection
│   ├── models/Expense.js     # Mongoose schema
│   ├── controllers/expenseController.js   # CRUD + summary logic
│   └── routes/expenseRoutes.js            # URL → controller mapping
├── client/                   # FRONTEND (React + Vite)
│   ├── index.html
│   ├── vite.config.js        # proxies /api to Express during development
│   └── src/
│       ├── App.jsx           # main component, holds state
│       ├── api.js            # all fetch() calls to the backend
│       ├── format.js         # money/date helpers (currency set to NPR)
│       └── components/       # ExpenseForm, ExpenseList, Summary, Filters
└── deploy/                   # AWS deployment files
    ├── setup-ec2.sh          # one-command server setup
    ├── ecosystem.config.cjs  # PM2 process config
    └── nginx.conf            # Nginx reverse proxy (port 80 → 5000)
```

---

## 3. REST API

Base URL: `/api/expenses`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/expenses?category=Food&month=2026-11` | List expenses (filters optional) |
| GET | `/api/expenses/summary?month=2026-11` | Total + per-category totals (aggregation) |
| GET | `/api/expenses/categories` | List of allowed categories |
| POST | `/api/expenses` | Create an expense |
| PUT | `/api/expenses/:id` | Update an expense |
| DELETE | `/api/expenses/:id` | Delete an expense |
| GET | `/api/health` | Health check (useful on AWS) |

Example body for POST / PUT:

```json
{ "title": "Bus fare", "amount": 50, "category": "Transport", "date": "2026-11-23", "note": "to college" }
```

---

## 4. Run it on your own computer

**You need:** Node.js 18+ and either MongoDB installed locally or a free MongoDB Atlas cluster (see 5.1).

```bash
# 1. Install dependencies for server and client
npm run install-all

# 2. Create the environment file
cp server/.env.example server/.env      # Windows: copy server\.env.example server\.env
#    then edit server/.env and set MONGO_URI

# 3. Start the backend (terminal 1)
npm run dev:server        # → http://localhost:5000

# 4. Start the frontend (terminal 2)
npm run dev:client        # → http://localhost:5173  (open this one)
```

Quick API test: open http://localhost:5000/api/health. It should return `{"status":"ok",...}`.

---

## 5. Deploy to AWS (EC2 + MongoDB Atlas)

**Architecture on AWS**

```
Browser ──HTTP:80──▶ EC2 (Ubuntu)
                      ├── Nginx (port 80, reverse proxy)
                      └── PM2 → Node/Express (port 5000)
                              ├── serves React build (client/dist)
                              └── /api ──▶ MongoDB Atlas (cloud database)
```

In production, Express serves the built React files itself, so you only run **one** Node process.

### 5.1 Create the database (MongoDB Atlas, free tier)
1. Sign up at https://www.mongodb.com/atlas and create a **free (M0) cluster**. Choosing an AWS region near you (e.g. Mumbai `ap-south-1`) keeps it fast.
2. **Database Access** → add a database user with a username and password.
3. **Network Access** → add your EC2 instance's public IP. For a quick class demo you can use `0.0.0.0/0` (allow from anywhere), but that is less secure.
4. **Connect → Drivers** → copy the connection string. It looks like:
   `mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/expense_tracker`
   (add `expense_tracker` after the `/` as the database name).

> Alternative: install MongoDB directly on the EC2 instance and use `mongodb://127.0.0.1:27017/expense_tracker`. Atlas is easier and free.

### 5.2 Launch the EC2 instance
1. AWS Console → **EC2** → **Launch instance**.
2. Name: `mern-expense-tracker`. AMI: **Ubuntu Server 24.04 LTS**. Type: **t2.micro** or **t3.micro** (free-tier eligible).
3. **Key pair**: create one (e.g. `mern-key.pem`) and download it.
4. **Network settings → Security group**, allow:
   - SSH (22) from **My IP**
   - HTTP (80) from **Anywhere**
5. Launch, then copy the instance's **Public IPv4 address**.

### 5.3 Connect to the server
```bash
chmod 400 mern-key.pem
ssh -i mern-key.pem ubuntu@<EC2_PUBLIC_IP>
```
(On Windows you can use PowerShell with the same command, or **EC2 Instance Connect** in the browser.)

### 5.4 Upload the project
**Option A: GitHub (recommended)**. Push this folder to a GitHub repo (the `.gitignore` already keeps `.env` and `node_modules` out), then on the server:
```bash
git clone https://github.com/<you>/mern-expense-tracker.git
cd mern-expense-tracker
```
**Option B: copy the zip** from your computer:
```bash
scp -i mern-key.pem mern-expense-tracker.zip ubuntu@<EC2_PUBLIC_IP>:~
# then on the server:
sudo apt-get install -y unzip && unzip mern-expense-tracker.zip && cd mern-expense-tracker
```

### 5.5 Create the production `.env`
```bash
cp server/.env.example server/.env
nano server/.env
```
Set:
```
PORT=5000
MONGO_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/expense_tracker
NODE_ENV=production
```
Save with `Ctrl+O`, `Enter`, `Ctrl+X`.

### 5.6 Run the setup script
```bash
bash deploy/setup-ec2.sh
```
It installs Node.js 20, Nginx and PM2, builds React, starts the app with PM2 (which also restarts it after a reboot) and configures Nginx.

### 5.7 Open your site 🎉
Go to `http://<EC2_PUBLIC_IP>` in your browser. Health check: `http://<EC2_PUBLIC_IP>/api/health`.

<details>
<summary>Prefer doing it by hand? (same steps as the script)</summary>

```bash
sudo apt-get update -y && sudo apt-get install -y curl nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

npm run install-all
npm run build
pm2 start deploy/ecosystem.config.cjs
pm2 save && pm2 startup     # run the command it prints

sudo cp deploy/nginx.conf /etc/nginx/sites-available/expense-tracker
sudo ln -s /etc/nginx/sites-available/expense-tracker /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```
</details>

### 5.8 Updating after code changes
```bash
cd ~/mern-expense-tracker
git pull                    # or upload the new files
npm run install-all
npm run build
pm2 restart expense-tracker
```

### 5.9 Useful commands and troubleshooting
| Problem | Check |
|---|---|
| Site doesn't load | Is port 80 open in the security group? `sudo systemctl status nginx` |
| 502 Bad Gateway | Node isn't running: `pm2 status`, `pm2 logs expense-tracker` |
| "MongoDB connection failed" in logs | Wrong `MONGO_URI`/password, or EC2 IP not allowed in Atlas Network Access |
| Changes not showing | Did you run `npm run build` and `pm2 restart expense-tracker`? |

**Save money:** stop or terminate the EC2 instance after your project is graded.

---

## 6. Ideas to extend (for extra marks)
- User login with JWT so each user sees only their own expenses
- A monthly budget with a warning when it's exceeded
- Charts with a library such as Recharts
- HTTPS with a free certificate: `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx` (needs a domain name)
