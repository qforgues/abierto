#!/bin/bash

# Abierto Backup Script
# This script creates timestamped backups of the SQLite database and uploads directory,
# uploads them to AWS S3 or Supabase Storage, and maintains a retention policy of 30 backups.

set -e

# Enable error handling with detailed output
trap 'echo "Error on line $LINENO"; exit 1' ERR

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/abierto_backup_${TIMESTAMP}"
DATABASE_PATH="./backend/db/database.sqlite"
UPLOADS_PATH="./backend/uploads/"
LOG_FILE="./backend/logs/backup.log"

# Storage configuration - set via environment variables
# For AWS S3: AWS_S3_BUCKET, AWS_REGION
# For Supabase: SUPABASE_BUCKET, SUPABASE_URL, SUPABASE_KEY
STORAGE_TYPE="${STORAGE_TYPE:-aws}"
S3_BUCKET="${AWS_S3_BUCKET:-}"
SUPABASE_BUCKET="${SUPABASE_BUCKET:-}"
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_KEY:-}"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
  local level="$1"
  shift
  local message="$@"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
  echo "[$timestamp] [$level] $message"
}

log "INFO" "Starting backup process for timestamp: $TIMESTAMP"

# Validate configuration
if [ "$STORAGE_TYPE" = "aws" ]; then
  if [ -z "$S3_BUCKET" ]; then
    log "ERROR" "AWS_S3_BUCKET environment variable not set"
    exit 1
  fi
  log "INFO" "Using AWS S3 storage: $S3_BUCKET"
elif [ "$STORAGE_TYPE" = "supabase" ]; then
  if [ -z "$SUPABASE_BUCKET" ] || [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    log "ERROR" "Supabase configuration incomplete (SUPABASE_BUCKET, SUPABASE_URL, SUPABASE_KEY required)"
    exit 1
  fi
  log "INFO" "Using Supabase storage: $SUPABASE_BUCKET"
else
  log "ERROR" "Invalid STORAGE_TYPE: $STORAGE_TYPE (must be 'aws' or 'supabase')"
  exit 1
fi

# Validate source files exist
if [ ! -f "$DATABASE_PATH" ]; then
  log "ERROR" "Database file not found at $DATABASE_PATH"
  exit 1
fi

if [ ! -d "$UPLOADS_PATH" ]; then
  log "WARN" "Uploads directory not found at $UPLOADS_PATH, creating empty backup"
  mkdir -p "$UPLOADS_PATH"
fi

# Create backup directory
log "INFO" "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Backup SQLite database
log "INFO" "Backing up SQLite database from $DATABASE_PATH"
cp "$DATABASE_PATH" "$BACKUP_DIR/database.sqlite"

# Backup uploads directory
log "INFO" "Backing up uploads directory from $UPLOADS_PATH"
if [ "$(ls -A "$UPLOADS_PATH" 2>/dev/null)" ]; then
  tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "$UPLOADS_PATH" . 2>/dev/null || true
else
  # Create empty tar.gz if uploads directory is empty
  tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "$UPLOADS_PATH" . 2>/dev/null || tar -czf "$BACKUP_DIR/uploads.tar.gz" --files-from=/dev/null
fi

# Verify backups are non-empty
log "INFO" "Verifying backup integrity"
DB_SIZE=$(stat -f%z "$BACKUP_DIR/database.sqlite" 2>/dev/null || stat -c%s "$BACKUP_DIR/database.sqlite" 2>/dev/null || echo 0)
UPLOADS_SIZE=$(stat -f%z "$BACKUP_DIR/uploads.tar.gz" 2>/dev/null || stat -c%s "$BACKUP_DIR/uploads.tar.gz" 2>/dev/null || echo 0)

if [ "$DB_SIZE" -eq 0 ]; then
  log "ERROR" "Database backup verification failed: file is empty"
  rm -rf "$BACKUP_DIR"
  exit 1
fi

if [ "$UPLOADS_SIZE" -eq 0 ]; then
  log "WARN" "Uploads backup is empty, but continuing"
fi

log "INFO" "Backup verification successful - DB: ${DB_SIZE} bytes, Uploads: ${UPLOADS_SIZE} bytes"

# Upload to storage
if [ "$STORAGE_TYPE" = "aws" ]; then
  log "INFO" "Uploading backups to AWS S3 bucket: $S3_BUCKET"
  
  # Check if AWS CLI is available
  if ! command -v aws &> /dev/null; then
    log "ERROR" "AWS CLI is not installed"
    rm -rf "$BACKUP_DIR"
    exit 1
  fi
  
  # Upload database backup
  if aws s3 cp "$BACKUP_DIR/database.sqlite" "s3://$S3_BUCKET/db_backup_${TIMESTAMP}.sqlite" --region "${AWS_REGION:-us-east-1}"; then
    log "INFO" "Successfully uploaded database backup to S3"
  else
    log "ERROR" "Failed to upload database backup to S3"
    rm -rf "$BACKUP_DIR"
    exit 1
  fi
  
  # Upload uploads backup
  if aws s3 cp "$BACKUP_DIR/uploads.tar.gz" "s3://$S3_BUCKET/uploads_backup_${TIMESTAMP}.tar.gz" --region "${AWS_REGION:-us-east-1}"; then
    log "INFO" "Successfully uploaded uploads backup to S3"
  else
    log "ERROR" "Failed to upload uploads backup to S3"
    rm -rf "$BACKUP_DIR"
    exit 1
  fi
  
  # Implement retention policy: keep last 30 backups
  log "INFO" "Implementing retention policy (keeping last 30 backups)"
  BACKUP_COUNT=$(aws s3 ls "s3://$S3_BUCKET/" --region "${AWS_REGION:-us-east-1}" | grep -c "db_backup_" || echo 0)
  
  if [ "$BACKUP_COUNT" -gt 30 ]; then
    log "INFO" "Found $BACKUP_COUNT backups, removing oldest to keep 30"
    EXCESS=$((BACKUP_COUNT - 30))
    
    # List and delete old backups
    aws s3 ls "s3://$S3_BUCKET/" --region "${AWS_REGION:-us-east-1}" | grep "db_backup_" | sort | head -n "$EXCESS" | awk '{print $4}' | while read -r db_file; do
      uploads_file="${db_file/db_backup_/uploads_backup_}"
      uploads_file="${uploads_file/.sqlite/.tar.gz}"
      
      log "INFO" "Deleting old backup: $db_file and $uploads_file"
      aws s3 rm "s3://$S3_BUCKET/$db_file" --region "${AWS_REGION:-us-east-1}" || true
      aws s3 rm "s3://$S3_BUCKET/$uploads_file" --region "${AWS_REGION:-us-east-1}" || true
    done
  fi
  
elif [ "$STORAGE_TYPE" = "supabase" ]; then
  log "INFO" "Uploading backups to Supabase Storage bucket: $SUPABASE_BUCKET"
  
  # Check if curl is available
  if ! command -v curl &> /dev/null; then
    log "ERROR" "curl is not installed"
    rm -rf "$BACKUP_DIR"
    exit 1
  fi
  
  # Upload database backup
  DB_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/db_backup_${TIMESTAMP}.sqlite" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/octet-stream" \
    --data-binary @"$BACKUP_DIR/database.sqlite")
  
  DB_HTTP_CODE=$(echo "$DB_RESPONSE" | tail -n1)
  if [ "$DB_HTTP_CODE" = "200" ] || [ "$DB_HTTP_CODE" = "201" ]; then
    log "INFO" "Successfully uploaded database backup to Supabase"
  else
    log "ERROR" "Failed to upload database backup to Supabase (HTTP $DB_HTTP_CODE)"
    rm -rf "$BACKUP_DIR"
    exit 1
  fi
  
  # Upload uploads backup
  UPLOADS_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/uploads_backup_${TIMESTAMP}.tar.gz" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/gzip" \
    --data-binary @"$BACKUP_DIR/uploads.tar.gz")
  
  UPLOADS_HTTP_CODE=$(echo "$UPLOADS_RESPONSE" | tail -n1)
  if [ "$UPLOADS_HTTP_CODE" = "200" ] || [ "$UPLOADS_HTTP_CODE" = "201" ]; then
    log "INFO" "Successfully uploaded uploads backup to Supabase"
  else
    log "ERROR" "Failed to upload uploads backup to Supabase (HTTP $UPLOADS_HTTP_CODE)"
    rm -rf "$BACKUP_DIR"
    exit 1
  fi
  
  # Implement retention policy for Supabase
  log "INFO" "Implementing retention policy (keeping last 30 backups)"
  BACKUP_LIST=$(curl -s -X GET \
    "${SUPABASE_URL}/storage/v1/object/list/${SUPABASE_BUCKET}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}")
  
  BACKUP_COUNT=$(echo "$BACKUP_LIST" | grep -o '"name":"db_backup_' | wc -l || echo 0)
  
  if [ "$BACKUP_COUNT" -gt 30 ]; then
    log "INFO" "Found $BACKUP_COUNT backups, removing oldest to keep 30"
    EXCESS=$((BACKUP_COUNT - 30))
    
    # Extract and delete old backups
    echo "$BACKUP_LIST" | grep -o '"name":"db_backup_[^"]*' | sed 's/"name":"//' | sort | head -n "$EXCESS" | while read -r db_file; do
      uploads_file="${db_file/db_backup_/uploads_backup_}"
      uploads_file="${uploads_file/.sqlite/.tar.gz}"
      
      log "INFO" "Deleting old backup: $db_file and $uploads_file"
      curl -s -X DELETE \
        "${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${db_file}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" || true
      curl -s -X DELETE \
        "${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${uploads_file}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" || true
    done
  fi
fi

# Cleanup local backup directory
log "INFO" "Cleaning up local backup directory: $BACKUP_DIR"
rm -rf "$BACKUP_DIR"

log "INFO" "Backup process completed successfully"
exit 0
