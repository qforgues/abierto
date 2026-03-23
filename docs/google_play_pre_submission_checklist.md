# Google Play Pre-Submission Checklist for Abierto v1.4

## Overview
This checklist ensures that the Abierto v1.4 application meets all Google Play Store requirements before submission. Complete each section and verify all items before initiating the submission process.

## 1. Privacy Policy URL

### Requirements
- A privacy policy must be hosted online and publicly accessible
- The policy must be in a language supported by the app
- The policy must clearly explain data collection, usage, and sharing practices
- The policy must be accessible from the app itself (typically via a link in settings or about section)

### Action Items
- [ ] Create a comprehensive privacy policy document
- [ ] Host the privacy policy at: `https://abierto.example.com/privacy-policy`
- [ ] Ensure the policy is accessible from the app's settings or about page
- [ ] Include the following in the privacy policy:
  - [ ] Types of data collected (photos, business information, user location if applicable)
  - [ ] How data is used and stored
  - [ ] Data retention policies
  - [ ] User rights and data deletion procedures
  - [ ] Third-party services and their data handling practices
  - [ ] Contact information for privacy inquiries
- [ ] Test the URL to confirm it's publicly accessible
- [ ] Verify the policy complies with GDPR, CCPA, and other applicable regulations

### Privacy Policy URL
```
https://abierto.example.com/privacy-policy
```

---

## 2. Data Safety Form

### Requirements
- Complete the Data Safety form in Google Play Console
- Provide accurate information about data collection and handling practices
- Declare all data types collected by the app
- Specify data retention periods
- Confirm compliance with Google Play's data safety policies

### Data Types to Declare
- [ ] **Photos/Images**: Uploaded by users for business listings
  - Data retention: Until user deletes or business is removed
  - Shared with: Only visible to app users and business owner
  - Encrypted in transit: Yes (HTTPS)
  - Encrypted at rest: Yes (if applicable)

- [ ] **Business Information**: Business name, code, description
  - Data retention: Until business is deleted
  - Shared with: All app users
  - Encrypted in transit: Yes (HTTPS)
  - Encrypted at rest: Yes (database encryption)

- [ ] **Authentication Data**: JWT tokens, session information
  - Data retention: Token expiry (7 days)
  - Shared with: Not shared with third parties
  - Encrypted in transit: Yes (HTTPS)
  - Encrypted at rest: Yes (httpOnly cookies)

### Action Items
- [ ] Log into Google Play Console
- [ ] Navigate to the app's Data Safety section
- [ ] Complete the Data Safety questionnaire with accurate information
- [ ] Declare all data types collected
- [ ] Specify data retention policies
- [ ] Confirm encryption practices
- [ ] Declare any third-party services that access user data
- [ ] Submit the completed form

---

## 3. Content Rating Questionnaire

### Requirements
- Complete the IARC (International Age Rating Coalition) questionnaire
- Receive a content rating for the app
- Ensure the app content aligns with the assigned rating

### Expected Rating
Abierto v1.4 should receive a rating of **3+** or **4+** as it:
- Does not contain violence, sexual content, or profanity
- Does not target children specifically
- Contains user-generated content (business photos) which may require moderation

### Action Items
- [ ] Access the IARC questionnaire in Google Play Console
- [ ] Answer all questions accurately regarding app content
- [ ] Declare any user-generated content features
- [ ] Specify content moderation practices
- [ ] Submit the questionnaire
- [ ] Receive and document the content rating
- [ ] Ensure the app content complies with the assigned rating

### Content Moderation Considerations
- [ ] Implement a reporting mechanism for inappropriate user-generated content
- [ ] Establish guidelines for acceptable business photos
- [ ] Plan for content review and removal procedures
- [ ] Document moderation policies in the app's terms of service

---

## 4. App Permissions Justification

### Required Permissions

#### Camera Permission
- **Permission Name**: `android.permission.CAMERA`
- **Justification**: Required to allow users to capture photos directly from their device camera for uploading to their business listings
- **Usage**: Photo capture for business profile images
- **Necessity**: Essential for core functionality

#### Storage Permission
- **Permission Name**: `android.permission.READ_EXTERNAL_STORAGE` / `android.permission.WRITE_EXTERNAL_STORAGE`
- **Justification**: Required to access and save uploaded files on the device
- **Usage**: Temporary storage of photos before upload and caching of downloaded images
- **Necessity**: Essential for core functionality

#### Internet Permission
- **Permission Name**: `android.permission.INTERNET`
- **Justification**: Required to communicate with the backend API and upload photos
- **Usage**: API calls, photo uploads, data synchronization
- **Necessity**: Essential for core functionality

#### Network State Permission
- **Permission Name**: `android.permission.ACCESS_NETWORK_STATE`
- **Justification**: Required to check network connectivity before attempting uploads
- **Usage**: Determine if device is connected to internet
- **Necessity**: Improves user experience by preventing failed uploads

### Action Items
- [ ] Document all permissions requested in the app's AndroidManifest.xml
- [ ] Provide clear justification for each permission in the Google Play Console
- [ ] Ensure permissions are only requested when necessary
- [ ] Implement runtime permission requests for Android 6.0+ (API level 23+)
- [ ] Test permission requests on target devices
- [ ] Ensure the app functions gracefully when permissions are denied
- [ ] Update privacy policy to reflect permission usage

### Permission Implementation Checklist
- [ ] Camera permission requested at runtime before camera access
- [ ] Storage permission requested at runtime before file access
- [ ] User can revoke permissions in device settings
- [ ] App handles permission denial gracefully
- [ ] No sensitive data is accessed without explicit permission

---

## 5. Minimum API Level and Target API Level

### API Level Requirements

#### Minimum API Level
- **Level**: 21 (Android 5.0 Lollipop)
- **Rationale**: Provides broad device compatibility while supporting modern Android features
- **Market Coverage**: ~99% of active Android devices
- **Release Date**: November 2014

#### Target API Level
- **Level**: 34 (Android 14) or latest stable version
- **Rationale**: Ensures compliance with Google Play Store requirements and access to latest features
- **Update Frequency**: Update to latest stable version within 3 months of release
- **Current Requirement**: Google Play requires targeting API level 34 or higher (as of 2024)

### Action Items
- [ ] Set `minSdkVersion` to 21 in `build.gradle`
- [ ] Set `targetSdkVersion` to 34 (or latest stable) in `build.gradle`
- [ ] Test the app on devices running Android 5.0 (API 21)
- [ ] Test the app on devices running the target API level
- [ ] Verify all features work correctly across API levels
- [ ] Address any API-level-specific issues or deprecations
- [ ] Update documentation with API level requirements

### Build Configuration Example
```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        minSdkVersion 21
        targetSdkVersion 34
    }
}
```

### Compatibility Testing
- [ ] Test on Android 5.0 (API 21) device or emulator
- [ ] Test on Android 6.0 (API 23) for runtime permissions
- [ ] Test on Android 8.0 (API 26) for background execution limits
- [ ] Test on Android 10 (API 29) for scoped storage
- [ ] Test on Android 12 (API 31) for approximate location
- [ ] Test on Android 14 (API 34) for latest features

---

## 6. App Signing Certificate Management

### Certificate Requirements
- The app must be signed with a valid certificate before submission
- Google Play requires the same certificate for all app updates
- The certificate must be valid for at least 25 years (until October 22, 2033)

### Certificate Management Procedures

#### Creating a Signing Certificate
- [ ] Generate a keystore file using keytool or Android Studio
- [ ] Store the keystore file securely (not in version control)
- [ ] Document the keystore password and key alias
- [ ] Create a backup of the keystore file

#### Keystore File Details
- **File Name**: `abierto-release.keystore`
- **Location**: Secure, encrypted storage (not in Git repository)
- **Backup Location**: Encrypted backup in secure cloud storage
- **Access Control**: Limited to authorized team members only

#### Certificate Information
- [ ] Certificate Common Name (CN): Abierto
- [ ] Organization (O): Abierto Organization
- [ ] Organization Unit (OU): Development
- [ ] Country (C): [Your Country Code]
- [ ] Validity Period: 25+ years

### Action Items
- [ ] Generate the signing certificate using Android Studio or keytool
- [ ] Create a secure backup of the keystore file
- [ ] Store the backup in encrypted cloud storage (AWS S3, Google Cloud Storage, etc.)
- [ ] Document the certificate details and passwords in a secure location
- [ ] Restrict access to the keystore file to authorized team members only
- [ ] Never commit the keystore file to version control
- [ ] Add `*.keystore` to `.gitignore`
- [ ] Create a certificate rotation plan for future updates
- [ ] Test the signing process with a release build

### Security Best Practices
- [ ] Use a strong password for the keystore (minimum 16 characters)
- [ ] Use a strong password for the key alias
- [ ] Store passwords in a secure password manager
- [ ] Limit access to the keystore file
- [ ] Regularly audit access to the keystore
- [ ] Create multiple encrypted backups in different locations
- [ ] Document the certificate expiration date and plan for renewal

### Signing Configuration
```gradle
android {
    signingConfigs {
        release {
            storeFile file('path/to/abierto-release.keystore')
            storePassword System.getenv('KEYSTORE_PASSWORD')
            keyAlias System.getenv('KEY_ALIAS')
            keyPassword System.getenv('KEY_PASSWORD')
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

---

## 7. Required App Assets

### 7.1 App Icon

#### Icon Specifications
- **Format**: PNG with transparency (recommended) or JPEG
- **Color Space**: sRGB
- **Safe Zone**: Keep important content within the center 66 dp × 66 dp area
- **Adaptive Icon**: Provide both foreground and background layers

#### Icon Sizes Required
| Size | DPI | Dimensions | Use Case |
|------|-----|------------|----------|
| 48×48 px | mdpi | 48×48 | Baseline |
| 72×72 px | hdpi | 72×72 | High density |
| 96×96 px | xhdpi | 96×96 | Extra high density |
| 144×144 px | xxhdpi | 144×144 | Extra extra high density |
| 192×192 px | xxxhdpi | 192×192 | Extra extra extra high density |
| 512×512 px | - | 512×512 | Google Play Store listing |

#### Action Items
- [ ] Design the app icon with clear branding
- [ ] Create icon in all required sizes
- [ ] Ensure icon is recognizable at small sizes
- [ ] Test icon appearance on various devices
- [ ] Create adaptive icon with foreground and background layers
- [ ] Place icons in `res/mipmap-*` directories
- [ ] Upload 512×512 px icon to Google Play Console

#### Icon Design Guidelines
- [ ] Use simple, recognizable design
- [ ] Avoid text in the icon (except logo)
- [ ] Ensure good contrast for visibility
- [ ] Test on both light and dark backgrounds
- [ ] Maintain consistent branding across all sizes

### 7.2 Feature Graphic

#### Feature Graphic Specifications
- **Dimensions**: 1024×500 px
- **Format**: PNG or JPEG
- **Color Space**: sRGB
- **File Size**: Maximum 15 MB
- **Purpose**: Displayed at the top of the app's Google Play Store listing

#### Design Guidelines
- [ ] Include app name and key features
- [ ] Use high-quality, professional design
- [ ] Ensure text is readable at small sizes
- [ ] Maintain consistent branding
- [ ] Avoid cluttered design
- [ ] Include call-to-action if appropriate

#### Action Items
- [ ] Design the feature graphic
- [ ] Ensure dimensions are exactly 1024×500 px
- [ ] Save in PNG or JPEG format
- [ ] Test appearance on Google Play Console preview
- [ ] Upload to Google Play Console

### 7.3 Screenshots

#### Screenshot Specifications
- **Minimum**: 2 screenshots required
- **Maximum**: 8 screenshots recommended
- **Dimensions**: 
  - Phone: 1080×1920 px (9:16 aspect ratio)
  - Tablet: 1440×2560 px (9:16 aspect ratio) or 2560×1440 px (16:9 aspect ratio)
- **Format**: PNG or JPEG
- **File Size**: Maximum 8 MB per screenshot

#### Screenshot Content
- [ ] Screenshot 1: Main app interface / home screen
- [ ] Screenshot 2: Business creation flow
- [ ] Screenshot 3: Photo upload feature
- [ ] Screenshot 4: Business listing view
- [ ] Screenshot 5: Search/browse functionality
- [ ] Screenshot 6: User profile or settings
- [ ] Screenshot 7: Key feature demonstration
- [ ] Screenshot 8: Call-to-action or benefits

#### Action Items
- [ ] Capture screenshots on actual devices or high-quality emulators
- [ ] Ensure screenshots show key features and user flows
- [ ] Add text overlays to highlight important features (optional)
- [ ] Use consistent styling across all screenshots
- [ ] Test screenshots on Google Play Console preview
- [ ] Upload screenshots for both phone and tablet (if applicable)

#### Screenshot Best Practices
- [ ] Show real app content, not mock-ups
- [ ] Highlight key features and benefits
- [ ] Use clear, readable text
- [ ] Maintain consistent branding
- [ ] Avoid sensitive user data in screenshots
- [ ] Test on various screen sizes

### 7.4 Short Description

#### Short Description Specifications
- **Character Limit**: 80 characters (including spaces)
- **Purpose**: Displayed under the app name in search results
- **Language**: Match the app's primary language

#### Example Short Description
```
Create and manage your business listings with photos and details.
```

#### Action Items
- [ ] Write a concise, compelling short description
- [ ] Ensure it's under 80 characters
- [ ] Include key benefit or feature
- [ ] Avoid special characters or emojis
- [ ] Test readability in search results
- [ ] Enter in Google Play Console

#### Short Description Guidelines
- [ ] Clearly state the app's primary purpose
- [ ] Highlight the main benefit
- [ ] Use action-oriented language
- [ ] Avoid marketing jargon
- [ ] Make it memorable and unique

### 7.5 Full Description

#### Full Description Specifications
- **Character Limit**: 4000 characters (including spaces)
- **Purpose**: Displayed on the app's Google Play Store listing page
- **Language**: Match the app's primary language
- **Formatting**: Plain text with line breaks

#### Example Full Description
```
Abierto is a simple and intuitive app for creating and managing business listings.

Key Features:
• Create business profiles with photos and descriptions
• Upload multiple photos for each business
• Browse and search business listings
• Secure authentication with business codes
• Offline access to saved listings

How to Use:
1. Create a new business with a unique business code
2. Set a secure password for your business
3. Upload photos and add business details
4. Share your business code with others
5. Manage your listings from anywhere

Privacy & Security:
• Your data is encrypted in transit and at rest
• Photos are stored securely on our servers
• You control who can access your business information
• We never share your data with third parties

Support:
For questions or issues, contact us at support@abierto.example.com

Privacy Policy: https://abierto.example.com/privacy-policy
Terms of Service: https://abierto.example.com/terms
```

#### Action Items
- [ ] Write a comprehensive full description
- [ ] Ensure it's under 4000 characters
- [ ] Include key features and benefits
- [ ] Explain how to use the app
- [ ] Include privacy and security information
- [ ] Provide support contact information
- [ ] Include links to privacy policy and terms of service
- [ ] Test formatting and readability
- [ ] Enter in Google Play Console

#### Full Description Guidelines
- [ ] Start with a compelling hook
- [ ] List key features with bullet points
- [ ] Explain the user journey
- [ ] Highlight unique selling points
- [ ] Address privacy and security concerns
- [ ] Include clear call-to-action
- [ ] Provide support information
- [ ] Use clear, simple language
- [ ] Avoid excessive marketing language

### 7.6 Support Email

#### Support Email Specifications
- **Format**: Valid email address
- **Accessibility**: Must be monitored and responsive
- **Response Time**: Aim for 24-48 hour response time
- **Purpose**: Users can contact support for issues or questions

#### Action Items
- [ ] Set up a dedicated support email address
- [ ] Example: `support@abierto.example.com`
- [ ] Configure email forwarding or mailbox
- [ ] Set up automated response template
- [ ] Establish support response procedures
- [ ] Document support process
- [ ] Enter in Google Play Console
- [ ] Test email delivery

#### Support Email Best Practices
- [ ] Use a professional email address
- [ ] Monitor email regularly
- [ ] Respond to inquiries promptly
- [ ] Keep records of support interactions
- [ ] Use feedback to improve the app
- [ ] Provide helpful and courteous responses

---

## 8. Additional Compliance Requirements

### 8.1 Terms of Service
- [ ] Create a comprehensive terms of service document
- [ ] Host at: `https://abierto.example.com/terms`
- [ ] Include:
  - [ ] User responsibilities
  - [ ] Acceptable use policy
  - [ ] Limitation of liability
  - [ ] Dispute resolution
  - [ ] Changes to terms

### 8.2 Content Policy Compliance
- [ ] Ensure app complies with Google Play's content policies
- [ ] No prohibited content (violence, hate speech, etc.)
- [ ] No deceptive practices
- [ ] No malware or security threats
- [ ] Proper handling of user-generated content

### 8.3 Intellectual Property
- [ ] Ensure all assets are original or properly licensed
- [ ] Document all third-party licenses
- [ ] Include attribution where required
- [ ] Verify no trademark infringement

### 8.4 Testing and Quality Assurance
- [ ] Perform comprehensive testing on target devices
- [ ] Test on minimum API level (21) and target API level (34)
- [ ] Verify all features work correctly
- [ ] Test permission requests and handling
- [ ] Test error handling and edge cases
- [ ] Verify app stability and performance
- [ ] Test on various screen sizes and orientations

---

## 9. Pre-Submission Checklist

### Final Verification
- [ ] Privacy policy is complete and accessible
- [ ] Data Safety form is completed and submitted
- [ ] Content Rating Questionnaire is completed
- [ ] All permissions are justified and documented
- [ ] Minimum API level is set to 21
- [ ] Target API level is set to 34 or latest
- [ ] App signing certificate is created and backed up
- [ ] App icon is created in all required sizes
- [ ] Feature graphic is created (1024×500 px)
- [ ] Screenshots are captured for phone and tablet
- [ ] Short description is written (under 80 characters)
- [ ] Full description is written (under 4000 characters)
- [ ] Support email is set up and monitored
- [ ] Terms of Service are created and hosted
- [ ] Content policy compliance is verified
- [ ] Intellectual property is verified
- [ ] Comprehensive testing is completed
- [ ] App is signed with release certificate
- [ ] APK/AAB is generated and tested
- [ ] All assets are uploaded to Google Play Console
- [ ] Pricing and distribution settings are configured
- [ ] Release notes are prepared

---

## 10. Submission Process

### Step-by-Step Submission
1. [ ] Log into Google Play Console
2. [ ] Select the Abierto app
3. [ ] Navigate to "Release" → "Production"
4. [ ] Upload the signed APK or AAB file
5. [ ] Review app details and assets
6. [ ] Verify all required information is complete
7. [ ] Review content rating and data safety
8. [ ] Set pricing and distribution
9. [ ] Review and accept Google Play policies
10. [ ] Submit for review
11. [ ] Monitor review status and respond to any issues
12. [ ] Once approved, schedule release date

### Post-Submission
- [ ] Monitor app reviews and ratings
- [ ] Respond to user feedback and issues
- [ ] Plan for updates and improvements
- [ ] Monitor crash reports and performance metrics
- [ ] Maintain compliance with Google Play policies

---

## 11. Resources and References

### Google Play Documentation
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Content Rating Guidelines](https://support.google.com/googleplay/android-developer/answer/188189)
- [Data Safety Form Guide](https://support.google.com/googleplay/android-developer/answer/10787469)
- [App Signing Documentation](https://support.google.com/googleplay/android-developer/answer/7384423)

### Android Development Resources
- [Android Developers Documentation](https://developer.android.com/)
- [Android API Reference](https://developer.android.com/reference)
- [Android Security & Privacy](https://developer.android.com/privacy-and-security)

### Design Resources
- [Material Design Guidelines](https://material.io/design)
- [Android Design Guidelines](https://developer.android.com/design)

---

## 12. Contact and Support

### Support Email
```
support@abierto.example.com
```

### Project Contact
```
project-lead@abierto.example.com
```

### Google Play Support
```
https://support.google.com/googleplay/android-developer
```

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|----------|
| 1.0 | 2024-01-XX | Team | Initial checklist creation |
| 1.1 | 2024-02-XX | Team | Added API level requirements |
| 1.2 | 2024-03-XX | Team | Updated asset specifications |

---

**Last Updated**: 2024-03-23
**Status**: Ready for Implementation
**Next Review**: Before app submission to Google Play Store
