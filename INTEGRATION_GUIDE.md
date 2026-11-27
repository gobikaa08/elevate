# ELEVATE Luxury Event Management — Firebase Deployment & Integrations Guide

**Firebase Project:** `elevate-fd71a`  
**Authorized Agency Admin UID:** `dZUgNFj1Eibu96JwFXEDiWCS1XA2`  
**Database:** Cloud Firestore (`event_enquiries`, `mail`)

---

## 1. Local Testing & Verification

1. Start a local server:
   ```powershell
   cd c:\Users\DELL\OneDrive\Desktop\ELEVATE
   .\run-elevate-events.bat
   ```
2. **Customer Booking Form:**
   - Open [http://localhost:8000/contact.html](http://localhost:8000/contact.html).
   - Fill in the form and submit.
   - You will see the luxury confirmation message: *"Consultation Request Confirmed"* with an auto-generated Firestore Reference ID.
3. **Admin Dashboard:**
   - Open [http://localhost:8000/admin.html](http://localhost:8000/admin.html).
   - Sign in with your admin account email and password.
   - The dashboard will verify your UID (`dZUgNFj1Eibu96JwFXEDiWCS1XA2`).
   - You will immediately see all live inquiries in the real-time data table!
   - You can update workflow statuses (`In Review`, `Contacted`, `Confirmed`, `Archived`), view client dossiers, save internal agency notes, and export all data to CSV/Excel in one click.

---

## 2. Deploying Firestore Security Rules & Hosting

Run the following commands from the project directory:

```bash
# 1. Login to Firebase CLI (if not already logged in)
firebase login

# 2. Deploy Cloud Firestore Security Rules (locks access strictly to your Admin UID)
firebase deploy --only firestore:rules

# 3. Deploy the Website to Firebase Hosting
firebase deploy --only hosting
```

Your live website will be accessible at:
- **Public Site:** `https://elevate-fd71a.web.app`
- **Admin Dashboard:** `https://elevate-fd71a.web.app/admin.html`

---

## 3. Automatic Email Notifications to Admin

Whenever a customer submits a consultation request, the website automatically creates an email dispatch record in the `mail` collection in Cloud Firestore.

To automatically forward these records to your admin email address:

### Recommended: Firebase "Trigger Email" Extension
1. Go to the [Firebase Console Extensions Page](https://console.firebase.google.com/project/elevate-fd71a/extensions).
2. Click **Install Extension** and select **"Trigger Email from Firestore"** (by Firebase).
3. In the configuration:
   - **Email documents collection:** Set to `mail` (already configured in the website code).
   - **Default FROM address:** e.g. `concierge@elevateevents.com` or your Gmail address.
   - **SMTP connection URI:** Your email provider's SMTP (e.g. Gmail App Password, SendGrid, or Resend).
4. Click **Install**.
5. All future submissions will automatically land in your admin email inbox within seconds!

---

## 4. Google Sheets Integration (When Ready)

If you decide to connect a Google Sheet later, you can do it in 2 minutes:

1. Create a new Google Sheet at [sheets.new](https://sheets.new).
2. Name row 1 columns:  
   `Inquiry ID | Client Name | Email | Phone | Event Category | Date | Budget | Status | Message`
3. Click **Extensions > Apps Script** in Google Sheets.
4. Paste the following automated sync function:

```javascript
function syncElevateInquiries() {
  const firestoreUrl = "https://firestore.googleapis.com/v1/projects/elevate-fd71a/databases/(default)/documents/event_enquiries";
  const response = UrlFetchApp.fetch(firestoreUrl);
  const data = JSON.parse(response.getContentText());
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  if (data.documents) {
    data.documents.forEach(doc => {
      const f = doc.fields;
      sheet.appendRow([
        doc.name.split("/").pop(),
        f.fullName?.stringValue || "",
        f.email?.stringValue || "",
        f.phone?.stringValue || "",
        f.eventType?.stringValue || "",
        f.eventDate?.stringValue || "",
        f.budgetRange?.stringValue || "",
        f.status?.stringValue || "pending",
        f.message?.stringValue || ""
      ]);
    });
  }
}
```
5. Click **Triggers** (clock icon) > **Add Trigger** > Run `syncElevateInquiries` every hour or on edit.

*Alternatively, you can click the **"Export to CSV / Excel"** button in your Admin Dashboard anytime for an instant offline spreadsheet.*
