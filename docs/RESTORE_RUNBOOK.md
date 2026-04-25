# Restore Procedure for Abierto Backups

This document outlines the complete procedure for restoring the Abierto application from backups stored in AWS S3 or Supabase Storage.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Restore from AWS S3](#restore-from-aws-s3)
3. [Restore from Supabase Storage](#restore-from-supabase-storage)
4. [Verification Steps](#verification-steps)
5. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting the restore process, ensure you have:

- Access to the AWS Management Console (for S3) or Supabase dashboard (for Supabase Storage)
- The application stopped or in maintenance mode
- Sufficient disk space for the backup files
- Appropriate file permissions to modify the database and uploads directories
- A backup of the current database (optional but recommended)

## Restore from AWS S3

### Step 1: Access AWS S3

1. Log in to your [AWS Management Console](https://console.aws.amazon.com/)
2. Navigate to **S3** from the services menu
3. Find and click on your backup bucket (e.g., `abierto-backups`)

### Step 2: Locate and Download Backup Files

1. In the S3 bucket, locate the backup files you want to restore:
   - Database backup: `db_backup_YYYYMMDD_HHMMSS.sqlite`
   - Uploads backup: `uploads_backup_YYYYMMDD_HHMMSS.tar.gz`
   
   **Note:** The timestamps should match for a consistent restore point.

2. Select the database backup file and click **Download**
3. Select the uploads backup file and click **Download**
4. Save both files to a temporary directory on your local machine

### Step 3: Restore SQLite Database

1. **Stop the application:**
   ```bash
   # If running with systemd
   sudo systemctl stop abierto
   
   # If running with Docker
   docker stop abierto-app
   
   # If running with npm
   npm stop
   ```

2. **Backup the current database (recommended):**
   ```bash
   cp ./backend/db/database.sqlite ./backend/db/database.sqlite.backup
   ```

3. **Replace the database file:**
   ```bash
   cp /path/to/downloaded/db_backup_YYYYMMDD_HHMMSS.sqlite ./backend/db/database.sqlite
   ```

4. **Set correct file permissions:**
   ```bash
   chmod 644 ./backend/db/database.sqlite
   chown app:app ./backend/db/database.sqlite  # Replace 'app' with your application user
   ```

### Step 4: Restore Uploaded Files

1. **Backup the current uploads directory (recommended):**
   ```bash
   tar -czf ./backend/uploads.backup.tar.gz ./backend/uploads/
   ```

2. **Clear the current uploads directory:**
   ```bash
   rm -rf ./backend/uploads/*
   ```

3. **Extract the backup:**
   ```bash
   tar -xzf /path/to/downloaded/uploads_backup_YYYYMMDD_HHMMSS.tar.gz -C ./backend/uploads/
   ```

4. **Set correct file permissions:**
   ```bash
   chmod -R 755 ./backend/uploads/
   chown -R app:app ./backend/uploads/  # Replace 'app' with your application user
   ```

### Step 5: Start the Application

1. **Start the application:**
   ```bash
   # If running with systemd
   sudo systemctl start abierto
   
   # If running with Docker
   docker start abierto-app
   
   # If running with npm
   npm start
   ```

2. **Verify the application is running:**
   ```bash
   curl http://localhost:3000/health
   ```

## Restore from Supabase Storage

### Step 1: Access Supabase Dashboard

1. Log in to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click on your backup bucket (e.g., `abierto-backups`)

### Step 2: Locate and Download Backup Files

1. In the storage bucket, locate the backup files:
   - Database backup: `db_backup_YYYYMMDD_HHMMSS.sqlite`
   - Uploads backup: `uploads_backup_YYYYMMDD_HHMMSS.tar.gz`

2. Click on the database backup file and select **Download**
3. Click on the uploads backup file and select **Download**
4. Save both files to a temporary directory on your local machine

### Step 3: Restore SQLite Database

1. **Stop the application:**
   ```bash
   # If running with systemd
   sudo systemctl stop abierto
   
   # If running with Docker
   docker stop abierto-app
   
   # If running with npm
   npm stop
   ```

2. **Backup the current database (recommended):**
   ```bash
   cp ./backend/db/database.sqlite ./backend/db/database.sqlite.backup
   ```

3. **Replace the database file:**
   ```bash
   cp /path/to/downloaded/db_backup_YYYYMMDD_HHMMSS.sqlite ./backend/db/database.sqlite
   ```

4. **Set correct file permissions:**
   ```bash
   chmod 644 ./backend/db/database.sqlite
   chown app:app ./backend/db/database.sqlite  # Replace 'app' with your application user
   ```

### Step 4: Restore Uploaded Files

1. **Backup the current uploads directory (recommended):**
   ```bash
   tar -czf ./backend/uploads.backup.tar.gz ./backend/uploads/
   ```

2. **Clear the current uploads directory:**
   ```bash
   rm -rf ./backend/uploads/*
   ```

3. **Extract the backup:**
   ```bash
   tar -xzf /path/to/downloaded/uploads_backup_YYYYMMDD_HHMMSS.tar.gz -C ./backend/uploads/
   ```

4. **Set correct file permissions:**
   ```bash
   chmod -R 755 ./backend/uploads/
   chown -R app:app ./backend/uploads/  # Replace 'app' with your application user
   ```

### Step 5: Start the Application

1. **Start the application:**
   ```bash
   # If running with systemd
   sudo systemctl start abierto
   
   # If running with Docker
   docker start abierto-app
   
   # If running with npm
   npm start
   ```

2. **Verify the application is running:**
   ```bash
   curl http://localhost:3000/health
   ```

## Verification Steps

After completing the restore process, perform the following verification steps:

### 1. Check Application Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Verify Database Integrity

```bash
# Check SQLite database integrity
sqlite3 ./backend/db/database.sqlite "PRAGMA integrity_check;"
```

Expected output: `ok`

### 3. Verify Uploaded Files

```bash
# List uploaded files
ls -la ./backend/uploads/

# Check file count
find ./backend/uploads/ -type f | wc -l
```

### 4. Test Application Functionality

1. Log in to the application with a known business code and password
2. Verify that previously uploaded photos are visible
3. Test creating a new business and uploading a photo
4. Verify that the new uploads are saved correctly

### 5. Check Application Logs

```bash
# View recent application logs
tail -f ./backend/logs/app.log

# Check for errors
grep ERROR ./backend/logs/app.log | tail -20
```

## Troubleshooting

### Issue: Database File is Corrupted

**Symptoms:** Application fails to start with database errors

**Solution:**
1. Restore from an earlier backup
2. Check the backup file integrity: `sqlite3 db_backup_YYYYMMDD_HHMMSS.sqlite "PRAGMA integrity_check;"`
3. If all backups are corrupted, contact support

### Issue: Uploads Directory is Empty

**Symptoms:** Photos are not visible in the application

**Solution:**
1. Verify the uploads backup file exists and is not empty:
   ```bash
   ls -lh uploads_backup_YYYYMMDD_HHMMSS.tar.gz
   tar -tzf uploads_backup_YYYYMMDD_HHMMSS.tar.gz | head
   ```
2. Re-extract the backup:
   ```bash
   rm -rf ./backend/uploads/*
   tar -xzf uploads_backup_YYYYMMDD_HHMMSS.tar.gz -C ./backend/uploads/
   ```
3. Check file permissions

### Issue: Application Won't Start After Restore

**Symptoms:** Application fails to start or crashes immediately

**Solution:**
1. Check application logs:
   ```bash
   tail -100 ./backend/logs/app.log
   ```
2. Verify database file permissions:
   ```bash
   ls -l ./backend/db/database.sqlite
   ```
3. Restore from the previous backup:
   ```bash
   cp ./backend/db/database.sqlite.backup ./backend/db/database.sqlite
   ```
4. Restart the application

### Issue: File Permission Errors

**Symptoms:** Permission denied errors when accessing database or uploads

**Solution:**
1. Identify the application user:
   ```bash
   ps aux | grep abierto
   ```
2. Set correct permissions:
   ```bash
   chown -R app:app ./backend/db/
   chown -R app:app ./backend/uploads/
   chmod 644 ./backend/db/database.sqlite
   chmod -R 755 ./backend/uploads/
   ```

### Issue: Backup Files Not Found in Storage

**Symptoms:** Cannot locate backup files in S3 or Supabase

**Solution:**
1. Verify backup script is running:
   ```bash
   cat ./backend/logs/backup.log | tail -50
   ```
2. Check cron job status:
   ```bash
   crontab -l
   ```
3. Manually run the backup script:
   ```bash
   bash ./scripts/backup.sh
   ```
4. Verify storage credentials are correct

## Rollback Procedure

If the restore causes issues, you can quickly rollback:

```bash
# Stop the application
sudo systemctl stop abierto

# Restore the backup you created before restore
cp ./backend/db/database.sqlite.backup ./backend/db/database.sqlite
tar -xzf ./backend/uploads.backup.tar.gz -C ./backend/uploads/

# Start the application
sudo systemctl start abierto
```

## Support and Contact

If you encounter issues during the restore process that are not covered in this runbook:

1. Check the application logs: `./backend/logs/app.log`
2. Check the backup logs: `./backend/logs/backup.log`
3. Review the troubleshooting section above
4. Contact the development team with:
   - Error messages from logs
   - Steps you've taken
   - Backup timestamp you're trying to restore
   - Storage type (AWS S3 or Supabase)

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Abierto Project Repository](https://github.com/your-org/abierto)
