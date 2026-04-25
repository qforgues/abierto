# Abierto v1.4

Abierto is a web application designed to facilitate the creation and management of businesses with photo uploads. This version includes support for Android deployment via Trusted Web Activity (TWA).

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Development](#development)
- [Deployment](#deployment)
- [Android TWA Build and Release Process](#android-twa-build-and-release-process)
- [Contributing](#contributing)
- [License](#license)

## Overview

Abierto v1.4 is designed to facilitate the deployment of the existing Abierto web app to the Google Play Store using a Trusted Web Activity (TWA) approach. The application consists of a React frontend and an Express backend, with existing PWA components.

## Tech Stack

- **Frontend:** React.js
- **Backend:** Express.js
- **Database:** SQLite (with backup plan for PostgreSQL)
- **Deployment Platform:** Render.com or Railway.app
- **Mobile Framework:** Trusted Web Activity (TWA) using Bubblewrap
- **Authentication:** JSON Web Tokens (JWT) stored in httpOnly cookies

## Installation

### Prerequisites

- Node.js (v16.0.0 or higher)
- npm (v7.0.0 or higher)
- Git

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/abierto.git
   cd abierto
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   NODE_ENV=development
   PORT=5000
   DATABASE_URL=sqlite:./data/abierto.db
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRY=7d
   GUEST_CODE_EXPIRY=7d
   ```

4. Initialize the database:
   ```bash
   npm run db:init
   ```

## Development

### Running the Application Locally

1. Start the development server:
   ```bash
   npm run dev
   ```

2. The application will be available at `http://localhost:5000`

### Environment Variables

- `NODE_ENV`: Set to `development`, `staging`, or `production`
- `PORT`: Server port (default: 5000)
- `DATABASE_URL`: SQLite database path
- `JWT_SECRET`: Secret key for JWT signing
- `JWT_EXPIRY`: JWT token expiry duration (default: 7d)
- `GUEST_CODE_EXPIRY`: Guest code expiry duration (default: 7d)
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds (default: 900000 = 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window (default: 5)

## Deployment

### Deploying to Render or Railway

1. Create an account on [Render.com](https://render.com) or [Railway.app](https://railway.app)

2. Connect your GitHub repository

3. Set the following environment variables in your deployment platform:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `DATABASE_URL=sqlite:./data/abierto.db`
   - `JWT_SECRET=your_production_jwt_secret`
   - `JWT_EXPIRY=7d`
   - `GUEST_CODE_EXPIRY=7d`

4. Ensure the SQLite database is mounted on a persistent volume

5. Deploy the application

### Health Check

The application includes a health check endpoint at `/api/health` that returns the application status.

## Android TWA Build and Release Process

### Prerequisites

Before building the Android app, ensure you have the following installed:

- **Node.js:** v16.0.0 or higher
- **npm:** v7.0.0 or higher
- **Android SDK:** API level 21 or higher
- **Java Development Kit (JDK):** Version 11 or higher
- **Android Studio:** (recommended for emulator and device testing)

### Step 1: Install Bubblewrap

Bubblewrap is a tool that helps create Trusted Web Activity (TWA) projects for Android.

```bash
npm install -g @bubblewrap/cli
```

Verify the installation:
```bash
bubblewrap --version
```

### Step 2: Initialize the TWA Project

Create a new TWA project using Bubblewrap:

```bash
bubblewrap init --manifest=https://abierto.example.com/manifest.json
```

This command will prompt you to enter configuration details. Use the following values:

- **Package Name:** `com.abierto.app`
- **App Name:** `Abierto`
- **App Short Name:** `Abierto`
- **Start URL:** `https://abierto.example.com`
- **Icon URL:** `https://abierto.example.com/icon.png`
- **Display Mode:** `standalone`
- **Theme Color:** `#FFFFFF`
- **Background Color:** `#FFFFFF`

### Step 3: Configure the TWA

After initialization, a `bubblewrap.config.json` file will be created. Verify the following configuration:

```json
{
  "packageName": "com.abierto.app",
  "name": "Abierto",
  "shortName": "Abierto",
  "startUrl": "https://abierto.example.com",
  "icon": "https://abierto.example.com/icon.png",
  "displayMode": "standalone",
  "themeColor": "#FFFFFF",
  "backgroundColor": "#FFFFFF"
}
```

### Step 4: Generate the Signing Certificate

Generate a signing certificate for your app:

```bash
keytool -genkey -v -keystore abierto-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias abierto-key
```

This will prompt you to enter details about your certificate. Store the keystore file securely.

### Step 5: Generate the SHA-256 Fingerprint

Generate the SHA-256 fingerprint of your signing certificate:

```bash
keytool -list -v -keystore abierto-release-key.jks -alias abierto-key
```

Copy the SHA-256 fingerprint value. It will look like:
```
AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88
```

### Step 6: Update the Digital Asset Links File

Update the `android/app/src/main/assets/assetlinks.json` file with your actual SHA-256 fingerprint:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.abierto.app",
      "sha256_cert_fingerprints": [
        "YOUR_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

Replace `YOUR_SHA256_FINGERPRINT_HERE` with the actual SHA-256 fingerprint from Step 5.

### Step 7: Deploy the Asset Links File

Host the `assetlinks.json` file at `https://abierto.example.com/.well-known/assetlinks.json`.

To do this:

1. Copy the `assetlinks.json` file to your web server's `.well-known` directory
2. Ensure the file is accessible via HTTPS
3. Verify accessibility by visiting the URL in a web browser

Example using Express.js:

```javascript
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, 'android/app/src/main/assets/assetlinks.json'));
});
```

### Step 8: Build the Android App

Build the release APK/AAB:

```bash
bubblewrap build
```

You will be prompted to provide the keystore file path and password. Use the keystore created in Step 4.

The build process will generate:
- `app-release.aab` (Android App Bundle for Google Play Store)
- `app-release.apk` (APK for direct installation)

### Step 9: Test the App

1. Install the APK on an Android device:
   ```bash
   adb install app-release.apk
   ```

2. Launch the app and verify:
   - The app launches without showing the browser chrome (address bar)
   - The back button navigates correctly within the app
   - All functionality works as expected

### Step 10: Submit to Google Play Store

1. Create a Google Play Developer account
2. Create a new app listing
3. Upload the `app-release.aab` file
4. Fill in the required metadata (screenshots, description, privacy policy, etc.)
5. Submit for review

### Troubleshooting

#### Asset Links Not Working

If the TWA shows the browser chrome, the asset links file may not be properly configured:

1. Verify the SHA-256 fingerprint is correct
2. Ensure the `assetlinks.json` file is accessible at `https://abierto.example.com/.well-known/assetlinks.json`
3. Check that the package name matches exactly: `com.abierto.app`
4. Wait up to 24 hours for Google's cache to update

#### Build Failures

If the build fails:

1. Ensure Android SDK is properly installed
2. Check that the manifest URL is accessible
3. Verify all configuration values in `bubblewrap.config.json`
4. Run `bubblewrap validate` to check for configuration issues

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
