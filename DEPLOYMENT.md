# Deployment Guide

This guide covers how to deploy the AI Tech Stack Converter platform in different environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Docker Services](#docker-services)
- [Monitoring and Health Checks](#monitoring-and-health-checks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Docker** (20.10+) and **Docker Compose** (2.0+)
- **Node.js** (18+) for local development
- **Git** for version control

### System Requirements

**Minimum:**

- 2 CPU cores
- 4GB RAM
- 10GB disk space

**Recommended:**

- 4 CPU cores
- 8GB RAM
- 50GB disk space

## Environment Configuration

### 1. Create Environment File

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

### 2. Required Environment Variables

Edit `.env` with your configuration:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/ai_tech_converter"
POSTGRES_PASSWORD="your_secure_password"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# GitHub OAuth Configuration
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"

# OpenRouter API Configuration
OPENROUTER_API_KEY="your_openrouter_api_key"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Application Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="production"
```

### 3. GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App with:
   - Application name: "AI Tech Stack Converter"
   - Homepage URL: Your application URL
   - Authorization callback URL: `{YOUR_APP_URL}/api/auth/callback/github`
3. Copy the Client ID and Client Secret to your `.env` file

### 4. OpenRouter API Setup

1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Create an API key
3. Add the API key to your `.env` file

## Development Deployment

### Quick Start

**Linux/macOS:**

```bash
./scripts/dev-setup.sh
npm run dev
```

**Windows:**

```cmd
scripts\dev-setup.bat
npm run dev
```

### Manual Setup

1. **Install Dependencies:**

   ```bash
   npm install
   ```

2. **Start Database Services:**

   ```bash
   docker-compose -f docker-compose.dev.yml up -d postgres redis
   ```

3. **Run Database Migrations:**

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

## Production Deployment

### Automated Deployment

**Linux/macOS:**

```bash
./scripts/deploy.sh
```

**Windows:**

```cmd
scripts\deploy.bat
```

### Manual Deployment

1. **Build and Start Services:**

   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

2. **Verify Deployment:**
   ```bash
   docker-compose ps
   curl http://localhost:3000/api/health
   ```

### Production Environment Variables

For production, ensure these variables are properly configured:

```bash
NODE_ENV="production"
POSTGRES_PASSWORD="secure_random_password"
JWT_SECRET="long_random_string_for_jwt_signing"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

## Docker Services

The application consists of four main services:

### 1. Application Service (`app`)

- **Image:** Built from `Dockerfile`
- **Port:** 3000
- **Purpose:** Main Next.js application with API routes

### 2. Worker Service (`worker`)

- **Image:** Built from `Dockerfile.worker`
- **Purpose:** Background job processing for conversions

### 3. PostgreSQL Database (`postgres`)

- **Image:** `postgres:15-alpine`
- **Port:** 5432
- **Purpose:** Primary data storage

### 4. Redis Cache (`redis`)

- **Image:** `redis:7-alpine`
- **Port:** 6379
- **Purpose:** Caching and job queue management

### Service Management

```bash
# View service status
docker-compose ps

# View logs
docker-compose logs -f [service_name]

# Restart a service
docker-compose restart [service_name]

# Stop all services
docker-compose down

# Update and restart
docker-compose pull
docker-compose up -d --build
```

## Monitoring and Health Checks

### Health Check Endpoint

The application provides a health check endpoint at `/api/health`:

```bash
curl http://localhost:3000/api/health
```

**Response Example:**

```json
{
	"status": "healthy",
	"timestamp": "2024-01-15T10:30:00.000Z",
	"version": "1.0.0",
	"environment": "production",
	"uptime": 3600,
	"responseTime": "15ms",
	"services": {
		"database": {
			"status": "healthy",
			"message": "Database connection successful"
		},
		"redis": {
			"status": "healthy",
			"message": "Redis connection successful"
		}
	}
}
```

### Monitoring Commands

```bash
# Check service health
docker-compose exec app curl http://localhost:3000/api/health

# Monitor resource usage
docker stats

# View application logs
docker-compose logs -f app

# View worker logs
docker-compose logs -f worker

# Monitor database
docker-compose exec postgres psql -U postgres -d ai_tech_converter -c "SELECT COUNT(*) FROM projects;"
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Symptoms:**

- Health check shows database as unhealthy
- Application fails to start

**Solutions:**

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check database connectivity
docker-compose exec postgres psql -U postgres -d ai_tech_converter -c "SELECT 1;"
```

#### 2. Redis Connection Failed

**Symptoms:**

- Job queue not processing
- Cache operations failing

**Solutions:**

```bash
# Check Redis status
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping

# Restart Redis
docker-compose restart redis
```

#### 3. Application Won't Start

**Symptoms:**

- Container exits immediately
- Build failures

**Solutions:**

```bash
# Check application logs
docker-compose logs app

# Rebuild without cache
docker-compose build --no-cache app

# Check environment variables
docker-compose exec app env | grep -E "(DATABASE_URL|REDIS_URL)"
```

#### 4. Worker Service Issues

**Symptoms:**

- Jobs stuck in queue
- Conversion failures

**Solutions:**

```bash
# Check worker logs
docker-compose logs worker

# Restart worker
docker-compose restart worker

# Check job queue status
docker-compose exec redis redis-cli llen "bull:conversion:waiting"
```

### Performance Optimization

#### 1. Database Performance

```bash
# Monitor database connections
docker-compose exec postgres psql -U postgres -d ai_tech_converter -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
docker-compose exec postgres psql -U postgres -d ai_tech_converter -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

#### 2. Memory Usage

```bash
# Monitor container memory usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Adjust memory limits in docker-compose.yml if needed
```

#### 3. Disk Space

```bash
# Check disk usage
df -h

# Clean up Docker resources
docker system prune -f

# Remove old images
docker image prune -f
```

### Backup and Recovery

#### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres ai_tech_converter > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres ai_tech_converter < backup.sql
```

#### Volume Backup

```bash
# Backup PostgreSQL data
docker run --rm -v ai-tech-stack-converter_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data

# Backup Redis data
docker run --rm -v ai-tech-stack-converter_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz /data
```

### Security Considerations

1. **Change Default Passwords:** Always use strong, unique passwords for production
2. **Use HTTPS:** Configure SSL/TLS certificates for production deployments
3. **Network Security:** Use Docker networks to isolate services
4. **Regular Updates:** Keep Docker images and dependencies updated
5. **Environment Variables:** Never commit sensitive data to version control

### Scaling

For high-traffic deployments:

1. **Horizontal Scaling:** Run multiple app and worker containers
2. **Load Balancing:** Use nginx or a cloud load balancer
3. **Database Scaling:** Consider read replicas for PostgreSQL
4. **Redis Clustering:** Use Redis Cluster for high availability

Example scaling configuration:

```yaml
# In docker-compose.yml
services:
  app:
    deploy:
      replicas: 3
  worker:
    deploy:
      replicas: 2
```

## Support

For additional support:

- Check the [GitHub Issues](https://github.com/your-repo/issues)
- Review application logs for detailed error messages
- Consult the [API documentation](./docs/api.md)
