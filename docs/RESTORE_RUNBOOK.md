# Abierto Backup and Restore Runbook

## Overview

This document provides comprehensive instructions for backing up and restoring the Abierto application data, including the SQLite database and uploaded files. The backup system is designed to ensure data safety and enable quick recovery in case of data loss or corruption.

## Backup System Architecture

### Components

1. **Backup Script**: `scripts/backup.sh` - Automated backup creation and upload
2. **Cloud Storage**: AWS S3 - Stores backup files with automatic retention policy
3. **Cron Job**: Scheduled nightly execution of the backup script
4. **Retention Policy**: Automatically maintains the last 30 backups

### Backup Contents

Each backup includes:
- **database.sqlite**: Complete SQLite database file
- **uploads.tar.gz**: Compressed archive of all uploaded files

## Prerequisites

Before setting up or running backups, ensure the following are installed and configured:

### Required Software
- AWS CLI (version 2.x or later)
- bash shell
- tar utility
- Standard Unix utilities (date, cp, etc.)

### AWS Configuration

Ensure the following environment variables are set in your `.env` file:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_BUCKET_NAME=your-abierto-backups-bucket
```

### AWS IAM Permissions

The AWS user or role must have the following S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-abierto-backups-bucket",
        "arn:aws:s3:::your-abierto-backups-bucket/*"
      ]
    }
  ]
}
```

## Backup Procedure

### Manual Backup Execution

To manually create a backup:

1. **Navigate to the project root directory**:
   ```bash
   cd /path/to/abierto
   ```

2. **Ensure environment variables are loaded**:
   ```bash
   source .env
   ```

3. **Run the backup script**:
   ```bash
   bash scripts/backup.sh
   ```

4. **Verify the backup was successful**:
   - Check the console output for success messages
   - Verify files appear in your S3 bucket:
     ```bash
     aws s3 ls s3://$AWS_BUCKET_NAME/ | grep backup
     ```

### Automated Nightly Backups

To set up automatic nightly backups using cron:

1. **Open the crontab editor**:
   ```bash
   crontab -e
   ```

2. **Add the following cron job** (runs daily at 2:00 AM):
   ```bash
   0 2 * * * cd /path/to/abierto && source .env && bash scripts/backup.sh >> /var/log/abierto-backup.log 2>&1
   ```

3. **Verify the cron job was added**:
   ```bash
   crontab -l
   ```

### Backup Verification

The backup script automatically verifies:
- Database file is not empty
- Uploads archive is created (if uploads exist)
- Files are successfully uploaded to S3

If verification fails, the script will:
- Log an error message
- Exit with a non-zero status code
- Clean up temporary files

## Restore Procedure

### Prerequisites for Restore

- AWS CLI configured with appropriate credentials
- Access to the S3 bucket containing backups
- Application stopped (to prevent conflicts during restore)
- Sufficient disk space for backup files

### Step-by-Step Restore Process

#### 1. Stop the Application

```bash
# If running with systemd
sudo systemctl stop abierto

# If running with PM2
pm2 stop abierto

# If running with Docker
docker-compose down
```

#### 2. List Available Backups

View all available backups in S3:

```bash
aws s3 ls s3://$AWS_BUCKET_NAME/ | grep db_backup
```

Example output:
```
2024-01-15 02:00:00          1234567 db_backup_20240115_020000.sqlite
2024-01-14 02:00:00          1234567 db_backup_20240114_020000.sqlite
2024-01-13 02:00:00          1234567 db_backup_20240113_020000.sqlite
```

#### 3. Download the Desired Backup

Download the database backup:

```bash
# Replace TIMESTAMP with the desired backup timestamp
TIMESTAMP="20240115_020000"
aws s3 cp "s3://$AWS_BUCKET_NAME/db_backup_${TIMESTAMP}.sqlite" ./backend/db/database.sqlite
```

Download the uploads backup (if needed):

```bash
aws s3 cp "s3://$AWS_BUCKET_NAME/uploads_backup_${TIMESTAMP}.tar.gz" /tmp/uploads_backup.tar.gz
```

#### 4. Restore the Database

The database file is now in place at `./backend/db/database.sqlite`.

Verify the database integrity:

```bash
sqlite3 ./backend/db/database.sqlite "PRAGMA integrity_check;"
```

Expected output: `ok`

#### 5. Restore Uploaded Files (Optional)

If you need to restore uploaded files:

```bash
# Create backup of current uploads (optional)
tar -czf /tmp/uploads_current_backup.tar.gz ./backend/uploads/

# Extract the restored uploads
tar -xzf /tmp/uploads_backup.tar.gz -C ./backend/

# Verify permissions
chown -R app:app ./backend/uploads/
chmod -R 755 ./backend/uploads/
```

#### 6. Start the Application

```bash
# If using systemd
sudo systemctl start abierto

# If using PM2
pm2 start abierto

# If using Docker
docker-compose up -d
```

#### 7. Verify the Restore

Test the application:

```bash
# Check application health
curl http://localhost:3000/health

# Verify database connectivity
curl http://localhost:3000/api/businesses

# Check application logs for errors
tail -f /var/log/abierto/app.log
```

## Disaster Recovery Scenarios

### Scenario 1: Database Corruption

**Symptoms**: Application crashes, database errors in logs

**Recovery Steps**:
1. Stop the application
2. Backup the corrupted database: `cp ./backend/db/database.sqlite ./backend/db/database.sqlite.corrupted`
3. Follow the restore procedure above
4. Start the application
5. Monitor logs for issues

### Scenario 2: Accidental Data Deletion

**Symptoms**: Missing businesses or photos

**Recovery Steps**:
1. Identify the timestamp of the last good backup
2. Stop the application
3. Restore from that backup using the restore procedure
4. Verify data integrity
5. Start the application

### Scenario 3: Complete System Failure

**Symptoms**: Server down, unable to access application

**Recovery Steps**:
1. Provision new server/container
2. Install application dependencies
3. Clone the application repository
4. Configure environment variables
5. Follow the restore procedure to restore database and uploads
6. Start the application
7. Verify all functionality

## Monitoring and Maintenance

### Backup Logs

Monitor backup execution logs:

```bash
# View recent backup logs
tail -f /var/log/abierto-backup.log

# Search for errors
grep ERROR /var/log/abierto-backup.log
```

### Retention Policy

The backup system automatically maintains the last 30 backups. Older backups are automatically deleted from S3.

To manually check backup count:

```bash
aws s3 ls s3://$AWS_BUCKET_NAME/ | grep db_backup | wc -l
```

### Storage Costs

Estimate S3 storage costs:

```bash
# Calculate total backup size
aws s3 ls s3://$AWS_BUCKET_NAME/ --recursive --summarize | grep "Total Size"
```

### Testing Backups

Regularly test backup restoration to ensure recovery capability:

```bash
# Monthly backup test procedure
1. Create a test environment
2. Download latest backup
3. Restore to test environment
4. Verify all data is present and correct
5. Document any issues
```

## Troubleshooting

### Issue: "AWS_BUCKET_NAME environment variable is not set"

**Solution**: Ensure `.env` file contains `AWS_BUCKET_NAME` and is sourced before running the script:

```bash
source .env
bash scripts/backup.sh
```

### Issue: "AWS CLI is not installed"

**Solution**: Install AWS CLI:

```bash
# macOS
brew install awscli

# Ubuntu/Debian
sudo apt-get install awscli

# Or using pip
pip install awscli
```

### Issue: "Failed to upload database backup to S3"

**Possible Causes**:
- Invalid AWS credentials
- Insufficient S3 permissions
- Network connectivity issues
- S3 bucket doesn't exist

**Solutions**:
1. Verify AWS credentials: `aws sts get-caller-identity`
2. Check S3 bucket exists: `aws s3 ls s3://$AWS_BUCKET_NAME/`
3. Verify IAM permissions (see Prerequisites section)
4. Check network connectivity: `ping s3.amazonaws.com`

### Issue: "Backup verification failed: database.sqlite is empty"

**Possible Causes**:
- Database file is corrupted
- Insufficient disk space
- File permission issues

**Solutions**:
1. Check database integrity: `sqlite3 ./backend/db/database.sqlite "PRAGMA integrity_check;"`
2. Verify disk space: `df -h`
3. Check file permissions: `ls -la ./backend/db/database.sqlite`

### Issue: "Restore shows old data"

**Solution**: Verify you're restoring from the correct backup timestamp:

```bash
# List backups with details
aws s3 ls s3://$AWS_BUCKET_NAME/ | grep db_backup | sort

# Restore from the most recent backup
LATEST=$(aws s3 ls s3://$AWS_BUCKET_NAME/ | grep db_backup | sort | tail -1 | awk '{print $4}')
aws s3 cp "s3://$AWS_BUCKET_NAME/$LATEST" ./backend/db/database.sqlite
```

## Best Practices

1. **Test Restores Regularly**: Monthly test restores ensure recovery capability
2. **Monitor Backup Logs**: Check logs weekly for errors or warnings
3. **Document Changes**: Keep records of significant data changes for recovery reference
4. **Secure Credentials**: Never commit `.env` file with credentials to version control
5. **Verify Backups**: Periodically verify backup files are accessible in S3
6. **Plan for Growth**: Monitor backup storage costs as data grows
7. **Automate Monitoring**: Set up alerts for failed backups

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/latest/reference/)
- [SQLite Backup Documentation](https://www.sqlite.org/backup.html)
- [Cron Job Tutorial](https://crontab.guru/)

## Support and Questions

For issues or questions regarding backups and restoration:

1. Check the Troubleshooting section above
2. Review application logs: `./backend/logs/`
3. Check backup logs: `/var/log/abierto-backup.log`
4. Contact the development team with:
   - Error messages from logs
   - Steps taken before the issue occurred
   - Current backup status
