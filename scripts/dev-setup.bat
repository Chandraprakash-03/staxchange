@echo off
REM AI Tech Stack Converter - Development Setup Script (Windows)

echo 🛠️  Setting up AI Tech Stack Converter development environment...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18 or later.
    exit /b 1
)

echo [INFO] Node.js version check passed ✓

REM Setup environment file
if not exist ".env" (
    echo [INFO] Creating .env file from template...
    copy .env.example .env
    echo [WARN] Please edit .env file with your actual configuration values
) else (
    echo [INFO] .env file already exists ✓
)

REM Install dependencies
echo [INFO] Installing Node.js dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)
echo [INFO] Dependencies installed ✓

REM Create necessary directories
echo [INFO] Creating necessary directories...
if not exist "storage" mkdir storage
if not exist "storage\projects" mkdir storage\projects
if not exist "storage\temp" mkdir storage\temp
if not exist "storage\exports" mkdir storage\exports
if not exist "logs" mkdir logs
echo [INFO] Directories created ✓

REM Check Docker availability
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Docker is not installed. You'll need Docker for database services.
    echo [INFO] Install Docker Desktop from: https://docs.docker.com/desktop/windows/
    goto :show_next_steps
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Docker Compose is not available.
    goto :show_next_steps
)

REM Setup database
echo [INFO] Starting database services...
docker-compose -f docker-compose.dev.yml up -d postgres redis

echo [INFO] Waiting for database to be ready...
timeout /t 10 /nobreak >nul

echo [INFO] Running database migrations...
npx prisma migrate dev --name init

echo [INFO] Generating Prisma client...
npx prisma generate

echo [INFO] Database setup completed ✓

:show_next_steps
echo.
echo 🎉 Development environment setup completed!
echo.
echo Next steps:
echo ===========
echo 1. Edit .env file with your configuration
echo 2. Start development server: npm run dev
echo 3. Run tests: npm test
echo.
echo Available commands:
echo - npm run dev          # Start development server
echo - npm run build        # Build for production
echo - npm test             # Run tests
echo - npm run docker:up    # Start database services
echo - npm run docker:down  # Stop database services
echo.
echo Application will be available at: http://localhost:3000