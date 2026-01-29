# Microts Microservice - Podman Setup Guide

## Quick Start

### Development
```bash
# Install dependencies
bun install

# Run locally with watch mode
bun run dev

# Or run with Podman Compose (from project root)
podman-compose -f docker/compose/dev.yml up -d
```

### Production
```bash
# Run with Podman Compose (from project root)
podman-compose -f docker/compose/prod.yml up -d
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-30T...",
  "environment": "development"
}
```

### Ready Check
```bash
curl http://localhost:3000/ready
```

### API Info
```bash
curl http://localhost:3000/api
```

## Development Mode

### Build image
```bash
podman build -f docker/Dockerfile.dev -t microts:dev .
```

### Run with Podman Compose (from project root)
```bash
podman-compose -f docker/compose/dev.yml up -d
```

### View logs
```bash
podman-compose -f docker/compose/dev.yml logs -f app
```

### Stop container
```bash
podman-compose -f docker/compose/dev.yml down
```

### Restart container (after config changes)
```bash
podman-compose -f docker/compose/dev.yml restart
```

### Check health status
```bash
podman-compose -f docker/compose/dev.yml ps
# Look at the STATUS column - should show "healthy"
```

## Production Mode

### Build image
```bash
podman build -f docker/Dockerfile.prod -t microts:latest .
```

### Run with Podman Compose (from project root)
```bash
podman-compose -f docker/compose/prod.yml up -d
```

### View production logs
```bash
podman-compose -f docker/compose/prod.yml logs -f app
```

### Stop production container
```bash
podman-compose -f docker/compose/prod.yml down
```

### Restart production container (after config changes)
```bash
podman-compose -f docker/compose/prod.yml restart
```

### Check production health status
```bash
podman-compose -f docker/compose/prod.yml ps
# Look at the STATUS column - should show "healthy"
```

## Direct Container Run

### Development
```bash
podman run -p 3000:3000 -v $(pwd):/app microts:dev
```

### Production
```bash
podman run -p 3000:3000 microts:latest
```

## Verification & Testing

### Check container status
```bash
# Development
podman-compose -f docker/compose/dev.yml ps

# Production
podman-compose -f docker/compose/prod.yml ps
```

### Test API endpoints
```bash
# Health check
curl http://localhost:3000/health

# Ready check
curl http://localhost:3000/ready

# API info
curl http://localhost:3000/api
```

### View real-time logs
```bash
# Development
podman-compose -f docker/compose/dev.yml logs -f app

# Production
podman-compose -f docker/compose/prod.yml logs -f app

# View specific number of lines
podman-compose -f docker/compose/dev.yml logs --tail=50 app
```

### Access container shell (for debugging)
```bash
# Development
podman-compose -f docker/compose/dev.yml exec app sh

# Production
podman-compose -f docker/compose/prod.yml exec app sh
```

### Inspect container details
```bash
# Get container ID
podman ps | grep microts

# View full container info
podman inspect <container_id>
```

## Project Structure

```
microts/
├── src/
│   └── index.ts              # Microservice entry point with Express
├── docker/
│   ├── Dockerfile.dev        # Development image (hot reload)
│   ├── Dockerfile.prod       # Production image (optimized)
│   └── compose/
│       ├── dev.yml           # Development compose config
│       └── prod.yml          # Production compose config
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript config
├── .dockerignore              # Docker build ignore
└── Podfile                   # This file
```

## Available npm Scripts

```bash
bun run dev          # Run with watch mode
bun run build        # Build for production
bun run start        # Run built application
bun run type-check   # Check TypeScript types
bun run lint         # Run linter (if configured)
```

## Environment Variables

```env
NODE_ENV=development  # or production
PORT=3000             # Server port (default: 3000)
```

## Docker Desktop Integration

If using Docker Desktop, Podman runs inside a VM.
Ensure Docker Desktop and Podman are properly installed.

## Cleanup

```bash
# Remove unused images
podman image prune -a

# Remove unused containers
podman container prune

# Remove all (be careful!)
podman system prune -a
```

## Service Features

- ✅ Express.js microservice framework
- ✅ TypeScript support
- ✅ Health check endpoints
- ✅ Graceful shutdown handling
- ✅ JSON API responses
- ✅ Error handling middleware
- ✅ Production-ready Docker setup
- ✅ Non-root user in production
- ✅ Hot reload in development
