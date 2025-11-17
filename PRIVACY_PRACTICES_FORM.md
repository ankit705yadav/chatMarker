# Privacy Practices Certification for ChatMarker

This guide helps you fill out the **Privacy practices** tab in Chrome Web Store Developer Dashboard.

---

## Section 1: Data Usage

### Does this item collect or transmit user data?
**Answer:** ✅ **Yes**

---

## Section 2: Data Collection Details

### What user data does this item handle?

Select the following types:

#### ✅ Personally Identifiable Information
- [x] **Email address**

#### ✅ User Activity
- [x] **Website content** (chat names from marked conversations)

#### ✅ Personal Communications
- [x] **Text messages** (only the names/titles of chats, NOT actual message content)

---

## Section 3: Data Usage Purpose

### How is the user data being used?

For **each type of data** selected above, specify the use:

#### Email Address
**Purpose:**
- [x] **Account management** - User authentication and sign-in

**Is this data used for serving ads?**
- [ ] No

**Is this data transferred off the user's device?**
- [x] **Yes** - To Firebase Authentication servers for user sign-in

---

#### Website Content (Chat Names)
**Purpose:**
- [x] **App functionality** - Core feature to mark and organize chats
- [x] **Personalization** - To display user's marked chats

**Is this data used for serving ads?**
- [ ] No

**Is this data transferred off the user's device?**
- [x] **Yes** - To Firebase Firestore for cloud sync across devices

---

#### Personal Communications (Chat Titles/Names)
**Purpose:**
- [x] **App functionality** - Core feature to mark and organize chats
- [x] **Personalization** - To display user's organized chats

**Is this data used for serving ads?**
- [ ] No

**Is this data transferred off the user's device?**
- [x] **Yes** - To Firebase Firestore for cloud sync across devices

---

## Section 4: Data Handling Certification

### Certify the following:

✅ Check ALL of these boxes:

- [x] **This item only collects user data that is required for the functionality or services it provides**

- [x] **This item does not sell user data to third parties**

- [x] **This item does not use or transfer user data for purposes unrelated to the item's core functionality**

- [x] **This item does not use or transfer user data to determine creditworthiness or for lending purposes**

---

## Section 5: Privacy Policy

### Privacy Policy URL
**Required:** Yes

You need to host a privacy policy online. Here are your options:

#### Option 1: GitHub Pages (Recommended - Free)
1. Create a new repository or use existing one
2. Create file: `privacy-policy.html`
3. Enable GitHub Pages in repository settings
4. URL will be: `https://yourusername.github.io/repository-name/privacy-policy.html`

#### Option 2: Google Docs
1. Create a Google Doc with privacy policy
2. Click Share → Change to "Anyone with the link"
3. Use the public link

#### Option 3: Your Own Website
Host the privacy policy on your own domain.

---

## Privacy Policy Template

Use this template and host it online:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChatMarker Privacy Policy</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1 { color: #6366F1; }
        h2 { color: #4338CA; margin-top: 30px; }
        .last-updated { color: #666; font-style: italic; }
        .section { margin-bottom: 30px; }
    </style>
</head>
<body>
    <h1>ChatMarker Privacy Policy</h1>
    <p class="last-updated">Last Updated: November 18, 2025</p>

    <div class="section">
        <h2>1. Introduction</h2>
        <p>ChatMarker ("we", "our", or "the extension") is a Chrome extension that helps you organize important conversations across multiple chat platforms. This Privacy Policy explains how we collect, use, and protect your data.</p>
    </div>

    <div class="section">
        <h2>2. Information We Collect</h2>
        <p>ChatMarker collects and stores the following information:</p>
        <ul>
            <li><strong>Email Address:</strong> Used for authentication and account management</li>
            <li><strong>Chat Names/Titles:</strong> Names of chats you choose to mark (e.g., "John Doe", "Marketing Team")</li>
            <li><strong>Labels and Notes:</strong> Custom labels and notes you add to marked chats</li>
            <li><strong>Reminder Times:</strong> Date and time settings for reminders you create</li>
            <li><strong>Platform Information:</strong> Which platform a chat is from (WhatsApp, Reddit, etc.)</li>
            <li><strong>Sync Timestamps:</strong> When data was last synced to the cloud</li>
        </ul>
        <p><strong>What We Don't Collect:</strong></p>
        <ul>
            <li>We do NOT read or store your actual chat messages or message content</li>
            <li>We do NOT collect your browsing history</li>
            <li>We do NOT collect personal information beyond your email</li>
            <li>We do NOT track your activity outside of the extension</li>
        </ul>
    </div>

    <div class="section">
        <h2>3. How We Use Your Information</h2>
        <ul>
            <li><strong>Authentication:</strong> Your email address is used to sign you in via Firebase Authentication</li>
            <li><strong>Core Functionality:</strong> Chat names, labels, notes, and reminders are stored to provide the extension's organizational features</li>
            <li><strong>Cloud Sync:</strong> All data is synced to Firebase Firestore (Google Cloud) so you can access it from multiple devices</li>
            <li><strong>Notifications:</strong> Reminder times are used to send you notifications at the times you specify</li>
        </ul>
    </div>

    <div class="section">
        <h2>4. Data Storage and Security</h2>
        <ul>
            <li>All data is stored securely using <strong>Firebase</strong> (Google Cloud Platform)</li>
            <li>Data is <strong>encrypted in transit</strong> using HTTPS/TLS</li>
            <li>Data is <strong>encrypted at rest</strong> in Firebase Firestore</li>
            <li>Only you can access your data using your email and password</li>
            <li>We use industry-standard security practices to protect your information</li>
        </ul>
    </div>

    <div class="section">
        <h2>5. Data Sharing and Third Parties</h2>
        <p><strong>We do NOT:</strong></p>
        <ul>
            <li>Sell your data to third parties</li>
            <li>Share your data with advertisers</li>
            <li>Use your data for marketing purposes</li>
            <li>Use your data for purposes unrelated to the extension's functionality</li>
            <li>Track your activity for analytics or profiling</li>
        </ul>
        <p><strong>Third-Party Services We Use:</strong></p>
        <ul>
            <li><strong>Firebase (Google):</strong> For authentication and cloud storage. Firebase's privacy policy applies to their services: <a href="https://firebase.google.com/support/privacy">https://firebase.google.com/support/privacy</a></li>
        </ul>
    </div>

    <div class="section">
        <h2>6. Data Retention</h2>
        <ul>
            <li>Your data is stored as long as you have an account</li>
            <li>You can delete individual marked chats, notes, or reminders at any time</li>
            <li>You can export all your data from the extension settings</li>
            <li>When you sign out and delete the extension, your local data is removed</li>
            <li>Cloud data remains in Firebase until you request deletion</li>
        </ul>
    </div>

    <div class="section">
        <h2>7. Your Rights and Choices</h2>
        <p>You have the right to:</p>
        <ul>
            <li><strong>Access:</strong> View all your stored data in the extension</li>
            <li><strong>Export:</strong> Download your data as JSON from extension settings</li>
            <li><strong>Delete:</strong> Remove individual items or clear all data</li>
            <li><strong>Opt-Out:</strong> Use the extension without signing in (local storage only, no cloud sync)</li>
            <li><strong>Account Deletion:</strong> Request complete account and data deletion by contacting us</li>
        </ul>
    </div>

    <div class="section">
        <h2>8. Children's Privacy</h2>
        <p>ChatMarker is not intended for use by children under 13 years of age. We do not knowingly collect information from children under 13.</p>
    </div>

    <div class="section">
        <h2>9. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify users of any material changes by:</p>
        <ul>
            <li>Updating the "Last Updated" date at the top of this policy</li>
            <li>Posting a notice in the extension (for significant changes)</li>
        </ul>
        <p>Continued use of the extension after changes constitutes acceptance of the updated policy.</p>
    </div>

    <div class="section">
        <h2>10. Contact Us</h2>
        <p>If you have questions about this Privacy Policy or your data:</p>
        <ul>
            <li><strong>Email:</strong> [Your Email Address]</li>
            <li><strong>GitHub:</strong> [Your GitHub Repository URL]/issues</li>
        </ul>
    </div>

    <div class="section">
        <h2>11. Developer Information</h2>
        <p>ChatMarker is developed and maintained by [Your Name/Organization Name]</p>
    </div>

    <div class="section">
        <h2>12. Compliance</h2>
        <p>This extension complies with:</p>
        <ul>
            <li>Chrome Web Store Developer Program Policies</li>
            <li>Google API Services User Data Policy</li>
            <li>General Data Protection Regulation (GDPR) principles</li>
        </ul>
    </div>

    <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;">
    <p style="text-align: center; color: #666; font-size: 14px;">
        &copy; 2025 ChatMarker. All rights reserved.
    </p>
</body>
</html>
```

---

## Section 6: Justification for Sensitive Permissions

If asked to justify specific permissions:

### Storage Permission
```
Required to save marked chats, labels, notes, reminders, and user preferences locally on the device for offline access and faster performance.
```

### Host Permissions (for chat platforms)
```
Required to detect chat elements on supported platforms (WhatsApp, Reddit, Instagram, LinkedIn, Messenger) and inject context menu options. No data is collected from these sites except chat names that users explicitly choose to mark.
```

### Firebase/Google APIs
```
Required for user authentication (Firebase Auth) and cloud synchronization (Firestore). All data transmission uses encrypted connections and is limited to user's own marked chats, labels, notes, and reminders.
```

---

## Complete Certification Checklist

Before submitting, verify:

- [ ] Selected all data types collected (Email, Website content, Personal communications)
- [ ] Specified purpose for each data type (App functionality, Account management)
- [ ] Confirmed data is NOT used for ads
- [ ] Confirmed data IS transferred off device (for cloud sync)
- [ ] Checked all 4 certification boxes
- [ ] Created and hosted privacy policy online
- [ ] Added privacy policy URL to submission form
- [ ] Privacy policy is publicly accessible (test the link)
- [ ] Privacy policy includes your contact information
- [ ] Privacy policy date is current

---

## Important Notes

### What Chrome Web Store Reviewers Check:

1. **Privacy policy exists and is accessible**
   - Must load without errors
   - Must be in English (or your primary language)
   - Must be publicly accessible (no login required)

2. **Privacy policy matches declared data usage**
   - Must mention all data types you selected
   - Must explain how each type is used
   - Must be specific about Firebase/cloud storage

3. **Certifications are accurate**
   - Don't sell data ✓
   - Data used only for core functionality ✓
   - No advertising use ✓

4. **Permissions are justified**
   - Each permission must have valid reason
   - Must match actual extension behavior

---

## Quick Action Items

1. **Copy the privacy policy HTML template above**
2. **Replace placeholders:**
   - `[Your Email Address]`
   - `[Your GitHub Repository URL]`
   - `[Your Name/Organization Name]`
3. **Host it online** (GitHub Pages recommended)
4. **Get the public URL**
5. **Test the URL** in incognito mode
6. **Enter URL in Privacy practices tab**
7. **Select all data types** as listed above
8. **Check all certification boxes**
9. **Save and continue**

---

**You're ready to certify! 🎯**
