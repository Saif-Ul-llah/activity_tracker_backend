FROM node

WORKDIR /app

RUN npm install -g pm2

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

RUN echo '{\
  "apps": [{\
    "name": "app",\
    "script": "npm",\
    "args": "run dev",\
    "autorestart": true,\
    "max_restarts": 10,\
    "min_uptime": "10s",\
    "restart_delay": 5000,\
    "watch": false,\
    "error_file": "/app/logs/err.log",\
    "out_file": "/app/logs/out.log",\
    "exp_backoff_restart_delay": 100\
  }]\
}' > ecosystem.config.json

RUN mkdir -p /app/logs

CMD ["sh", "-c", "pm2-runtime ecosystem.config.json"]
