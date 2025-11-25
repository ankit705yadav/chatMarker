# Privacy Practices Certification for ChatMarker

This guide helps you fill out the **Privacy practices** tab in Chrome Web Store Developer Dashboard.

## 📋 Quick Summary

**Version:** 1.0.1
**Permissions:** 6 regular + 10 host permissions
**Data Collected:** Email, Website content, Personal communications
**Remote Code:** No
**Status:** ✅ Form filled and ready for submission

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

#### ✅ Website Content
- [x] **Text, images, sounds, videos, or hyperlinks** (chat names from marked conversations)

#### ✅ Personal Communications
- [x] **Emails, texts, or chat messages** (only the names/titles of chats, NOT actual message content)

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

### I certify that the following disclosures are true:

✅ Check ALL of these boxes (REQUIRED):

- [x] **I do not sell or transfer user data to third parties, outside of the approved use cases**

- [x] **I do not use or transfer user data for purposes that are unrelated to my item's single purpose**

- [x] **I do not use or transfer user data to determine creditworthiness or for lending purposes**

**Note:** You must certify all three disclosures to comply with Developer Program Policies

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

## Section 6: Permission Justifications

### Regular Permissions

**storage**
```
Required to save marked chats, labels, notes, reminders, and user settings locally on the device.
```

**notifications**
```
Required to send reminder notifications when scheduled reminders trigger.
```

**alarms**
```
Required to schedule and trigger reminders at user-specified times.
```

**activeTab**
```
Required to interact with the current chat platform tab when marking chats via context menu.
```

**sidePanel**
```
Required to display the extension's main interface as a side panel in Chrome.
```

**contextMenus**
```
Required to add "Mark This Chat" option to the right-click context menu on supported platforms.
```

---

### Host Permission Justifications

**https://web.whatsapp.com/***
```
Required to detect and mark chats on WhatsApp Web platform.
```

**https://www.messenger.com/*, https://www.facebook.com/***
```
Required to detect and mark chats on Facebook Messenger platform.
```

**https://www.instagram.com/***
```
Required to detect and mark Instagram Direct messages.
```

**https://www.linkedin.com/***
```
Required to detect and mark LinkedIn messages.
```

**https://www.reddit.com/*, https://old.reddit.com/*, https://chat.reddit.com/***
```
Required to detect and mark Reddit chats and messages.
```

**https://*.firebaseapp.com/*, https://*.googleapis.com/***
```
Required for Firebase authentication and Firestore cloud sync functionality to work properly.
```

---

## Section 7: Remote Code

### Are you using remote code?

**Answer:** ❌ **No, I am not using Remote code**

**Justification:** (Leave empty - not applicable)

**Note:** Remote code is any JS or Wasm that is not included in the extension's package. This includes references to external files in `<script>` tags, modules pointing to external files, and strings evaluated through `eval()`. ChatMarker bundles all code locally.

---

## Complete Certification Checklist

Before submitting, verify:

**Single Purpose:**
- [x] Single purpose description written (narrow, easy-to-understand)
- [x] Character count: 205/1000

**Permissions:**
- [x] All 6 regular permissions justified
- [x] All 10 host permissions justified
- [x] No unnecessary permissions requested
- [x] Remote code question answered (No)

**Data Usage:**
- [x] Selected data types: Personally identifiable information, Website content, Personal communications
- [x] Specified purpose for each data type (App functionality, Account management)
- [x] Confirmed data is NOT used for ads
- [x] Confirmed data IS transferred off device (for cloud sync)
- [x] Checked all 3 certification boxes

**Privacy Policy:**
- [ ] Created and hosted privacy policy online (GitHub Pages)
- [ ] Added privacy policy URL to submission form
- [ ] Privacy policy is publicly accessible (test the link)
- [ ] Privacy policy includes your contact information
- [ ] Privacy policy date is current (November 19-20, 2025)

---

## Important Notes

### What Chrome Web Store Reviewers Check:

1. **Single Purpose Compliance**
   - Description must be narrow and easy-to-understand
   - All features must support the stated single purpose
   - No unrelated functionality

2. **Permission Justifications**
   - Each permission must have clear, specific justification
   - Must match actual extension behavior
   - No "future-proofing" permissions
   - Host permissions require in-depth review (may delay publishing)

3. **Data Usage Disclosures**
   - Must select ALL data types collected
   - Must specify exact purpose for each data type
   - Must disclose if data is transferred off device
   - Must confirm data NOT used for ads (if applicable)

4. **Certifications Must Be Accurate**
   - ✅ Don't sell data to third parties
   - ✅ Data used only for single purpose
   - ✅ No creditworthiness/lending use
   - **All 3 certifications required**

5. **Privacy Policy Requirements**
   - Must exist and be publicly accessible
   - Must load without errors (no login required)
   - Must be in English (or your primary language)
   - Must mention all data types declared in form
   - Must explain how each type is used
   - Must mention Firebase/cloud storage
   - Must include contact information

6. **Remote Code**
   - Must be accurate (No = all code bundled)
   - If Yes, must provide detailed justification
   - Violating this causes immediate rejection

---

## Quick Action Items

### ✅ Completed:
1. ✅ Single purpose description written (205 characters)
2. ✅ All 6 regular permissions justified
3. ✅ All 10 host permissions justified
4. ✅ Remote code question answered (No)
5. ✅ Data types selected (3 types)
6. ✅ Data usage purposes specified
7. ✅ All 3 certifications checked
8. ✅ Privacy policy HTML file created (`privacy-policy.html`)

### 🔄 Remaining Actions:

1. **Host Privacy Policy on GitHub Pages:**
   - Create/use existing repository
   - Copy `privacy-policy.html` to repo as `index.html`
   - Enable GitHub Pages in repo settings
   - Get the public URL: `https://username.github.io/repo-name/`
   - Test URL in incognito mode

2. **Update Privacy Policy Placeholders:**
   - Replace `your.email@example.com` with your real email
   - Verify "Last Updated" date is current

3. **Add Privacy Policy URL to Chrome Web Store:**
   - Go to Privacy practices tab
   - Paste GitHub Pages URL in "Privacy policy" field
   - Click Save

4. **Final Verification:**
   - Review all sections one more time
   - Verify privacy policy loads correctly
   - Check all justifications are accurate
   - Submit for review

---

**Status: Ready for final submission! 🎯**

**Next Step:** Host privacy policy and add URL to submission form.

---

## 📝 Form Field Values (Copy-Paste Ready)

### Single Purpose Description
```
ChatMarker allows users to mark, label, organize, and set reminders for important conversations across multiple chat platforms (WhatsApp, Reddit, Instagram, LinkedIn, Messenger) with cloud synchronization.
```

### Permission Justifications

**storage:**
```
Required to save marked chats, labels, notes, reminders, and user settings locally on the device.
```

**notifications:**
```
Required to send reminder notifications when scheduled reminders trigger.
```

**alarms:**
```
Required to schedule and trigger reminders at user-specified times.
```

**activeTab:**
```
Required to interact with the current chat platform tab when marking chats via context menu.
```

**sidePanel:**
```
Required to display the extension's main interface as a side panel in Chrome.
```

**contextMenus:**
```
Required to add "Mark This Chat" option to the right-click context menu on supported platforms.
```

### Host Permission Justification
```
https://web.whatsapp.com/*
Required to detect and mark chats on WhatsApp Web platform.

https://www.messenger.com/*, https://www.facebook.com/*
Required to detect and mark chats on Facebook Messenger platform.

https://www.instagram.com/*
Required to detect and mark Instagram Direct messages.

https://www.linkedin.com/*
Required to detect and mark LinkedIn messages.

https://www.reddit.com/*, https://old.reddit.com/*, https://chat.reddit.com/*
Required to detect and mark Reddit chats and messages.

https://*.firebaseapp.com/*, https://*.googleapis.com/*
Required for Firebase authentication and Firestore cloud sync functionality to work properly.
```

### Remote Code
- **Selection:** ❌ No, I am not using Remote code
- **Justification:** (Leave empty)

### Data Types to Select
- ✅ Personally identifiable information → Email address
- ✅ Website content → Text, images, sounds, videos, or hyperlinks
- ✅ Personal communications → Emails, texts, or chat messages

### Certifications (Check all 3)
- ✅ I do not sell or transfer user data to third parties, outside of the approved use cases
- ✅ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ✅ I do not use or transfer user data to determine creditworthiness or for lending purposes
