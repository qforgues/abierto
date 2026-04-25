# Cron Job Setup for Automated Backups

This document provides instructions for setting up automated nightly backups using cron jobs.

## Overview

The backup script (`scripts/backup.sh`) should be executed automatically every night to ensure regular backups of the SQLite database and uploaded files. This guide covers setup for Linux/Unix systems.

## Prerequisites

- Linux/Unix-based system (or WSL on Windows)
- Cron daemon installed and running
- Backup script at `scripts/backup.sh` with execute permissions
- Environment variables configured for AWS S3 or Supabase Storage

## Environment Variables

Before setting up the cron job, ensure the following environment variables are configured:

### For AWS S3:

```bash
export STORAGE_TYPE="aws"
export AWS_S3_BUCKET="your-bucket-name"
export AWS_REGION="us-east-1"  # or your preferred region
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
```

### For Supabase Storage:

```bash
export STORAGE_TYPE="supabase"
export SUPABASE_BUCKET="your-bucket-name"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-service-role-key"
```

## Setup Instructions

### Step 1: Make the Backup Script Executable

```bash
chmod +x scripts/backup.sh
```

### Step 2: Create an Environment File

Create a file at `scripts/.backup.env` with your environment variables:

```bash
# For AWS S3
STORAGE_TYPE=aws
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# For Supabase
# STORAGE_TYPE=supabase
# SUPABASE_BUCKET=your-bucket-name
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=your-service-role-key
```

**Important:** Add `scripts/.backup.env` to `.gitignore` to prevent committing sensitive credentials.

### Step 3: Create a Cron Wrapper Script

Create a wrapper script at `scripts/run-backup.sh` that sources the environment file and runs the backup:

```bash
#!/bin/bash

# Source environment variables
if [ -f "$(dirname "$0")/.backup.env" ]; then
  source "$(dirname "$0")/.backup.env
fi

# Export variables for the backup script
export STORAGE_TYPE
export AWS_S3_BUCKET
export AWS_REGION
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export SUPABASE_BUCKET
export SUPABASE_URL
export SUPABASE_KEY

# Change to project root directory
cd "$(dirname "$0")/.." || exit 1

# Run the backup script
bash scripts/backup.sh
```

Make it executable:

```bash
chmod +x scripts/run-backup.sh
```

### Step 4: Add Cron Job

Edit the crontab:

```bash
crontab -e
```

Add the following line to run the backup every night at 2:00 AM:

```cron
0 2 * * * /path/to/abierto/scripts/run-backup.sh >> /path/to/abierto/backend/logs/cron-backup.log 2>&1
```

**Note:** Replace `/path/to/abierto` with the absolute path to your Abierto project directory.

### Alternative: Run at Different Times

You can adjust the cron schedule as needed:

```cron
# Run every night at 3:00 AM
0 3 * * * /path/to/abierto/scripts/run-backup.sh >> /path/to/abierto/backend/logs/cron-backup.log 2>&1

# Run every 6 hours
0 */6 * * * /path/to/abierto/scripts/run-backup.sh >> /path/to/abierto/backend/logs/cron-backup.log 2>&1

# Run every day at 2:00 AM and 2:00 PM
0 2,14 * * * /path/to/abierto/scripts/run-backup.sh >> /path/to/abierto/backend/logs/cron-backup.log 2>&1
```

## Cron Schedule Format

The cron format is: `minute hour day month weekday command`

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * * command to execute
```

## Verification

### Check if Cron Job is Installed

```bash
crontab -l
```

You should see your backup job listed.

### Test the Cron Job Manually

```bash
/path/to/abierto/scripts/run-backup.sh
```

Check the output:

```bash
cat /path/to/abierto/backend/logs/cron-backup.log
```

### Monitor Cron Execution

On most Linux systems, cron logs are available via:

```bash
# On Ubuntu/Debian
sudo journalctl -u cron --since "1 hour ago"

# On CentOS/RHEL
sudo tail -f /var/log/cron

# On macOS
log stream --predicate 'process == "cron"' --level debug
```

### Check Backup Logs

```bash
tail -50 backend/logs/backup.log
```

## Troubleshooting

### Cron Job Not Running

1. **Verify cron daemon is running:**
   ```bash
   sudo systemctl status cron
   # or
   sudo systemctl status crond
   ```

2. **Check crontab syntax:**
   ```bash
   crontab -l
   ```

3. **Verify script permissions:**
   ```bash
   ls -l scripts/run-backup.sh
   # Should show: -rwxr-xr-x
   ```

4. **Check if cron can execute the script:**
   ```bash
   /path/to/abierto/scripts/run-backup.sh
   ```

### Environment Variables Not Set

1. **Verify .backup.env file exists:**
   ```bash
   ls -l scripts/.backup.env
   ```

2. **Check file permissions:**
   ```bash
   chmod 600 scripts/.backup.env
   ```

3. **Test environment sourcing:**
   ```bash
   source scripts/.backup.env
   echo $STORAGE_TYPE
   ```

### AWS CLI or curl Not Found

1. **Install AWS CLI (for S3):**
   ```bash
   # On Ubuntu/Debian
   sudo apt-get install awscli
   
   # On macOS
   brew install awscli
   ```

2. **Install curl (for Supabase):**
   ```bash
   # On Ubuntu/Debian
   sudo apt-get install curl
   
   # On macOS
   brew install curl
   ```

3. **Verify installation:**
   ```bash
   which aws
   which curl
   ```

### Permission Denied Errors

1. **Check script permissions:**
   ```bash
   chmod 755 scripts/run-backup.sh
   chmod 755 scripts/backup.sh
   ```

2. **Check directory permissions:**
   ```bash
   chmod 755 scripts/
   chmod 755 backend/logs/
   ```

3. **Verify cron user has access:**
   ```bash
   # Run as the cron user (usually your user)
   sudo -u $(whoami) /path/to/abierto/scripts/run-backup.sh
   ```

### Backup Logs Not Being Created

1. **Verify log directory exists:**
   ```bash
   mkdir -p backend/logs
   chmod 755 backend/logs
   ```

2. **Check cron output redirection:**
   ```bash
   # Verify the log file is being written
   tail -f backend/logs/cron-backup.log
   ```

## Best Practices

1. **Use Absolute Paths:** Always use absolute paths in cron jobs to avoid path-related issues.

2. **Log Output:** Always redirect cron output to a log file for debugging:
   ```cron
   0 2 * * * /path/to/abierto/scripts/run-backup.sh >> /path/to/abierto/backend/logs/cron-backup.log 2>&1
   ```

3. **Monitor Backups:** Regularly check backup logs to ensure backups are running successfully:
   ```bash
   tail -20 backend/logs/backup.log
   ```

4. **Test Restore:** Periodically test the restore procedure to ensure backups are usable.

5. **Secure Credentials:** Use environment files with restricted permissions (600) to store sensitive credentials:
   ```bash
   chmod 600 scripts/.backup.env
   ```

6. **Backup Retention:** The backup script automatically maintains a retention policy of 30 backups. Monitor storage usage to ensure costs remain reasonable.

7. **Email Notifications:** Consider adding email notifications for backup failures:
   ```cron
   0 2 * * * /path/to/abierto/scripts/run-backup.sh >> /path/to/abierto/backend/logs/cron-backup.log 2>&1 || echo "Backup failed" | mail -s "Abierto Backup Alert" admin@example.com
   ```

## Systemd Timer Alternative

If you prefer using systemd timers instead of cron, create the following files:

### Create Service File: `/etc/systemd/system/abierto-backup.service`

```ini
[Unit]
Description=Abierto Backup Service
After=network.target

[Service]
Type=oneshot
User=abierto
WorkingDirectory=/path/to/abierto
EnvironmentFile=/path/to/abierto/scripts/.backup.env
ExecStart=/path/to/abierto/scripts/run-backup.sh
StandardOutput=journal
StandardError=journal
```

### Create Timer File: `/etc/systemd/system/abierto-backup.timer`

```ini
[Unit]
Description=Abierto Backup Timer
Requires=abierto-backup.service

[Timer]
OnCalendar=daily
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

### Enable and Start Timer

```bash
sudo systemctl daemon-reload
sudo systemctl enable abierto-backup.timer
sudo systemctl start abierto-backup.timer

# Check status
sudo systemctl status abierto-backup.timer
sudo systemctl list-timers abierto-backup.timer
```

## Additional Resources

- [Cron Wikipedia](https://en.wikipedia.org/wiki/Cron)
- [Linux Crontab Manual](https://linux.die.net/man/5/crontab)
- [Systemd Timer Documentation](https://www.freedesktop.org/software/systemd/man/systemd.timer.html)
- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
