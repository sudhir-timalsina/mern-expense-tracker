// PM2 config: keeps the Node server running on EC2 and restarts it if it crashes.
// Usage (from the project root):  pm2 start deploy/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "expense-tracker",
      cwd: __dirname + "/../server",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
