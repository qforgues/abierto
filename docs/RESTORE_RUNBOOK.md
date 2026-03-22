# Restore Runbook for Abierto

## Overview

This document outlines the steps to restore the Abierto database and uploaded files from a backup. The restore process involves downloading backups from cloud storage, extracting files, and verifying data integrity.

## Prerequisites

- AWS CLI configured with appropriate credentials (for S3 backups)
- Access to the backup bucket specified in `BACKUP_BUCKET` environment variable
- Sufficient disk space for backup files
- The application should be stopped during restore to prevent data conflicts

## Restore Steps

### Step 1: Stop the Application

Before restoring, ensure the application is not running:

```bash
# Stop the application (adjust based on your deployment method)
sudo systemctl stop abierto
# or
npm stop
```

### Step 2: List Available Backups

List all available backups in the cloud storage:

```bash
# For AWS S3
aws s3 ls s3://your-bucket/ | grep "db_backup_"

# Output example:
# 2024-03-22 10:15:30        1024000 db_backup_20240322_101530.sqlite
# 2024-03-21 10:15:30        1024000 db_backup_20240321_101530.sqlite
```

### Step 3: Download Backup Files

Download the desired backup files from cloud storage:

```bash
# Set the backup timestamp (choose from the list above)
BACKUP_TIMESTAMP="20240322_101530"
BACKET="s3://your-bucket"

# Download database backup
aws s3 cp "${BUCKET}/db_backup_${BACKUP_TIMESTAMP}.sqlite" ./backend/db/database.sqlite

# Download uploads backup
aws s3 cp "${BUCKET}/uploads_backup_${BACKUP_TIMESTAMP}.tar.gz" /tmp/uploads_backup.tar.gz
```

### Step 4: Verify Downloaded Files

Verify that the downloaded files are valid and not corrupted:

```bash
# Check database file size (should be > 0)
ls -lh ./backend/db/database.sqlite

# Verify tar.gz integrity
tar -tzf /tmp/uploads_backup.tar.gz > /dev/null && echo "Uploads backup is valid" || echo "Uploads backup is corrupted"
```

### Step 5: Backup Current Data (Optional but Recommended)

Before restoring, create a backup of the current data:

```bash
# Backup current database
cp ./backend/db/database.sqlite ./backend/db/database.sqlite.backup

# Backup current uploads
tar -czf /tmp/uploads_current_backup.tar.gz ./backend/uploads/
```

### Step 6: Extract Uploads

Extract the uploaded files from the backup:

```bash
# Clear existing uploads (optional, if you want a clean restore)
rm -rf ./backend/uploads/*

# Extract uploads from backup
tar -xzf /tmp/uploads_backup.tar.gz -C ./backend/uploads/

# Verify extraction
ls -la ./backend/uploads/
```

### Step 7: Verify Database Integrity

Verify that the restored database is valid:

```bash
# Check database integrity using SQLite
sqlite3 ./backend/db/database.sqlite "PRAGMA integrity_check;"

# Expected output: "ok"
```

### Step 8: Start the Application

Start the application and verify it's running correctly:

```bash
# Start the application
sudo systemctl start abierto
# or
npm start

# Check application status
curl http://localhost:3000/health
```

### Step 9: Verify Data

Verify that the restored data is accessible and correct:

```bash
# Check that at least 3 photos are readable and display correctly
# 1. Open the application in a browser
# 2. Navigate to a business profile
# 3. Verify that photos load correctly
# 4. Check that business information is intact
```

## Troubleshooting

### Database Corruption

If the database integrity check fails:

```bash
# Restore from the backup you created in Step 5
cp ./backend/db/database.sqlite.backup ./backend/db/database.sqlite

# Try an older backup
BACKUP_TIMESTAMP="20240321_101530"
aws s3 cp "s3://your-bucket/db_backup_${BACKUP_TIMESTAMP}.sqlite" ./backend/db/database.sqlite
```

### Missing Uploads

If uploads are missing after extraction:

```bash
# Verify the tar.gz file is not corrupted
tar -tzf /tmp/uploads_backup.tar.gz | head -20

# Try extracting to a temporary directory first
mkdir /tmp/uploads_test
tar -xzf /tmp/uploads_backup.tar.gz -C /tmp/uploads_test/
ls -la /tmp/uploads_test/
```

### Application Won't Start

If the application fails to start after restore:

1. Check application logs:
   ```bash
   tail -f ./backend/logs/error.log
   ```

2. Verify database permissions:
   ```bash
   chmod 644 ./backend/db/database.sqlite
   ```

3. Restore from backup and try again:
   ```bash
   cp ./backend/db/database.sqlite.backup ./backend/db/database.sqlite
   ```

## Rollback Procedure

If the restore causes issues, rollback to the previous state:

```bash
# Stop the application
sudo systemctl stop abierto

# Restore from the backup created in Step 5
cp ./backend/db/database.sqlite.backup ./backend/db/database.sqlite
rm -rf ./backend/uploads/*
tar -xzf /tmp/uploads_current_backup.tar.gz -C ./backend/uploads/

# Start the application
sudo systemctl start abierto
```

## Automated Restore Script

For faster restores, use this automated script:

```bash
#!/bin/bash
set -e

BACKUP_TIMESTAMP=${1:-$(aws s3 ls s3://your-bucket/ | grep "db_backup_" | sort | tail -1 | awk '{print $4}' | sed 's/db_backup_//' | sed 's/.sqlite//')}
BUCKET="s3://your-bucket"

echo "Restoring from backup: ${BACKUP_TIMESTAMP}"

# Stop application
sudo systemctl stop abierto

# Backup current data
cp ./backend/db/database.sqlite ./backend/db/database.sqlite.backup
tar -czf /tmp/uploads_current_backup.tar.gz ./backend/uploads/

# Download and restore
aws s3 cp "${BUCKET}/db_backup_${BACKUP_TIMESTAMP}.sqlite" ./backend/db/database.sqlite
aws s3 cp "${BUCKET}/uploads_backup_${BACKUP_TIMESTAMP}.tar.gz" /tmp/uploads_backup.tar.gz

# Verify and extract
sqlite3 ./backend/db/database.sqlite "PRAGMA integrity_check;" || exit 1
rm -rf ./backend/uploads/*
tar -xzf /tmp/uploads_backup.tar.gz -C ./backend/uploads/

# Start application
sudo systemctl start abierto

echo "Restore completed successfully"
```

## Notes

- Always create a backup of current data before restoring (Step 5)
- Test the restore process in a staging environment first
- Document any issues encountered during the restore process
- Keep at least 30 backups available for recovery options
- Verify data integrity after each restore
- Consider scheduling regular restore tests to ensure backup validity

## Support

For issues or questions regarding the restore process, contact the development team or refer to the main project documentation.
