# MindMapper Family Tree Edition - Deployment Guide

A comprehensive guide for deploying the MindMapper Family Tree application on a remote server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Clone and Install](#clone-and-install)
4. [Database Setup](#database-setup)
5. [Environment Configuration](#environment-configuration)
6. [Build and Deploy](#build-and-deploy)
7. [Process Management](#process-management)
8. [Nginx Reverse Proxy](#nginx-reverse-proxy)
9. [SSL/HTTPS Setup](#sslhttps-setup)
10. [Optional: S3 Storage](#optional-s3-storage)
11. [Optional: Email Notifications](#optional-email-notifications)
12. [Monitoring and Maintenance](#monitoring-and-maintenance)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 vCPU | 2+ vCPU |
| RAM | 2 GB | 4+ GB |
| Storage | 20 GB | 50+ GB (depends on photo storage) |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04/24.04 LTS |

### Required Software

- Node.js 18+ (20 LTS recommended)
- pnpm 8+
- Docker & Docker Compose
- Git
- Nginx (for reverse proxy)
- Certbot (for SSL)

---

## Server Setup

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js 20 LTS

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 3. Install pnpm

```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version  # Should show 8.x.x or 9.x.x
```

### 4. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add your user to docker group (avoid sudo for docker commands)
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin

# Log out and back in for group changes to take effect
exit
# SSH back in

# Verify installation
docker --version
docker compose version
```

### 5. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 6. Install Certbot (for SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## Clone and Install

### 1. Create Application Directory

```bash
sudo mkdir -p /var/www/mindmapper
sudo chown $USER:$USER /var/www/mindmapper
cd /var/www/mindmapper
```

### 2. Clone Repository

```bash
# Clone the family-tree branch
git clone -b feature/family-tree https://github.com/aizukanne/mindmapper.git .

# Or if cloning main and switching:
git clone https://github.com/aizukanne/mindmapper.git .
git checkout feature/family-tree
```

### 3. Install Dependencies

```bash
pnpm install
```

---

## Database Setup

### 1. Start Docker Services

```bash
cd docker
docker compose up -d
cd ..

# Verify containers are running
docker ps
# Should show mindmapper-postgres and mindmapper-redis
```

### 2. Wait for Database Ready

```bash
# Wait for PostgreSQL to be ready
docker compose -f docker/docker-compose.yml exec postgres pg_isready -U mindmapper
```

### 3. Generate Prisma Client

```bash
pnpm --filter @mindmapper/db db:generate
```

### 4. Push Database Schema

```bash
pnpm --filter @mindmapper/db db:push
```

### 5. (Optional) Seed Templates

```bash
pnpm --filter @mindmapper/db db:seed
```

---

## Environment Configuration

### 1. Create Environment File

```bash
cp .env.example .env
nano .env
```

### 2. Configure Environment Variables

```bash
# ===========================================
# DATABASE
# ===========================================
DATABASE_URL="postgresql://mindmapper:mindmapper_dev@localhost:5432/mindmapper"

# ===========================================
# REDIS
# ===========================================
REDIS_URL="redis://localhost:6379"

# ===========================================
# API SERVER
# ===========================================
NODE_ENV=production
API_PORT=3001
API_URL="https://your-domain.com"

# ===========================================
# FRONTEND (Vite build-time variables)
# ===========================================
VITE_API_URL="https://your-domain.com/api"
VITE_YJS_WEBSOCKET_URL="wss://your-domain.com/yjs"

# ===========================================
# CORS (your frontend domain)
# ===========================================
CORS_ORIGIN="https://your-domain.com"

# ===========================================
# CLERK AUTHENTICATION (Optional)
# Get keys from https://dashboard.clerk.com
# ===========================================
CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
VITE_CLERK_PUBLISHABLE_KEY="pk_live_..."

# ===========================================
# AWS S3 STORAGE (Optional - for photos/documents)
# ===========================================
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
S3_BUCKET_NAME="mindmapper-uploads"
S3_UPLOAD_MAX_SIZE_MB=10
S3_PHOTO_LIMIT_PER_MEMBER=100
S3_PHOTO_LIMIT_PER_TREE=1000

# ===========================================
# EMAIL NOTIFICATIONS (Optional - for invitations)
# Get API key from https://resend.com
# ===========================================
RESEND_API_KEY="re_..."
EMAIL_FROM="Family Tree <noreply@your-domain.com>"

# ===========================================
# YJS WEBSOCKET SERVER
# ===========================================
YJS_WEBSOCKET_PORT=1234
```

### 3. Secure the Environment File

```bash
chmod 600 .env
```

---

## Build and Deploy

### 1. Build All Packages

```bash
# Build shared types first
pnpm --filter @mindmapper/types build

# Build database package
pnpm --filter @mindmapper/db build

# Build API
pnpm --filter @mindmapper/api build

# Build Web frontend
pnpm --filter @mindmapper/web build
```

Or build everything at once:

```bash
pnpm build
```

### 2. Verify Build Output

```bash
# Check API build
ls -la apps/api/dist/

# Check Web build
ls -la apps/web/dist/
```

---

## Process Management

### Option A: Using PM2 (Recommended)

#### 1. Install PM2

```bash
sudo npm install -g pm2
```

#### 2. Create PM2 Ecosystem File

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'mindmapper-api',
      cwd: '/var/www/mindmapper/apps/api',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/mindmapper/api-error.log',
      out_file: '/var/log/mindmapper/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF
```

#### 3. Create Log Directory

```bash
sudo mkdir -p /var/log/mindmapper
sudo chown $USER:$USER /var/log/mindmapper
```

#### 4. Start Application

```bash
pm2 start ecosystem.config.js
```

#### 5. Setup PM2 Startup Script

```bash
pm2 startup
# Follow the instructions printed (copy and run the sudo command)

pm2 save
```

#### 6. Useful PM2 Commands

```bash
pm2 status                    # Check status
pm2 logs mindmapper-api       # View logs
pm2 restart mindmapper-api    # Restart
pm2 stop mindmapper-api       # Stop
pm2 delete mindmapper-api     # Remove from PM2
```

### Option B: Using Systemd

#### 1. Create Systemd Service

```bash
sudo cat > /etc/systemd/system/mindmapper-api.service << 'EOF'
[Unit]
Description=MindMapper API Server
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/mindmapper/apps/api
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production
Environment=PORT=3001
EnvironmentFile=/var/www/mindmapper/.env

[Install]
WantedBy=multi-user.target
EOF
```

#### 2. Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable mindmapper-api
sudo systemctl start mindmapper-api
```

#### 3. Check Status

```bash
sudo systemctl status mindmapper-api
sudo journalctl -u mindmapper-api -f
```

---

## Nginx Reverse Proxy

### 1. Create Nginx Configuration

```bash
sudo cat > /etc/nginx/sites-available/mindmapper << 'EOF'
upstream mindmapper_api {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS (uncomment after SSL setup)
    # return 301 https://$server_name$request_uri;

    # Root for static files
    root /var/www/mindmapper/apps/web/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    # API proxy
    location /api/ {
        proxy_pass http://mindmapper_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;

        # Increase body size for file uploads
        client_max_body_size 50M;
    }

    # Yjs WebSocket proxy
    location /yjs/ {
        proxy_pass http://mindmapper_api/yjs/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # Health check
    location /health {
        proxy_pass http://mindmapper_api/health;
    }

    # Static assets with caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF
```

### 2. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/mindmapper /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
```

### 3. Test and Reload

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL/HTTPS Setup

### 1. Obtain SSL Certificate

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 2. Auto-Renewal

Certbot automatically sets up a cron job. Verify:

```bash
sudo certbot renew --dry-run
```

### 3. Update Nginx for HTTPS

Certbot modifies the config automatically. Verify the SSL configuration:

```bash
sudo cat /etc/nginx/sites-available/mindmapper
```

---

## Optional: S3 Storage

For storing photos and documents in AWS S3:

### 1. Create S3 Bucket

```bash
aws s3 mb s3://mindmapper-uploads --region us-east-1
```

### 2. Configure Bucket Policy

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowAppAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/mindmapper-app"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::mindmapper-uploads/*"
        }
    ]
}
```

### 3. Configure CORS

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["https://your-domain.com"],
        "ExposeHeaders": ["ETag"]
    }
]
```

### 4. Set Environment Variables

Add to `.env`:

```bash
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
S3_BUCKET_NAME="mindmapper-uploads"
```

---

## Optional: Email Notifications

For sending invitation emails and notifications:

### 1. Get Resend API Key

1. Sign up at [https://resend.com](https://resend.com)
2. Verify your domain
3. Create an API key

### 2. Configure Environment

```bash
RESEND_API_KEY="re_..."
EMAIL_FROM="Family Tree <noreply@your-domain.com>"
```

---

## Monitoring and Maintenance

### Log Locations

```bash
# Application logs (PM2)
/var/log/mindmapper/api-out.log
/var/log/mindmapper/api-error.log

# Nginx logs
/var/log/nginx/access.log
/var/log/nginx/error.log

# Docker logs
docker logs mindmapper-postgres
docker logs mindmapper-redis
```

### Health Checks

```bash
# API health
curl http://localhost:3001/health

# Database connection
docker exec mindmapper-postgres pg_isready -U mindmapper

# Redis connection
docker exec mindmapper-redis redis-cli ping
```

### Database Backup

```bash
# Create backup
docker exec mindmapper-postgres pg_dump -U mindmapper mindmapper > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
cat backup.sql | docker exec -i mindmapper-postgres psql -U mindmapper mindmapper
```

### Update Deployment

```bash
cd /var/www/mindmapper

# Pull latest changes
git pull origin feature/family-tree

# Install any new dependencies
pnpm install

# Rebuild
pnpm build

# Run database migrations if needed
pnpm --filter @mindmapper/db db:push

# Restart API
pm2 restart mindmapper-api

# Clear Nginx cache if any
sudo systemctl reload nginx
```

---

## Troubleshooting

### Common Issues

#### 1. API Not Starting

```bash
# Check PM2 logs
pm2 logs mindmapper-api --lines 100

# Check if port is in use
sudo lsof -i :3001

# Check environment variables
cat /var/www/mindmapper/.env
```

#### 2. Database Connection Failed

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check database logs
docker logs mindmapper-postgres

# Test connection manually
docker exec -it mindmapper-postgres psql -U mindmapper -d mindmapper
```

#### 3. WebSocket Connection Issues

```bash
# Check Nginx WebSocket configuration
# Ensure these headers are present:
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection "upgrade";

# Test WebSocket endpoint
curl -I http://localhost:3001/yjs/
```

#### 4. CORS Errors

Check that `CORS_ORIGIN` in `.env` matches your frontend domain exactly (including https://).

#### 5. File Upload Failures

```bash
# Check Nginx body size limit
grep client_max_body_size /etc/nginx/sites-available/mindmapper

# Check S3 credentials if using S3
aws s3 ls s3://your-bucket-name/
```

#### 6. SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

---

## Quick Reference

### Start All Services

```bash
# Docker services
cd /var/www/mindmapper/docker && docker compose up -d && cd ..

# API server
pm2 start ecosystem.config.js

# Check status
pm2 status
docker ps
```

### Stop All Services

```bash
pm2 stop all
cd /var/www/mindmapper/docker && docker compose down
```

### Restart Everything

```bash
pm2 restart all
sudo systemctl reload nginx
cd /var/www/mindmapper/docker && docker compose restart
```

### View All Logs

```bash
pm2 logs
docker compose -f docker/docker-compose.yml logs -f
tail -f /var/log/nginx/error.log
```

---

## Support

For issues and questions:
- GitHub Issues: [https://github.com/aizukanne/mindmapper/issues](https://github.com/aizukanne/mindmapper/issues)
- Documentation: See `FAMILY_TREE_STATUS.md` for feature status

---

**Last Updated**: January 2026
**Version**: Family Tree Edition 1.0
