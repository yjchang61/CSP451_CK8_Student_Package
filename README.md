# UrbanEats Docker Application

## Overview
UrbanEats is a multi-container food delivery platform built using Docker Compose.

## Services
- Web (Frontend)
- API (Backend)
- PostgreSQL (Database)
- Redis (Cache)
- RabbitMQ (Queue)
- Worker
- Nginx (Reverse Proxy)

## How to Run

1. Create .env file from .env.example  
2. Run:
   docker compose up -d --build  
3. Open:
   http://localhost  
   http://localhost:15672  

## Architecture
The system uses Nginx as a reverse proxy to route traffic to web and API services. Backend services communicate over a custom Docker bridge network (urbaneats-net).

