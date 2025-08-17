@echo off
REM AI Tech Stack Converter - Production Deployment Script (Windows)

echo 🚀 Starting AI Tech Stack Converter deployment...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not available. Please install Docker Desktop with Compose.
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found. Please copy .env.example to .env and configure it.
    exit /b 1
)

echo [INFO] Prerequisites check passed ✓

REM Build and deploy
echo [INFO] Building and deploying services...

REM Pull latest images
echo [INFO] Pulling latest base images...
docker-compose pull postgres redis

REM Build application images
echo [INFO] Building application images...
docker-compose build --no-cache

REM Stop existing services
echo [INFO] Stopping existing services...
docker-compose down

REM Start services
echo [INFO] Starting services...
docker-compose up -d

REM Wait for services
echo [INFO] Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Show status
echo [INFO] Deployment Status:
echo ====================
docker-compose ps

echo.
echo [INFO] Application URL: http://localhost:3000
echo [INFO] To view logs: docker-compose logs -f
echo [INFO] To stop services: docker-compose down
echo.
echo 🎉 Deployment completed successfully!