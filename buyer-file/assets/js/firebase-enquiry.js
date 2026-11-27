// ==========================================================
// ELEVATE LUXURY EVENT MANAGEMENT — BOOKING & ENQUIRY HANDLER
// Real-time Cloud Firestore persistence, Client Auto-Response
// & Google Sheets synchronization.
// ==========================================================

import { db, GOOGLE_SHEETS_WEBHOOK_URL } from "./firebase-config.js";
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Signal that Firebase enquiry service is active
window.__elevateFirebaseReady = true;

document.addEventListener("DOMContentLoaded", function () {
  const enquiryForm = document.getElementById("elevateEnquiryForm");
  const successBox = document.getElementById("elevateSuccessBox");

  if (!enquiryForm) return;

  // Track button original content
  const submitBtn = enquiryForm.querySelector("button[type='submit']");
  const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "Submit Consultation Request";

  enquiryForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nameInput = document.getElementById("fullName");
    const emailInput = document.getElementById("emailAddress");
    const phoneInput = document.getElementById("phoneNumber");
    const eventTypeInput = document.getElementById("eventType");
    const eventDateInput = document.getElementById("eventDate");
    const budgetRangeInput = document.getElementById("budgetRange");
    const messageInput = document.getElementById("eventMessage");

    let isValid = true;
    let firstErrorField = null;

    function setError(field, condition) {
      if (!field) return;
      if (condition) {
        field.style.borderColor = "#ff4d4f";
        isValid = false;
        if (!firstErrorField) firstErrorField = field;
      } else {
        field.style.borderColor = "rgba(214, 183, 121, 0.4)";
      }
    }

    // Input Validation
    setError(nameInput, !nameInput || nameInput.value.trim().length < 2);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setError(emailInput, !emailInput || !emailRegex.test(emailInput.value.trim()));
    setError(phoneInput, !phoneInput || phoneInput.value.trim().length < 6);
    setError(eventTypeInput, !eventTypeInput || eventTypeInput.value === "");

    if (!isValid) {
      if (firstErrorField) firstErrorField.focus();
      return;
    }

    // Enter loading state on button
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = "0.75";
      submitBtn.innerHTML = `
        <div class="btn_inner">
          <div class="btn_icon">
            <span><i class="fa-solid fa-spinner fa-spin"></i></span>
          </div>
          <div class="btn_text">
            <span>Registering Consultation...</span>
          </div>
        </div>
      `;
    }

    // Prepare payload
    const enquiryData = {
      fullName: nameInput.value.trim(),
      email: emailInput.value.trim().toLowerCase(),
      phone: phoneInput.value.trim(),
      eventType: eventTypeInput.value,
      eventDate: eventDateInput ? eventDateInput.value : "",
      budgetRange: budgetRangeInput ? budgetRangeInput.value : "",
      message: messageInput ? messageInput.value.trim() : "",
      status: "pending",
      createdAt: serverTimestamp(),
      source: "website_contact_form",
      clientPlatform: navigator.userAgent
    };

    try {
      // 1. Persist to Firestore collection: event_enquiries
      const docRef = await addDoc(collection(db, "event_enquiries"), enquiryData);
      console.log("ELEVATE: Consultation enquiry registered with ID:", docRef.id);

      // ==========================================================
      // AUTOMATION 1: ADMIN EMAIL NOTIFICATION (Mail collection)
      // ==========================================================
      try {
        await addDoc(collection(db, "mail"), {
          to: ["admin@elevateevents.com"],
          message: {
            subject: `✨ New VIP Consultation Request: ${enquiryData.fullName} (${enquiryData.eventType})`,
            html: `
              <div style="font-family: Arial, sans-serif; background: #0c0c0c; color: #F8F5EF; padding: 30px; border-radius: 8px;">
                <h2 style="color: #D6B779; margin-bottom: 20px;">New Consultation Request Received</h2>
                <p>A new VIP consultation request has been submitted on the ELEVATE website:</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                  <tr><td style="padding: 8px 0; color: #A7A7A7;">Client Name:</td><td style="color: #fff; font-weight: bold;">${escapeHtml(enquiryData.fullName)}</td></tr>
                  <tr><td style="padding: 8px 0; color: #A7A7A7;">Email Address:</td><td style="color: #D6B779;"><a href="mailto:${escapeHtml(enquiryData.email)}" style="color: #D6B779;">${escapeHtml(enquiryData.email)}</a></td></tr>
                  <tr><td style="padding: 8px 0; color: #A7A7A7;">Phone:</td><td style="color: #fff;">${escapeHtml(enquiryData.phone)}</td></tr>
                  <tr><td style="padding: 8px 0; color: #A7A7A7;">Event Category:</td><td style="color: #fff; font-weight: bold;">${escapeHtml(enquiryData.eventType)}</td></tr>
                  <tr><td style="padding: 8px 0; color: #A7A7A7;">Estimated Date:</td><td style="color: #fff;">${escapeHtml(enquiryData.eventDate || "Flexible")}</td></tr>
                  <tr><td style="padding: 8px 0; color: #A7A7A7;">Investment Tier:</td><td style="color: #fff;">${escapeHtml(enquiryData.budgetRange || "Not Specified")}</td></tr>
                  <tr><td style="padding: 8px 0; color: #A7A7A7;">Details / Notes:</td><td style="color: #D4D4D4;">${escapeHtml(enquiryData.message || "None provided")}</td></tr>
                </table>
                <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid rgba(214,183,121,0.2);">
                  <p style="font-size: 13px; color: #A7A7A7;">View and update this inquiry in the <a href="https://elevate-fd71a.firebaseapp.com/admin.html" style="color: #D6B779;">ELEVATE Admin Dashboard</a>.</p>
                </div>
              </div>
            `
          }
        });
      } catch (mailErr) {
        console.warn("ELEVATE: Admin notification queue notice:", mailErr);
      }

      // ==========================================================
      // AUTOMATION 1 (CONT.): INSTANT CLIENT LUXURY AUTO-ACKNOWLEDGMENT
      // ==========================================================
      try {
        await addDoc(collection(db, "mail"), {
          to: [enquiryData.email],
          message: {
            subject: `Private Consultation Acknowledgment — ELEVATE Events`,
            html: `
              <div style="font-family: 'Georgia', serif; background: #0c0c0c; color: #F8F5EF; padding: 40px 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #D6B779;">
                <div style="text-align: center; margin-bottom: 25px;">
                  <h1 style="color: #D6B779; font-size: 26px; letter-spacing: 2px; margin: 0;">ELEVATE</h1>
                  <p style="color: #A7A7A7; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 5px;">Luxury Event Architecture</p>
                </div>
                <p style="font-size: 16px; line-height: 1.7; color: #E5E5E5;">Dear ${escapeHtml(enquiryData.fullName)},</p>
                <p style="font-size: 15px; line-height: 1.8; color: #D4D4D4;">
                  Thank you for entrusting ELEVATE with your upcoming <strong>${escapeHtml(enquiryData.eventType)}</strong>. Your private consultation request has been officially received by our Senior Producers.
                </p>
                <div style="background: rgba(214, 183, 121, 0.08); border-left: 3px solid #D6B779; padding: 15px 20px; margin: 25px 0;">
                  <p style="margin: 0; font-size: 14px; color: #D6B779; font-weight: bold;">Registered Celebration Parameters:</p>
                  <p style="margin: 6px 0 0 0; font-size: 13px; color: #D4D4D4; line-height: 1.6;">
                    &bull; Category: ${escapeHtml(enquiryData.eventType)}<br>
                    &bull; Target Date: ${escapeHtml(enquiryData.eventDate || "To be finalized")}<br>
                    &bull; Investment Tier: ${escapeHtml(enquiryData.budgetRange || "Bespoke")}<br>
                    &bull; Reference ID: ${docRef.id}
                  </p>
                </div>
                <p style="font-size: 15px; line-height: 1.8; color: #D4D4D4;">
                  Our senior creative directors are reviewing your aspirations and preparing preliminary concepts. We will reach out to you within 24 hours.
                </p>
                <p style="font-size: 12px; line-height: 1.6; color: #777; text-align: center; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;">
                  ELEVATE EVENTS &bull; 450 Lexington Ave, New York &bull; 12 Berkeley Sq, London<br>
                  24/7 International Concierge: +1 (800) 782-9040 | concierge@elevateevents.com
                </p>
              </div>
            `
          }
        });
      } catch (clientMailErr) {
        console.warn("ELEVATE: Client auto-response notice:", clientMailErr);
      }

      // ==========================================================
      // AUTOMATION 3: REAL-TIME GOOGLE SHEETS & EMAIL AUTO-SYNC
      // ==========================================================
      const sheetsUrl = GOOGLE_SHEETS_WEBHOOK_URL || localStorage.getItem("elevate_sheets_webhook");
      if (sheetsUrl && sheetsUrl.startsWith("http")) {
        try {
          fetch(sheetsUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              id: docRef.id,
              fullName: enquiryData.fullName,
              email: enquiryData.email,
              phone: enquiryData.phone,
              eventType: enquiryData.eventType,
              eventDate: enquiryData.eventDate || "Flexible",
              budgetRange: enquiryData.budgetRange || "Bespoke",
              message: enquiryData.message || "",
              status: enquiryData.status,
              createdAt: new Date().toISOString()
            })
          }).then(() => {
            console.log("ELEVATE: Auto-synced lead to Google Sheets");
          }).catch(err => {
            console.warn("ELEVATE: Google Sheets sync notice:", err);
          });
        } catch (sheetErr) {
          console.warn("ELEVATE: Google Sheets dispatch notice:", sheetErr);
        }
      }

      // ==========================================================
      // LUXURY CONFIRMATION FEEDBACK IN SUCCESS BOX
      // ==========================================================
      if (successBox) {
        successBox.style.display = "block";
        successBox.innerHTML = `
          <div style="background: rgba(214, 183, 121, 0.12); border: 1px solid #D6B779; border-radius: 14px; padding: 32px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <i class="fa-solid fa-crown" style="font-size: 34px; color: #D6B779; margin-bottom: 14px; display: inline-block;"></i>
            <h4 style="color: #F8F5EF; font-family: 'Playfair Display', serif; font-size: 24px; margin-bottom: 10px;">Consultation Request Confirmed</h4>
            <p style="color: #D4D4D4; font-size: 15px; margin: 0 0 12px 0; line-height: 1.7;">
              Thank you, <strong>${escapeHtml(enquiryData.fullName)}</strong>. Your bespoke consultation request for a <strong>${escapeHtml(enquiryData.eventType)}</strong> has been securely logged with our Senior Concierge.
            </p>
            <p style="color: #A7A7A7; font-size: 13px; margin: 0;">
              Reference ID: <code style="color: #D6B779; background: rgba(0,0,0,0.4); padding: 3px 10px; border-radius: 4px;">${docRef.id}</code> &bull; Our executive producers will review your aspirations and contact you directly within 24 hours.
            </p>
          </div>
        `;
        successBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      // Reset form fields
      enquiryForm.reset();

    } catch (error) {
      console.error("ELEVATE: Error saving enquiry to Firestore:", error);
      if (successBox) {
        successBox.style.display = "block";
        const isPermissionDenied = error && (error.code === "permission-denied" || (error.message && error.message.includes("permission")));
        
        if (isPermissionDenied) {
          successBox.innerHTML = `
            <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid #ffc107; border-radius: 12px; padding: 22px; text-align: center;">
              <i class="fa-solid fa-shield-halved" style="font-size: 28px; color: #ffc107; margin-bottom: 10px;"></i>
              <h5 style="color: #fff; margin-bottom: 6px;">Firestore Security Rules Required</h5>
              <p style="color: #D4D4D4; font-size: 14px; margin: 0 0 10px 0;">
                Your Cloud Firestore database is in Production Mode. Please publish the security rules in your Firebase Console to enable customer consultation bookings.
              </p>
              <div style="font-size: 12px; color: #A7A7A7; background: rgba(0,0,0,0.4); padding: 8px 12px; border-radius: 6px; display: inline-block;">
                Firebase Console &rarr; Firestore Database &rarr; Rules &rarr; Paste firestore.rules &rarr; Publish
              </div>
            </div>
          `;
        } else {
          successBox.innerHTML = `
            <div style="background: rgba(255, 77, 79, 0.1); border: 1px solid #ff4d4f; border-radius: 12px; padding: 20px; text-align: center;">
              <i class="fa-solid fa-triangle-exclamation" style="font-size: 26px; color: #ff4d4f; margin-bottom: 10px;"></i>
              <h5 style="color: #fff; margin-bottom: 6px;">Consultation Service Momentarily Unavailable</h5>
              <p style="color: #D4D4D4; font-size: 14px; margin: 0;">
                We apologize. Please contact our 24/7 International Concierge directly at <a href="tel:+18007829040" style="color: #D6B779; font-weight: bold;">+1 (800) 782-9040</a> or <a href="mailto:concierge@elevateevents.com" style="color: #D6B779; font-weight: bold;">concierge@elevateevents.com</a>.
              </p>
              ${error ? `<p style="font-size: 11px; color: #ff9999; margin-top: 8px; margin-bottom: 0;">Notice: ${escapeHtml(error.code || error.message)}</p>` : ''}
            </div>
          `;
        }
        successBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } finally {
      // Restore submit button state
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  });
});

// Helper sanitization function
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
