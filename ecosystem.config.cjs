module.exports = {
  apps: [
    {
      name: "discord-voice-stay-bot",
      script: "index.js",
      autorestart: true,
      max_restarts: 1000,
      restart_delay: 5000,
      time: true
    }
  ]
};
