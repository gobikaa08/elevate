# ELEVATE Luxury Event Management — Automated Email & Google Sheets Dispatcher

This Google Apps Script automates everything in one place with **zero manual clicks**:
1. **Google Sheets Sync:** Appends every client booking into your sheet in real-time.
2. **Admin Email Alert:** Instantly emails you with all client details.
3. **Client Auto-Response Email:** Instantly emails the client an executive acknowledgment.

---

### Step-by-Step Setup (1 Minute)

1. Open your Google Sheet.
2. Click **Extensions** $\rightarrow$ **Apps Script**.
3. Replace the entire contents of `Code.gs` with the code below:

```javascript
// ==========================================================
// ELEVATE LUXURY EVENT MANAGEMENT — AUTO DISPATCHER
// ==========================================================

// Put your Gmail address here where you want to receive inquiries:
var ADMIN_NOTIFICATION_EMAIL = "YOUR_EMAIL_HERE@gmail.com"; 

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // 1. Append row to Google Sheet
    sheet.appendRow([
      data.id || "",
      data.fullName || "",
      data.email || "",
      data.phone || "",
      data.eventType || "",
      data.eventDate || "",
      data.budgetRange || "",
      data.status || "pending",
      data.createdAt || new Date().toLocaleString(),
      data.message || ""
    ]);

    // 2. AUTOMATIC ADMIN EMAIL NOTIFICATION
    if (ADMIN_NOTIFICATION_EMAIL && ADMIN_NOTIFICATION_EMAIL.includes("@") && ADMIN_NOTIFICATION_EMAIL !== "YOUR_EMAIL_HERE@gmail.com") {
      MailApp.sendEmail({
        to: ADMIN_NOTIFICATION_EMAIL,
        subject: "✨ New VIP Consultation: " + data.fullName + " (" + data.eventType + ")",
        htmlBody: `
          <div style="font-family: Arial, sans-serif; background: #0c0c0c; color: #F8F5EF; padding: 30px; border-radius: 8px;">
            <h2 style="color: #D6B779; margin-top: 0;">New Client Consultation Registered</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 8px 0; color: #A7A7A7; width: 140px;">Client Name:</td><td style="color: #fff; font-weight: bold;">${data.fullName}</td></tr>
              <tr><td style="padding: 8px 0; color: #A7A7A7;">Email Address:</td><td><a href="mailto:${data.email}" style="color: #D6B779;">${data.email}</a></td></tr>
              <tr><td style="padding: 8px 0; color: #A7A7A7;">Phone Number:</td><td style="color: #fff;"><a href="tel:${data.phone}" style="color: #fff;">${data.phone}</a></td></tr>
              <tr><td style="padding: 8px 0; color: #A7A7A7;">Event Category:</td><td style="color: #fff; font-weight: bold;">${data.eventType}</td></tr>
              <tr><td style="padding: 8px 0; color: #A7A7A7;">Estimated Date:</td><td style="color: #fff;">${data.eventDate || "Flexible"}</td></tr>
              <tr><td style="padding: 8px 0; color: #A7A7A7;">Investment Tier:</td><td style="color: #fff;">${data.budgetRange || "Bespoke"}</td></tr>
              <tr><td style="padding: 8px 0; color: #A7A7A7;">Message / Notes:</td><td style="color: #D4D4D4;">${data.message || "None provided"}</td></tr>
              <tr><td style="padding: 8px 0; color: #A7A7A7;">Reference ID:</td><td style="color: #D6B779;"><code>${data.id}</code></td></tr>
            </table>
          </div>
        `
      });
    }

    // 3. AUTOMATIC CLIENT VIP CONFIRMATION EMAIL
    if (data.email && data.email.includes("@")) {
      MailApp.sendEmail({
        to: data.email,
        name: "ELEVATE Events Concierge",
        subject: "Private Consultation Acknowledgment — ELEVATE Events",
        htmlBody: `
          <div style="font-family: Georgia, serif; background: #0c0c0c; color: #F8F5EF; padding: 40px 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #D6B779;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #D6B779; font-size: 26px; letter-spacing: 2px; margin: 0;">ELEVATE</h1>
              <p style="color: #A7A7A7; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin-top: 5px;">Luxury Event Architecture</p>
            </div>
            <p style="font-size: 16px; color: #E5E5E5;">Dear ${data.fullName},</p>
            <p style="font-size: 15px; color: #D4D4D4; line-height: 1.8;">
              Thank you for entrusting ELEVATE with your upcoming <strong>${data.eventType}</strong>. Your bespoke consultation request has been officially registered with our Senior Concierge.
            </p>
            <div style="background: rgba(214, 183, 121, 0.08); border-left: 3px solid #D6B779; padding: 15px 20px; margin: 25px 0;">
              <p style="margin: 0; font-size: 14px; color: #D6B779; font-weight: bold;">Registered Celebration Parameters:</p>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #D4D4D4; line-height: 1.6;">
                &bull; Event: ${data.eventType}<br>
                &bull; Estimated Date: ${data.eventDate || "To be curated"}<br>
                &bull; Investment Tier: ${data.budgetRange || "Bespoke"}<br>
                &bull; Reference ID: ${data.id || "ELE-" + Math.floor(1000 + Math.random() * 9000)}
              </p>
            </div>
            <p style="font-size: 15px; color: #D4D4D4; line-height: 1.8;">
              Our senior creative directors are reviewing your aspirations and preparing preliminary concepts. We will contact you within 24 hours.
            </p>
            <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;">
              ELEVATE EVENTS &bull; 450 Lexington Ave, New York &bull; 12 Berkeley Sq, London<br>
              24/7 International Concierge: +1 (800) 782-9040 | concierge@elevateevents.com
            </p>
          </div>
        `
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

### Step 4: Publish as New Version (Crucial Step!)

In Google Apps Script, editing code does **not** update the live webhook until you deploy a new version:

1. In the Apps Script editor, click the blue **Deploy** button (top right) $\rightarrow$ **Manage deployments**.
2. Click the **Pencil (Edit)** icon next to your active deployment.
3. Under **Version**, click the dropdown and select **"New version"**.
4. Click the blue **Deploy** button at the bottom.
5. If prompted, click **Authorise access** $\rightarrow$ choose your account $\rightarrow$ **Advanced** $\rightarrow$ **Allow**.

You are now completely done!
