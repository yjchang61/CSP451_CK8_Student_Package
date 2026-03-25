# UrbanEats — Docker Multi-Container Application

CSP451 Checkpoint 8 — Docker Fundamentals and Containerisation

## Overview

UrbanEats is a multi-container food delivery platform deployed on an Azure VM using Docker Compose.  
It consists of **7 containers** running on a custom bridge network (`urbaneats-net`).

## Architecture

```
Browser → :80 → Nginx Proxy
                    ├── /     → Web :3000  (Node.js + Express)
                    └── /api/ → API :4000  (Node.js + Express)
                                   ├── PostgreSQL :5432
                                   ├── Redis :6379
                                   └── RabbitMQ :5672 → Worker (consumer)
```

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> \&\& cd CSP451-CK8

# 2. Create your .env file from the template
cp .env.example .env
# Edit .env with your own passwords

# 3. Build and start all services
docker compose up -d --build

# 4. Verify all containers are running
docker compose ps

# 5. Access the application
# Web App:       http://localhost
# RabbitMQ UI:   http://localhost:15672
```

## Project Structure

```
CSP451-CK8/
├── web/                  # Customer-facing web application
│   ├── Dockerfile        # Multi-stage, non-root, healthcheck
│   ├── server.js         # Express server
│   ├── public/           # Static HTML
│   ├── package.json
│   └── .dockerignore
├── api/                  # Orders REST API
│   ├── Dockerfile        # Multi-stage, non-root, healthcheck
│   ├── server.js         # Express + PostgreSQL/Redis/RabbitMQ
│   ├── package.json
│   └── .dockerignore
├── worker/               # Notification worker
│   ├── Dockerfile        # Multi-stage, non-root, healthcheck
│   ├── worker.js         # RabbitMQ consumer
│   ├── package.json
│   └── .dockerignore
├── docker-compose.yml    # 7 services, custom network
├── nginx.conf            # Reverse proxy configuration
├── .env.example          # Template environment variables
└── README.md             # This file
```

## Services

|Service|Image|Port|Description|
|-|-|-|-|
|web|Custom (Node.js)|3000 (internal)|Frontend serving HTML|
|api|Custom (Node.js)|4000 (internal)|REST API with PostgreSQL, Redis, RabbitMQ|
|db|postgres:15-alpine|5432 (internal)|Persistent data store|
|cache|redis:7-alpine|6379 (internal)|In-memory caching|
|queue|rabbitmq:3-management-alpine|5672/15672|Message queue|
|worker|Custom (Node.js)|None|Background notification consumer|
|proxy|nginx:alpine|**80 (exposed)**|Reverse proxy entry point|

## Security

* All application containers run as non-root user `app`
* Secrets managed via `.env` file (not hardcoded)
* `.dockerignore` excludes `.git`, `node\_modules`, `.env` from build context
* Multi-stage builds minimize attack surface

## Environment Variables

Copy `.env.example` to `.env` and set your own values:

```bash
DB\_PASSWORD=<your\_password>
DB\_USER=postgres
DB\_NAME=urbaneats
RABBITMQ\_DEFAULT\_USER=<your\_user>
RABBITMQ\_DEFAULT\_PASS=<your\_password>
```

## Useful Commands

```bash
# View container status
docker compose ps

# View logs
docker compose logs -f api

# Stop all services
docker compose down

# Rebuild and restart
docker compose up -d --build

# Test API
curl -X POST http://localhost/api/orders \\
  -H "Content-Type: application/json" \\
  -d '{"item":"Pizza Margherita"}'
```

