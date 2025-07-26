#!/bin/bash
# scripts/database.sh
# Database management scripts for AI Book Me

set -e

# Load environment variables
if [ -f .env.database ]; then
    export $(cat .env.database | grep -v '^#' | xargs)
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Function to check if PostgreSQL is running
check_postgres() {
    if ! docker ps | grep -q aibookme-postgres; then
        error "PostgreSQL container is not running. Start it with: docker-compose up -d postgres"
    fi
}

# Function to wait for PostgreSQL to be ready
wait_for_postgres() {
    log "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if docker exec aibookme-postgres pg_isready -U $POSTGRES_USER -d $POSTGRES_DB >/dev/null 2>&1; then
            log "PostgreSQL is ready!"
            return 0
        fi
        sleep 2
    done
    error "PostgreSQL failed to start within 60 seconds"
}

# Function to start database
start() {
    log "Starting AI Book Me database services..."
    docker-compose up -d postgres redis
    wait_for_postgres
    log "Database services started successfully!"
}

# Function to stop database
stop() {
    log "Stopping AI Book Me database services..."
    docker-compose down
    log "Database services stopped!"
}

# Function to restart database
restart() {
    log "Restarting AI Book Me database services..."
    stop
    start
}

# Function to check database status
status() {
    log "Checking database status..."
    docker-compose ps
}

# Function to view logs
logs() {
    local service=${1:-postgres}
    log "Showing logs for $service..."
    docker-compose logs -f $service
}

# Function to backup database
backup() {
    check_postgres
    local backup_name="aibookme_backup_$(date +%Y%m%d_%H%M%S).sql"
    local backup_path="./docker/postgres/backups/$backup_name"
    
    log "Creating database backup: $backup_name"
    
    # Create backup directory if it doesn't exist
    mkdir -p ./docker/postgres/backups
    
    # Create backup
    docker exec aibookme-postgres pg_dump \
        -U $POSTGRES_USER \
        -d $POSTGRES_DB \
        --clean \
        --if-exists \
        --create \
        --verbose > $backup_path
    
    # Compress backup
    gzip $backup_path
    
    log "Backup created successfully: ${backup_path}.gz"
    
    # Clean old backups (keep last 30 days)
    find ./docker/postgres/backups -name "*.sql.gz" -mtime +30 -delete
    log "Old backups cleaned up"
}

# Function to restore database
restore() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        error "Please provide backup file path: ./scripts/database.sh restore <backup_file>"
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    check_postgres
    warn "This will overwrite the current database. Are you sure? (y/N)"
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log "Restore cancelled"
        exit 0
    fi
    
    log "Restoring database from: $backup_file"
    
    # If backup is compressed, decompress it
    if [[ $backup_file == *.gz ]]; then
        log "Decompressing backup file..."
        gunzip -c $backup_file | docker exec -i aibookme-postgres psql -U $POSTGRES_USER
    else
        docker exec -i aibookme-postgres psql -U $POSTGRES_USER < $backup_file
    fi
    
    log "Database restored successfully!"
}

# Function to run migrations
migrate() {
    check_postgres
    log "Running database migrations..."
    
    # If using Node.js project with Drizzle
    if [ -f "package.json" ]; then
        npm run db:push
    else
        # Manual migration execution
        docker exec -i aibookme-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < ./migrations/latest.sql
    fi
    
    log "Migrations completed!"
}

# Function to seed database
seed() {
    check_postgres
    log "Seeding database with sample data..."
    
    # Execute seed script
    docker exec -i aibookme-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < ./docker/postgres/init/02-seed-data.sql
    
    log "Database seeded successfully!"
}

# Function to reset database
reset() {
    warn "This will completely reset the database. All data will be lost. Are you sure? (y/N)"
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log "Reset cancelled"
        exit 0
    fi
    
    log "Resetting database..."
    
    # Stop services
    docker-compose down -v
    
    # Remove volumes
    docker volume rm $(docker volume ls -q | grep aibookme) 2>/dev/null || true
    
    # Start fresh
    start
    
    log "Database reset completed!"
}

# Function to connect to database
connect() {
    check_postgres
    log "Connecting to PostgreSQL database..."
    docker exec -it aibookme-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
}

# Function to show help
help() {
    echo "AI Book Me Database Management Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start      Start database services"
    echo "  stop       Stop database services"
    echo "  restart    Restart database services"
    echo "  status     Show database status"
    echo "  logs       Show database logs"
    echo "  backup     Create database backup"
    echo "  restore    Restore database from backup"
    echo "  migrate    Run database migrations"
    echo "  seed       Seed database with sample data"
    echo "  reset      Reset database (WARNING: destroys all data)"
    echo "  connect    Connect to database CLI"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 backup"
    echo "  $0 restore ./backups/backup_20240101_120000.sql.gz"
    echo "  $0 logs postgres"
}

# Main script logic
case "${1:-help}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs $2
        ;;
    backup)
        backup
        ;;
    restore)
        restore $2
        ;;
    migrate)
        migrate
        ;;
    seed)
        seed
        ;;
    reset)
        reset
        ;;
    connect)
        connect
        ;;
    help|*)
        help
        ;;
esac