#!/bin/bash

# AI Tech Stack Converter - Production Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting AI Tech Stack Converter deployment..."

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env file not found. Please copy .env.example to .env and configure it."
        exit 1
    fi
    
    log_info "Prerequisites check passed ✓"
}

# Validate environment variables
validate_environment() {
    log_info "Validating environment configuration..."
    
    required_vars=(
        "GITHUB_CLIENT_ID"
        "GITHUB_CLIENT_SECRET"
        "OPENROUTER_API_KEY"
        "JWT_SECRET"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables:"
        printf '%s\n' "${missing_vars[@]}"
        log_error "Please configure these variables in your .env file."
        exit 1
    fi
    
    log_info "Environment validation passed ✓"
}

# Build and deploy
deploy() {
    log_info "Building and deploying services..."
    
    # Pull latest images
    log_info "Pulling latest base images..."
    docker-compose -f "$COMPOSE_FILE" pull postgres redis
    
    # Build application images
    log_info "Building application images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Stop existing services
    log_info "Stopping existing services..."
    docker-compose -f "$COMPOSE_FILE" down
    
    # Start services
    log_info "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    check_health
}

# Check service health
check_health() {
    log_info "Checking service health..."
    
    services=("postgres" "redis" "app" "worker")
    
    for service in "${services[@]}"; do
        if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
            log_info "$service is running ✓"
        else
            log_error "$service is not running properly"
            docker-compose -f "$COMPOSE_FILE" logs "$service"
            exit 1
        fi
    done
    
    # Test application endpoint
    log_info "Testing application endpoint..."
    sleep 5
    
    if curl -f -s http://localhost:3000/api/health > /dev/null; then
        log_info "Application health check passed ✓"
    else
        log_warn "Application health check failed - this might be normal during startup"
    fi
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    echo "===================="
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    log_info "Application URL: http://localhost:3000"
    log_info "To view logs: docker-compose logs -f"
    log_info "To stop services: docker-compose down"
}

# Main deployment process
main() {
    echo "AI Tech Stack Converter - Production Deployment"
    echo "=============================================="
    
    # Load environment variables
    if [ -f "$ENV_FILE" ]; then
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    fi
    
    check_prerequisites
    validate_environment
    deploy
    show_status
    
    log_info "🎉 Deployment completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "health")
        check_health
        ;;
    "status")
        show_status
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f "${2:-}"
        ;;
    "stop")
        log_info "Stopping all services..."
        docker-compose -f "$COMPOSE_FILE" down
        ;;
    "restart")
        log_info "Restarting services..."
        docker-compose -f "$COMPOSE_FILE" restart
        ;;
    *)
        main
        ;;
esac