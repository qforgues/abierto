#!/bin/bash
set -e

# Backup script for Abierto - SQLite database and uploaded files
# This script creates timestamped backups, verifies them, uploads to cloud storage,
# and maintains a retention policy of 30 backups.

# Configuration
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../backend" && pwd)"
LOG_FILE="${BACKEND_DIR}/logs/abuse.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/abierto_backup_${TIMESTAMP}"
DB_PATH="${BACKEND_DIR}/db/database.sqlite"
UPLOADS_PATH="${BACKEND_DIR}/uploads"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log_message() {
  local level=$1
  local message=$2
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[${timestamp}] [BACKUP] [${level}] ${message}" >> "$LOG_FILE"
  echo "[${timestamp}] [BACKUP] [${level}] ${message}"
}

# Function to cleanup on error
cleanup_on_error() {
  local exit_code=$?
  log_message "ERROR" "Backup process failed with exit code ${exit_code}"
  rm -rf "$BACKUP_DIR"
  exit $exit_code
}

# Set error trap
trap cleanup_on_error ERR

log_message "INFO" "Starting backup process for timestamp ${TIMESTAMP}"

# Create backup directory
mkdir -p "$BACKUP_DIR"
log_message "INFO" "Created backup directory: ${BACKUP_DIR}"

# Verify source files exist
if [ ! -f "$DB_PATH" ]; then
  log_message "ERROR" "Database file not found at ${DB_PATH}"
  exit 1
fi

if [ ! -d "$UPLOADS_PATH" ]; then
  log_message "ERROR" "Uploads directory not found at ${UPLOADS_PATH}"
  exit 1
fi

log_message "INFO" "Source files verified"

# Backup SQLite database
log_message "INFO" "Backing up SQLite database from ${DB_PATH}"
cp "$DB_PATH" "${BACKUP_DIR}/database.sqlite"
log_message "INFO" "Database backup completed"

# Backup uploads directory
log_message "INFO" "Backing up uploads directory from ${UPLOADS_PATH}"
tar -czf "${BACKUP_DIR}/uploads.tar.gz" -C "${UPLOADS_PATH}" . 2>/dev/null || true
log_message "INFO" "Uploads backup completed"

# Verify backups are not empty
log_message "INFO" "Verifying backup files"

if [ ! -s "${BACKUP_DIR}/database.sqlite" ]; then
  log_message "ERROR" "Database backup verification failed: file is empty"
  exit 1
fi

if [ ! -s "${BACKUP_DIR}/uploads.tar.gz" ]; then
  log_message "ERROR" "Uploads backup verification failed: file is empty"
  exit 1
fi

DB_SIZE=$(du -h "${BACKUP_DIR}/database.sqlite" | cut -f1)
UPLOADS_SIZE=$(du -h "${BACKUP_DIR}/uploads.tar.gz" | cut -f1)
log_message "INFO" "Backup verification successful - DB: ${DB_SIZE}, Uploads: ${UPLOADS_SIZE}"

# Upload to cloud storage (AWS S3 or Supabase)
if [ -z "$BACKUP_BUCKET" ]; then
  log_message "WARN" "BACKUP_BUCKET environment variable not set. Skipping cloud upload."
else
  log_message "INFO" "Uploading backups to cloud storage: ${BACKUP_BUCKET}"
  
  # Determine storage type from bucket format
  if [[ "$BACKUP_BUCKET" == s3://* ]]; then
    # AWS S3 upload
    log_message "INFO" "Uploading to AWS S3"
    
    if ! command -v aws &> /dev/null; then
      log_message "ERROR" "AWS CLI not found. Cannot upload to S3."
      exit 1
    fi
    
    aws s3 cp "${BACKUP_DIR}/database.sqlite" "${BACKUP_BUCKET}/db_backup_${TIMESTAMP}.sqlite" 2>&1 | tee -a "$LOG_FILE"
    aws s3 cp "${BACKUP_DIR}/uploads.tar.gz" "${BACKUP_BUCKET}/uploads_backup_${TIMESTAMP}.tar.gz" 2>&1 | tee -a "$LOG_FILE"
    
    log_message "INFO" "Cloud upload completed"
    
    # Implement retention policy for S3
    log_message "INFO" "Checking retention policy (keeping last 30 backups)"
    
    BACKUP_COUNT=$(aws s3 ls "${BACKUP_BUCKET}/" | grep -c "db_backup_" || echo 0)
    
    if [ "$BACKUP_COUNT" -gt 30 ]; then
      EXCESS=$((BACKUP_COUNT - 30))
      log_message "INFO" "Found ${BACKUP_COUNT} backups. Deleting ${EXCESS} oldest backups."
      
      # List and delete oldest backups
      aws s3 ls "${BACKUP_BUCKET}/" | grep "db_backup_" | sort | head -n "$EXCESS" | awk '{print $4}' | while read -r file; do
        log_message "INFO" "Deleting old backup: ${file}"
        aws s3 rm "${BACKUP_BUCKET}/${file}"
        
        # Also delete corresponding uploads backup
        uploads_file=$(echo "$file" | sed 's/db_backup_/uploads_backup_/' | sed 's/.sqlite/.tar.gz/')
        aws s3 rm "${BACKUP_BUCKET}/${uploads_file}" 2>/dev/null || true
      done
    else
      log_message "INFO" "Retention policy satisfied (${BACKUP_COUNT} backups)"
    fi
  else
    log_message "WARN" "Unsupported backup bucket format: ${BACKUP_BUCKET}"
  fi
fi

# Cleanup temporary backup directory
log_message "INFO" "Cleaning up temporary backup directory"
rm -rf "$BACKUP_DIR"

log_message "INFO" "Backup process completed successfully"
exit 0
