#!/bin/bash

# AI Tech Stack Converter - Development Setup Script
# This script sets up the development environment

set -e

echo "🛠️  Setting up AI Tech Stack Converter development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18 or later."
        exit 1
    fi
    
    node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        log_error "Node.js version 18 or later is required. Current version: $(node -v)"
        exit 1
    fi
    
    log_info "Node.js version check passed: $(node -v) ✓"
}

# Check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_warn "Docker is not installed. You'll need Docker for database services."
        log_info "Install Docker from: https://docs.docker.com/get-docker/"
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_warn "Docker Compose is not installed."
        log_info "Install Docker Compose from: https://docs.docker.com/compose/install/"
        return 1
    fi
    
    log_info "Docker and Docker Compose are available ✓"
    return 0
}

# Setup environment file
setup_env() {
    if [ ! -f ".env" ]; then
        log_info "Creating .env file from template..."
        cp .env.example .env
        log_warn "Please edit .env file with your actual configuration values"
    else
        log_info ".env file already exists ✓"
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing Node.js dependencies..."
    npm install
    log_info "Dependencies installed ✓"
}

# Setup database
setup_database() {
    if check_docker; then
        log_info "Starting database services..."
        docker-compose -f docker-compose.dev.yml up -d postgres redis
        
        log_info "Waiting for database to be ready..."
        sleep 10
        
        log_info "Running database migrations..."
        npx prisma migrate dev --name init
        
        log_info "Generating Prisma client..."
        npx prisma generate
        
        log_info "Database setup completed ✓"
    else
        log_warn "Skipping database setup due to missing Docker"
        log_info "You'll need to set up PostgreSQL and Redis manually"
    fi
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    
    directories=(
        "storage/projects"
        "storage/temp"
        "storage/exports"
        "logs"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        log_info "Created directory: $dir"
    done
}

# Show next steps
show_next_steps() {
    echo ""
    log_info "🎉 Development environment setup completed!"
    echo ""
    echo "Next steps:"
    echo "==========="
    echo "1. Edit .env file with your configuration"
    echo "2. Start development server: npm run dev"
    echo "3. Run tests: npm test"
    echo ""
    echo "Available commands:"
    echo "- npm run dev          # Start development server"
    echo "- npm run build        # Build for production"
    echo "- npm test             # Run tests"
    echo "- npm run docker:up    # Start database services"
    echo "- npm run docker:down  # Stop database services"
    echo ""
    echo "Application will be available at: http://localhost:3000"
}

# Main setup process
main() {
    echo "AI Tech Stack Converter - Development Setup"
    echo "=========================================="
    
    check_node
    setup_env
    install_dependencies
    create_directories
    setup_database
    show_next_steps
}

# Handle script arguments
case "${1:-}" in
    "db-only")
        setup_database
        ;;
    "deps-only")
        install_dependencies
        ;;
    *)
        main
        ;;
esac