# Abierto v1.4 - Web App with Android TWA Deployment

Abierto is a web application designed to facilitate business creation and photo uploads, with support for deployment to the Google Play Store using Trusted Web Activity (TWA).

## Table of Contents

- [Overview](#overview)
- [Technical Architecture](#technical-architecture)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Backup Strategy](#backup-strategy)
- [Security](#security)
- [Contributing](#contributing)

## Overview

Abierto v1.4 is designed to facilitate the deployment of the existing Abierto web app to the Google Play Store using a Trusted Web Activity (TWA) approach. The application consists of a React frontend and an Express backend, with existing PWA components.

### Key Features

- Business creation with secure owner authentication
- Photo upload and management
- Guest access with time-limited codes
- Automated database backups with S3 integration
- Rate limiting and abuse protection
- Digital Asset Links for TWA verification
- Health check endpoint for monitoring

## Technical Architecture

- **Frontend:** React.js
- **Backend:** Express.js
- **Database:** SQLite (with backup plan for PostgreSQL)
- **Deployment Platform:** Render.com or Railway.app
- **Mobile Framework:** Trusted Web Activity (TWA) using Bubblewrap
- **Authentication:** JSON Web Tokens (JWT) stored in httpOnly cookies
- **Backup Storage:** AWS S3
- **Digital Asset Links:** Configuration for domain verification

### Environment Configuration

#### Local Development
- API base URL: `http://localhost:5000/api`
- Database: SQLite at `/backend/db/database.sqlite`

#### Staging
- API base URL: `https://staging.abierto.example.com/api`

#### Production
- API base URL: `https://abierto.example.com/api`
- Android app configured to point to production domain

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- SQLite3
- AWS CLI (for backup operations)
- Docker (for deployment)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/abierto.git
   cd abierto
   ```

2. Install dependencies:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   cd backend && npm install && cd ..
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Initialize the database:
   ```bash
   npm run db:init
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

### Docker Deployment

The application includes a Dockerfile for containerized deployment:

```bash
docker build -t abierto:latest .
docker run -p 5000:5000 -v abierto-db:/backend/db abierto:latest
```

### Render.com Deployment

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set the build command: `npm install && npm run build`
4. Set the start command: `npm start`
5. Add environment variables in the Render dashboard
6. Ensure persistent disk is mounted at `/backend/db` for SQLite

### Railway.app Deployment

1. Connect your GitHub repository to Railway
2. Create a new project
3. Add environment variables
4. Configure persistent volume for `/backend/db`
5. Deploy

## Backup Strategy

### Automated Backups

The application includes an automated backup strategy for the SQLite database using AWS S3.

### Backup Script

The backup script is located at `/scripts/backup.sh` and performs the following:

1. Creates a backup of the SQLite database
2. Verifies the backup file exists and is not empty
3. Uploads the backup to AWS S3
4. Verifies the S3 upload by checking file existence and size match
5. Applies retention policy (keeps last 30 backups)
6. Cleans up local backup files

### Configuration

Set the following environment variables to configure backups:

```bash
# Database path (default: /backend/db/database.sqlite)
DB_PATH=/backend/db/database.sqlite

# Local backup directory (default: /tmp/backups)
BACKUP_DIR=/tmp/backups

# AWS S3 bucket name
S3_BUCKET=your-bucket-name

# S3 prefix/folder (default: backups)
S3_PREFIX=backups

# Number of backups to retain (default: 30)
RETENTION_COUNT=30

# Log file location (default: /var/log/abierto-backup.log)
LOG_FILE=/var/log/abierto-backup.log
```

### AWS S3 Setup

1. Create an S3 bucket:
   ```bash
   aws s3 mb s3://your-bucket-name
   ```

2. Create an IAM user with S3 access:
   ```bash
   aws iam create-user --user-name abierto-backup
   aws iam attach-user-policy --user-name abierto-backup --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
   ```

3. Generate access keys:
   ```bash
   aws iam create-access-key --user-name abierto-backup
   ```

4. Configure AWS CLI:
   ```bash
   aws configure
   # Enter your access key ID and secret access key
   ```

### Cron Job Setup

To set up the nightly backup, add the following line to your crontab:

```bash
0 2 * * * /path/to/scripts/backup.sh
```

This will run the backup script every day at 2 AM.

#### Setting up Cron on Linux/macOS

1. Open crontab editor:
   ```bash
   crontab -e
   ```

2. Add the backup job:
   ```bash
   0 2 * * * /path/to/scripts/backup.sh >> /var/log/abierto-backup-cron.log 2>&1
   ```

3. Save and exit (Ctrl+X, then Y, then Enter in nano)

4. Verify the cron job:
   ```bash
   crontab -l
   ```

#### Setting up Cron on Docker/Render/Railway

For containerized deployments, use a cron service or scheduled job:

**Option 1: Using a separate cron container**

Create a `docker-compose.yml` with a dedicated cron service:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    volumes:
      - abierto-db:/backend/db
    environment:
      - DB_PATH=/backend/db/database.sqlite
      - S3_BUCKET=your-bucket-name

  cron:
    build: .
    command: /bin/bash -c "while true; do /scripts/backup.sh; sleep 86400; done"
    volumes:
      - abierto-db:/backend/db
      - ./scripts:/scripts
    environment:
      - DB_PATH=/backend/db/database.sqlite
      - S3_BUCKET=your-bucket-name

volumes:
  abierto-db:
```

**Option 2: Using Render Cron Jobs**

Render supports background jobs. Create a `render.yaml` file:

```yaml
services:
  - type: web
    name: abierto
    plan: standard
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: DB_PATH
        value: /backend/db/database.sqlite
      - key: S3_BUCKET
        value: your-bucket-name

  - type: cron
    name: abierto-backup
    schedule: "0 2 * * *"
    command: /scripts/backup.sh
```

### Backup Verification

To verify that backups are working correctly:

1. Check the backup log:
   ```bash
   tail -f /var/log/abierto-backup.log
   ```

2. List backups in S3:
   ```bash
   aws s3 ls s3://your-bucket-name/backups/
   ```

3. Download and verify a backup:
   ```bash
   aws s3 cp s3://your-bucket-name/backups/database_TIMESTAMP.sqlite ./test-backup.sqlite
   sqlite3 test-backup.sqlite ".tables"
   ```

### Restore Procedure

To restore from a backup:

1. Download the backup from S3:
   ```bash
   aws s3 cp s3://your-bucket-name/backups/database_TIMESTAMP.sqlite ./database.sqlite
   ```

2. Stop the application:
   ```bash
   docker stop abierto
   ```

3. Replace the database:
   ```bash
   cp ./database.sqlite /backend/db/database.sqlite
   ```

4. Restart the application:
   ```bash
   docker start abierto
   ```

5. Verify the restore:
   ```bash
   curl http://localhost:5000/api/health
   ```

## Security

### Authentication

- Owner authentication uses `business_code + password`
- Passwords are hashed using bcrypt
- JWT tokens are stored in httpOnly cookies
- Token expiry: 7 days
- Guest codes expire 7 days from creation

### Rate Limiting

- Login attempts are rate-limited to prevent brute force attacks
- Default: 5 attempts per 15 minutes per IP
- Configurable via environment variables

### Abuse Protection

- Photo upload size limits
- Request rate limiting
- CORS configuration
- Input validation and sanitization

### Digital Asset Links

For TWA deployment, configure Digital Asset Links at `https://abierto.example.com/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.example.abierto",
      "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
    }
  }
]
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue on GitHub or contact the development team.
