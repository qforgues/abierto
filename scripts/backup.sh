#!/bin/bash

# Backup Script for SQLite Database with S3 Upload and Verification
# This script backs up the SQLite database, verifies the backup,
# uploads it to S3, and manages retention policy.

set -e

# Variables
DB_PATH="${DB_PATH:-/backend/db/database.sqlite}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/backups}"
S3_BUCKET="${S3_BUCKET:-your-bucket-name}"
S3_PREFIX="${S3_PREFIX:-backups}"
RETENTION_COUNT="${RETENTION_COUNT:-30}"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_FILE="$BACKUP_DIR/database_$TIMESTAMP.sqlite"
LOG_FILE="${LOG_FILE:-/var/log/abierto-backup.log}"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling function
error_exit() {
    log "ERROR: $1"
    exit 1
}

log "Starting backup process for database: $DB_PATH"

# Verify database file exists
if [ ! -f "$DB_PATH" ]; then
    error_exit "Database file not found at $DB_PATH"
fi

# Create backup
log "Creating backup: $BACKUP_FILE"
cp "$DB_PATH" "$BACKUP_FILE" || error_exit "Failed to create backup file"

# Verify local backup file exists and is not empty
if [ ! -f "$BACKUP_FILE" ]; then
    error_exit "Backup file was not created: $BACKUP_FILE"
fi

LOCAL_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
if [ "$LOCAL_SIZE" -eq 0 ]; then
    error_exit "Backup file is empty: $BACKUP_FILE"
fi

log "Local backup created successfully. Size: $LOCAL_SIZE bytes"

# Upload to S3
log "Uploading backup to S3: s3://$S3_BUCKET/$S3_PREFIX/database_$TIMESTAMP.sqlite"
aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/$S3_PREFIX/database_$TIMESTAMP.sqlite" || error_exit "Failed to upload backup to S3"

log "Backup uploaded to S3"

# Verify S3 upload - check file existence and size
log "Verifying S3 backup..."
S3_FILE_INFO=$(aws s3api head-object --bucket "$S3_BUCKET" --key "$S3_PREFIX/database_$TIMESTAMP.sqlite" 2>/dev/null || echo "")

if [ -z "$S3_FILE_INFO" ]; then
    error_exit "Verification failed: Backup file not found in S3 after upload"
fi

# Extract S3 file size from head-object response
S3_SIZE=$(echo "$S3_FILE_INFO" | grep -o '"ContentLength": [0-9]*' | grep -o '[0-9]*')

if [ -z "$S3_SIZE" ]; then
    error_exit "Verification failed: Could not determine S3 file size"
fi

log "S3 file size: $S3_SIZE bytes"

# Compare sizes
if [ "$LOCAL_SIZE" -ne "$S3_SIZE" ]; then
    error_exit "Verification failed: Size mismatch. Local: $LOCAL_SIZE bytes, S3: $S3_SIZE bytes"
fi

log "Verification successful: Backup file exists in S3 with matching size ($S3_SIZE bytes)"

# Retention policy: Keep last N backups, delete older ones
log "Applying retention policy: keeping last $RETENTION_COUNT backups"

# List all backups sorted by date (oldest first)
BACKUP_LIST=$(aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" --recursive | grep 'database_' | awk '{print $4}' | sort)

# Count total backups
TOTAL_BACKUPS=$(echo "$BACKUP_LIST" | grep -c 'database_' || echo 0)

if [ "$TOTAL_BACKUPS" -gt "$RETENTION_COUNT" ]; then
    log "Total backups: $TOTAL_BACKUPS. Deleting oldest backups to keep only $RETENTION_COUNT"
    
    # Calculate how many to delete
    DELETE_COUNT=$((TOTAL_BACKUPS - RETENTION_COUNT))
    
    # Get list of files to delete (oldest ones)
    FILES_TO_DELETE=$(echo "$BACKUP_LIST" | head -n "$DELETE_COUNT")
    
    # Delete old backups
    while IFS= read -r file; do
        if [ -n "$file" ]; then
            log "Deleting old backup: $file"
            aws s3 rm "s3://$S3_BUCKET/$file" || log "WARNING: Failed to delete $file"
        fi
    done <<< "$FILES_TO_DELETE"
    
    log "Retention policy applied: Deleted $DELETE_COUNT old backup(s)"
else
    log "Retention policy: No deletion needed. Current backups: $TOTAL_BACKUPS"
fi

# Clean up local backup file (optional - comment out if you want to keep local copies)
log "Cleaning up local backup file: $BACKUP_FILE"
rm -f "$BACKUP_FILE"

log "Backup process completed successfully"
exit 0
