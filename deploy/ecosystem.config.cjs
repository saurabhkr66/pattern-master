// PM2 process config for BattleExam.
// Start with:   pm2 start deploy/ecosystem.config.cjs
// PM2 keeps the Next.js server running, restarts it if it crashes, and
// (after `pm2 save && pm2 startup`) brings it back after a reboot.
module.exports = {
  apps: [
    {
      name: "battleexam",
      // Run Next's own binary directly (avoids an extra npm wrapper process).
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/home/battle/pattern-master",
      // Cluster mode: fork one worker per vCPU so both cores serve requests.
      // On the 2-vCPU Hetzner CAX11 this ~doubles render throughput. Each Next
      // worker is ~300-500 MB; 2 workers + Postgres fit comfortably in 4 GB.
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      // Restart a worker if it balloons past this (sharp/mupdf can spike).
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
