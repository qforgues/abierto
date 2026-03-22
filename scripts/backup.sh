#!/bin/bash
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warn() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Verify required environment variables
if [ -z "$AWS_BUCKET_NAME" ]; then
  error "AWS_BUCKET_NAME environment variable is not set"
  exit 1
fi

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  error "AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) are not set"
  exit 1
fi

# Verify AWS CLI is installed
if ! command -v aws &> /dev/null; then
  error "AWS CLI is not installed. Please install it to use this backup script."
  exit 1
fi

log "Starting Abierto backup process..."

# Create temporary backup directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/abierto_backup_${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"
log "Created backup directory: $BACKUP_DIR"

# Verify database file exists
if [ ! -f "./backend/db/database.sqlite" ]; then
  error "Database file not found at ./backend/db/database.sqlite"
  rm -rf "$BACKUP_DIR"
  exit 1
fi

# Backup SQLite database
log "Backing up SQLite database..."
cp ./backend/db/database.sqlite "$BACKUP_DIR/database.sqlite"
if [ ! -f "$BACKUP_DIR/database.sqlite" ]; then
  error "Failed to copy database file"
  rm -rf "$BACKUP_DIR"
  exit 1
fi
log "Database backup completed"

# Backup uploads directory if it exists
if [ -d "./backend/uploads" ]; then
  log "Backing up uploads directory..."
  tar -czf "$BACKUP_DIR/uploads.tar.gz" -C ./backend uploads/ 2>/dev/null || true
  if [ ! -f "$BACKUP_DIR/uploads.tar.gz" ]; then
    warn "Uploads directory is empty or could not be archived"
  else
    log "Uploads backup completed"
  fi
else
  warn "Uploads directory not found at ./backend/uploads"
fi

# Verify backup files are not empty
log "Verifying backup files..."
if [ ! -s "$BACKUP_DIR/database.sqlite" ]; then
  error "Backup verification failed: database.sqlite is empty"
  rm -rf "$BACKUP_DIR"
  exit 1
fi

DB_SIZE=$(du -h "$BACKUP_DIR/database.sqlite" | cut -f1)
log "Database backup size: $DB_SIZE"

if [ -f "$BACKUP_DIR/uploads.tar.gz" ] && [ -s "$BACKUP_DIR/uploads.tar.gz" ]; then
  UPLOADS_SIZE=$(du -h "$BACKUP_DIR/uploads.tar.gz" | cut -f1)
  log "Uploads backup size: $UPLOADS_SIZE"
fi

log "Backup verification passed"

# Upload to S3
log "Uploading backups to S3 bucket: $AWS_BUCKET_NAME"

if aws s3 cp "$BACKUP_DIR/database.sqlite" "s3://$AWS_BUCKET_NAME/db_backup_${TIMESTAMP}.sqlite" --no-progress; then
  log "Database backup uploaded successfully"
else
  error "Failed to upload database backup to S3"
  rm -rf "$BACKUP_DIR"
  exit 1
fi

if [ -f "$BACKUP_DIR/uploads.tar.gz" ] && [ -s "$BACKUP_DIR/uploads.tar.gz" ]; then
  if aws s3 cp "$BACKUP_DIR/uploads.tar.gz" "s3://$AWS_BUCKET_NAME/uploads_backup_${TIMESTAMP}.tar.gz" --no-progress; then
    log "Uploads backup uploaded successfully"
  else
    error "Failed to upload uploads backup to S3"
    rm -rf "$BACKUP_DIR"
    exit 1
  fi
fi

# Implement retention policy: keep last 30 backups
log "Implementing retention policy (keeping last 30 backups)..."

# Count database backups
BACKUP_COUNT=$(aws s3 ls "s3://$AWS_BUCKET_NAME/" | grep -c "db_backup_" || echo "0")
log "Current backup count: $BACKUP_COUNT"

if [ "$BACKUP_COUNT" -gt 30 ]; then
  EXCESS=$((BACKUP_COUNT - 30))
  log "Deleting $EXCESS old backups to maintain retention policy..."
  
  # Get list of old database backups to delete
  OLD_DB_BACKUPS=$(aws s3 ls "s3://$AWS_BUCKET_NAME/" | grep "db_backup_" | sort | head -n "$EXCESS" | awk '{print $4}')
  
  # Delete old database backups
  while IFS= read -r backup; do
    if [ -n "$backup" ]; then
      if aws s3 rm "s3://$AWS_BUCKET_NAME/$backup" --no-progress; then
        log "Deleted old backup: $backup"
      else
        warn "Failed to delete backup: $backup"
      fi
    fi
  done <<< "$OLD_DB_BACKUPS"
  
  # Also delete corresponding uploads backups
  OLD_UPLOADS_BACKUPS=$(aws s3 ls "s3://$AWS_BUCKET_NAME/" | grep "uploads_backup_" | sort | head -n "$EXCESS" | awk '{print $4}')
  
  while IFS= read -r backup; do
    if [ -n "$backup" ]; then
      if aws s3 rm "s3://$AWS_BUCKET_NAME/$backup" --no-progress; then
        log "Deleted old uploads backup: $backup"
      else
        warn "Failed to delete uploads backup: $backup"
      fi
    fi
  done <<< "$OLD_UPLOADS_BACKUPS"
else
  log "Backup count is within retention policy limits"
fi

# Cleanup temporary directory
log "Cleaning up temporary backup directory..."
rm -rf "$BACKUP_DIR"

log "${GREEN}Backup process completed successfully!${NC}"
exit 0
