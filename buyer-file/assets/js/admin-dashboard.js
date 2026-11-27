// ==========================================================
// ELEVATE LUXURY EVENT MANAGEMENT — ADMIN DASHBOARD CONTROLLER
// Real-time synchronization, Firebase Auth gate & Lead Manager
// ==========================================================

import { auth, db, ADMIN_UID, GOOGLE_SHEETS_WEBHOOK_URL } from "./firebase-config.js";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// State
let allInquiries = [];
let unsubscribeFirestore = null;
let currentSelectedDocId = null;
let initialLoadComplete = false;

// DOM Elements
const authContainer = document.getElementById("authContainer");
const dashboardContainer = document.getElementById("dashboardContainer");
const loginForm = document.getElementById("adminLoginForm");
const loginErrorBox = document.getElementById("loginErrorBox");
const adminEmailInput = document.getElementById("adminEmail");
const adminPasswordInput = document.getElementById("adminPassword");
const adminSignInBtn = document.getElementById("adminSignInBtn");
const adminSignOutBtn = document.getElementById("adminSignOutBtn");
const adminUserEmailDisplay = document.getElementById("adminUserEmail");
const togglePasswordBtn = document.getElementById("togglePasswordBtn");

// Filter & Table DOM Elements
const inquiriesTableBody = document.getElementById("inquiriesTableBody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const categoryFilter = document.getElementById("categoryFilter");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const refreshDataBtn = document.getElementById("refreshDataBtn");

// Stat elements
const statTotal = document.getElementById("statTotal");
const statPending = document.getElementById("statPending");
const statInReview = document.getElementById("statInReview");
const statConfirmed = document.getElementById("statConfirmed");

// Modal Elements
const inquiryModal = new bootstrap.Modal(document.getElementById("inquiryModal"));
const modalClientName = document.getElementById("modalClientName");
const modalEventCategory = document.getElementById("modalEventCategory");
const modalClientEmail = document.getElementById("modalClientEmail");
const modalClientPhone = document.getElementById("modalClientPhone");
const modalEventDate = document.getElementById("modalEventDate");
const modalBudget = document.getElementById("modalBudget");
const modalMessage = document.getElementById("modalMessage");
const modalAdminNotes = document.getElementById("modalAdminNotes");
const modalMailtoBtn = document.getElementById("modalMailtoBtn");
const modalTelBtn = document.getElementById("modalTelBtn");
const modalSaveNotesBtn = document.getElementById("modalSaveNotesBtn");

// ==========================================================
// 1. AUTHENTICATION STATE OBSERVER
// ==========================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Verify authorized Admin UID
    if (user.uid !== ADMIN_UID) {
      console.warn("Unauthorized attempt by UID:", user.uid);
      showLoginError(`Access Denied: Your account (${user.email || user.uid}) is not authorized to access this private agency portal.`);
      signOut(auth);
      return;
    }

    // Authorization Verified
    authContainer.classList.add("d-none");
    dashboardContainer.classList.remove("d-none");
    if (adminUserEmailDisplay) adminUserEmailDisplay.textContent = user.email || "Master Administrator";

    // Start Real-Time Firestore Sync
    startFirestoreSync();
  } else {
    // Show login screen
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }
    allInquiries = [];
    initialLoadComplete = false;
    authContainer.classList.remove("d-none");
    dashboardContainer.classList.add("d-none");
  }
});

// ==========================================================
// 2. SIGN IN & SIGN OUT ACTIONS
// ==========================================================
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideLoginError();

    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value;

    adminSignInBtn.disabled = true;
    adminSignInBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Verifying Credentials...';

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in UID:", userCredential.user.uid);
      if (userCredential.user.uid !== ADMIN_UID) {
        showLoginError(`Access Denied: UID mismatch. Only the pre-configured agency owner account can access.`);
        await signOut(auth);
      }
    } catch (error) {
      console.error("Sign in failed:", error);
      let msg = "Invalid administrative credentials. Please verify your email and password.";
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        msg = "Invalid email or password combination.";
      } else if (error.code === "auth/too-many-requests") {
        msg = "Too many failed attempts. Account temporarily locked for security. Please try again later.";
      }
      showLoginError(msg);
    } finally {
      adminSignInBtn.disabled = false;
      adminSignInBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket me-2"></i> Authenticate & Enter Portal';
    }
  });
}

if (adminSignOutBtn) {
  adminSignOutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  });
}

// Password Reveal Toggle
if (togglePasswordBtn && adminPasswordInput) {
  togglePasswordBtn.addEventListener("click", () => {
    const isPass = adminPasswordInput.type === "password";
    adminPasswordInput.type = isPass ? "text" : "password";
    togglePasswordBtn.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
  });
}

function showLoginError(msg) {
  if (loginErrorBox) {
    loginErrorBox.textContent = msg;
    loginErrorBox.classList.remove("d-none");
  }
}

function hideLoginError() {
  if (loginErrorBox) {
    loginErrorBox.classList.add("d-none");
    loginErrorBox.textContent = "";
  }
}

// ==========================================================
// 3. REAL-TIME FIRESTORE SYNCHRONIZATION
// ==========================================================
function startFirestoreSync() {
  try {
    const q = query(collection(db, "event_enquiries"), orderBy("createdAt", "desc"));

    unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      const previousCount = allInquiries.length;
      allInquiries = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        allInquiries.push({
          id: docSnap.id,
          ...data
        });
      });

      // Browser chime / alert on new live booking
      if (initialLoadComplete && allInquiries.length > previousCount) {
        notifyNewBooking(allInquiries[0]);
      }
      initialLoadComplete = true;

      updateMetricCards();
      renderFilteredInquiries();
    }, (error) => {
      console.error("Firestore listener error:", error);
      inquiriesTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-danger">
            <i class="fa-solid fa-triangle-exclamation mb-2" style="font-size: 24px;"></i>
            <p>Error connecting to Cloud Firestore. Please ensure firestore.rules grant access to UID: ${ADMIN_UID}</p>
            <p class="text-muted small">${error.message}</p>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error("Failed to setup listener:", err);
  }
}

// ==========================================================
// 4. METRIC CARDS CALCULATION
// ==========================================================
function updateMetricCards() {
  const total = allInquiries.length;
  const pending = allInquiries.filter(i => (i.status || "pending") === "pending").length;
  const inReview = allInquiries.filter(i => i.status === "in_review" || i.status === "contacted").length;
  const confirmed = allInquiries.filter(i => i.status === "confirmed").length;

  if (statTotal) statTotal.textContent = total;
  if (statPending) statPending.textContent = pending;
  if (statInReview) statInReview.textContent = inReview;
  if (statConfirmed) statConfirmed.textContent = confirmed;
}

// ==========================================================
// 5. TABLE RENDERING & FILTERING
// ==========================================================
function renderFilteredInquiries() {
  const searchTerm = (searchInput ? searchInput.value : "").trim().toLowerCase();
  const selectedStatus = statusFilter ? statusFilter.value : "ALL";
  const selectedCategory = categoryFilter ? categoryFilter.value : "ALL";

  const filtered = allInquiries.filter((item) => {
    // Status match
    const currentStatus = item.status || "pending";
    if (selectedStatus !== "ALL" && currentStatus !== selectedStatus) return false;

    // Category match
    if (selectedCategory !== "ALL" && item.eventType !== selectedCategory) return false;

    // Search term match
    if (searchTerm) {
      const matchName = (item.fullName || "").toLowerCase().includes(searchTerm);
      const matchEmail = (item.email || "").toLowerCase().includes(searchTerm);
      const matchPhone = (item.phone || "").toLowerCase().includes(searchTerm);
      const matchMessage = (item.message || "").toLowerCase().includes(searchTerm);
      if (!matchName && !matchEmail && !matchPhone && !matchMessage) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    inquiriesTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5 text-muted">
          <i class="fa-regular fa-folder-open mb-2" style="font-size: 28px; color: var(--gold-primary);"></i>
          <p class="mb-0">No consultation records match the selected filters.</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = "";
  filtered.forEach((item) => {
    const status = item.status || "pending";
    const dateStr = item.createdAt && item.createdAt.toDate 
      ? item.createdAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "Just now";

    html += `
      <tr data-id="${item.id}">
        <td>
          <div style="font-weight: 600; color: #fff; font-size: 15px;">${escapeHtml(item.fullName)}</div>
          <div class="d-flex align-items-center gap-2 mt-1">
            <a href="mailto:${escapeHtml(item.email)}" style="color: var(--gold-primary); font-size: 12px; text-decoration: none;">
              <i class="fa-solid fa-envelope me-1"></i>${escapeHtml(item.email)}
            </a>
            <span style="color: rgba(255,255,255,0.2);">&bull;</span>
            <a href="tel:${escapeHtml(item.phone)}" style="color: var(--text-muted); font-size: 12px; text-decoration: none;">
              <i class="fa-solid fa-phone me-1"></i>${escapeHtml(item.phone)}
            </a>
          </div>
        </td>
        <td>
          <span class="badge" style="background: rgba(214, 183, 121, 0.12); color: var(--gold-primary); border: 1px solid var(--border-subtle); font-size: 12px;">
            ${escapeHtml(item.eventType || "Event")}
          </span>
        </td>
        <td style="color: #ddd;">
          ${escapeHtml(item.eventDate || "Flexible")}
        </td>
        <td>
          <span style="font-weight: 600; color: #fff; font-size: 13px;">${escapeHtml(item.budgetRange || "Standard")}</span>
        </td>
        <td>
          <select class="form-select form-select-sm status-dropdown" data-id="${item.id}" style="width: auto; background: #161616; color: #fff; border-color: var(--border-subtle); font-size: 12px; border-radius: 6px;">
            <option value="pending" ${status === "pending" ? "selected" : ""}>Pending</option>
            <option value="in_review" ${status === "in_review" ? "selected" : ""}>In Review</option>
            <option value="contacted" ${status === "contacted" ? "selected" : ""}>Contacted</option>
            <option value="confirmed" ${status === "confirmed" ? "selected" : ""}>Confirmed</option>
            <option value="archived" ${status === "archived" ? "selected" : ""}>Archived</option>
          </select>
        </td>
        <td style="color: var(--text-muted); font-size: 12px;">
          ${dateStr}
        </td>
        <td style="text-align: right;">
          <div class="d-inline-flex gap-1">
            <button class="btn btn-outline-gold btn-sm view-dossier-btn" data-id="${item.id}" title="View Dossier">
              <i class="fa-solid fa-eye"></i> Dossier
            </button>
            <button class="btn btn-outline-danger btn-sm delete-inquiry-btn" data-id="${item.id}" title="Delete Record">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  inquiriesTableBody.innerHTML = html;

  // Attach event listeners to dynamic elements
  attachTableEventListeners();
}

// Table listeners for dynamic rows
function attachTableEventListeners() {
  // Status dropdown change
  document.querySelectorAll(".status-dropdown").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const docId = e.target.getAttribute("data-id");
      const newStatus = e.target.value;
      try {
        await updateDoc(doc(db, "event_enquiries", docId), {
          status: newStatus,
          updatedAt: serverTimestamp()
        });
        console.log(`Updated status for ${docId} to ${newStatus}`);
      } catch (err) {
        console.error("Error updating status:", err);
        alert("Failed to update status: " + err.message);
      }
    });
  });

  // View Dossier modal trigger
  document.querySelectorAll(".view-dossier-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const docId = btn.getAttribute("data-id");
      openDossierModal(docId);
    });
  });

  // Delete button
  document.querySelectorAll(".delete-inquiry-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const docId = btn.getAttribute("data-id");
      if (confirm("Are you sure you wish to delete this consultation inquiry from the database? This action cannot be undone.")) {
        try {
          await deleteDoc(doc(db, "event_enquiries", docId));
          console.log("Deleted inquiry:", docId);
        } catch (err) {
          console.error("Error deleting inquiry:", err);
          alert("Failed to delete: " + err.message);
        }
      }
    });
  });
}

// Open and populate Dossier modal
function openDossierModal(docId) {
  const inquiry = allInquiries.find(i => i.id === docId);
  if (!inquiry) return;

  currentSelectedDocId = docId;
  modalClientName.textContent = inquiry.fullName || "Client Dossier";
  modalEventCategory.textContent = inquiry.eventType || "Event Consultation";
  modalClientEmail.textContent = inquiry.email || "N/A";
  modalClientPhone.textContent = inquiry.phone || "N/A";
  modalEventDate.textContent = inquiry.eventDate || "Flexible / Not Stated";
  modalBudget.textContent = inquiry.budgetRange || "Not Specified";
  modalMessage.textContent = inquiry.message || "No special requests or message provided by client.";
  modalAdminNotes.value = inquiry.adminNotes || "";

  modalMailtoBtn.href = `mailto:${inquiry.email}?subject=${encodeURIComponent("ELEVATE Events — Consultation Regarding Your " + (inquiry.eventType || "Event"))}`;
  modalTelBtn.href = `tel:${inquiry.phone}`;

  inquiryModal.show();
}

// Save Admin Notes from modal
if (modalSaveNotesBtn) {
  modalSaveNotesBtn.addEventListener("click", async () => {
    if (!currentSelectedDocId) return;
    const notes = modalAdminNotes.value.trim();
    modalSaveNotesBtn.disabled = true;
    modalSaveNotesBtn.textContent = "Saving...";

    try {
      await updateDoc(doc(db, "event_enquiries", currentSelectedDocId), {
        adminNotes: notes,
        updatedAt: serverTimestamp()
      });
      inquiryModal.hide();
    } catch (err) {
      console.error("Error saving notes:", err);
      alert("Error saving notes: " + err.message);
    } finally {
      modalSaveNotesBtn.disabled = false;
      modalSaveNotesBtn.textContent = "Save Internal Notes";
    }
  });
}

// ==========================================================
// 6. SEARCH & FILTER TRIGGERS
// ==========================================================
if (searchInput) searchInput.addEventListener("input", renderFilteredInquiries);
if (statusFilter) statusFilter.addEventListener("change", renderFilteredInquiries);
if (categoryFilter) categoryFilter.addEventListener("change", renderFilteredInquiries);
if (refreshDataBtn) refreshDataBtn.addEventListener("click", () => renderFilteredInquiries());

// ==========================================================
// 7. EXPORT TO CSV / EXCEL SPREADSHEET
// ==========================================================
if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", () => {
    if (allInquiries.length === 0) {
      alert("No inquiry records available to export.");
      return;
    }

    const headers = [
      "Inquiry ID",
      "Client Name",
      "Email Address",
      "Telephone",
      "Event Category",
      "Estimated Event Date",
      "Investment Tier",
      "Workflow Status",
      "Submission Date",
      "Client Aspirations & Message",
      "Internal Admin Notes"
    ];

    const rows = allInquiries.map((item) => {
      const dateStr = item.createdAt && item.createdAt.toDate 
        ? item.createdAt.toDate().toISOString()
        : "";

      return [
        `"${item.id}"`,
        `"${escapeCsv(item.fullName)}"`,
        `"${escapeCsv(item.email)}"`,
        `"${escapeCsv(item.phone)}"`,
        `"${escapeCsv(item.eventType)}"`,
        `"${escapeCsv(item.eventDate)}"`,
        `"${escapeCsv(item.budgetRange)}"`,
        `"${escapeCsv(item.status || 'pending')}"`,
        `"${escapeCsv(dateStr)}"`,
        `"${escapeCsv(item.message)}"`,
        `"${escapeCsv(item.adminNotes || '')}"`
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `elevate_client_inquiries_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// ==========================================================
// 8. BROWSER SOUND / DESKTOP NOTIFICATION
// ==========================================================
function notifyNewBooking(inquiry) {
  // Try Web Audio chime
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  } catch (e) {
    // Audio context not allowed or blocked
  }

  // Native notification
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("✨ New ELEVATE Event Consultation", {
      body: `${inquiry.fullName} requested a consultation for ${inquiry.eventType}.`,
      icon: "assets/img/favicon.svg"
    });
  }
}

// Desktop notification permission requester
const toggleNotificationBtn = document.getElementById("toggleNotificationBtn");
if (toggleNotificationBtn) {
  toggleNotificationBtn.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    const statusText = document.getElementById("notifStatusText");
    if (permission === "granted") {
      if (statusText) statusText.textContent = "Alerts Active";
      toggleNotificationBtn.classList.remove("btn-outline-gold");
      toggleNotificationBtn.classList.add("btn-gold");
    } else {
      if (statusText) statusText.textContent = "Alerts Blocked";
    }
  });
}

// ==========================================================
// 9. AUTOMATIONS SETTINGS MODAL (Google Sheets Sync)
// ==========================================================
const settingsModalEl = document.getElementById("settingsModal");
const settingsModal = settingsModalEl ? new bootstrap.Modal(settingsModalEl) : null;
const openSettingsBtn = document.getElementById("openSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const settingSheetsUrl = document.getElementById("settingSheetsUrl");
const settingsSaveAlert = document.getElementById("settingsSaveAlert");

if (openSettingsBtn && settingsModal) {
  openSettingsBtn.addEventListener("click", () => {
    if (settingSheetsUrl) settingSheetsUrl.value = localStorage.getItem("elevate_sheets_webhook") || GOOGLE_SHEETS_WEBHOOK_URL;
    if (settingsSaveAlert) settingsSaveAlert.classList.add("d-none");
    settingsModal.show();
  });
}

if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener("click", () => {
    const sheetsUrl = settingSheetsUrl ? settingSheetsUrl.value.trim() : "";

    if (sheetsUrl) localStorage.setItem("elevate_sheets_webhook", sheetsUrl);
    else localStorage.removeItem("elevate_sheets_webhook");

    if (settingsSaveAlert) settingsSaveAlert.classList.remove("d-none");
    setTimeout(() => {
      if (settingsModal) settingsModal.hide();
    }, 1200);
  });
}

// ==========================================================
// 10. 1-CLICK QUICK RESPONSE EMAIL TEMPLATES IN DOSSIER
// ==========================================================
const quickReplyLookbook = document.getElementById("quickReplyLookbook");
const quickReplyCorporate = document.getElementById("quickReplyCorporate");

function getActiveInquiry() {
  return allInquiries.find(i => i.id === currentSelectedDocId);
}

if (quickReplyLookbook) {
  quickReplyLookbook.addEventListener("click", () => {
    const inq = getActiveInquiry();
    if (!inq) return;
    const subject = encodeURIComponent(`ELEVATE Events — Signature Lookbook & Consultation for Your ${inq.eventType || "Celebration"}`);
    const body = encodeURIComponent(
`Dear ${inq.fullName},

Thank you for your inquiry regarding your upcoming ${inq.eventType || "celebration"}.

Our creative directors have prepared a signature lookbook concept for your review. We would be honored to discuss your vision, floral staging, and architectural lighting in greater detail.

May we schedule a 20-minute video conference with our Senior Producer this week at your convenience?

Warmest regards,

The Executive Concierge Team
ELEVATE Events | New York & London
Hotline: +1 (800) 782-9040`
    );
    window.location.href = `mailto:${inq.email}?subject=${subject}&body=${body}`;
  });
}

if (quickReplyCorporate) {
  quickReplyCorporate.addEventListener("click", () => {
    const inq = getActiveInquiry();
    if (!inq) return;
    const subject = encodeURIComponent(`Corporate Gala & Summit Production Capabilities — ELEVATE`);
    const body = encodeURIComponent(
`Dear ${inq.fullName},

Thank you for contacting ELEVATE regarding your organization's ${inq.eventType || "corporate gala"}.

We specialize in high-stakes leadership galas, stadium acoustics, and executive brand experiences globally. Attached is our latest Enterprise Capability Portfolio.

May we propose an introductory alignment call this week to review your technical brief and attendee milestones?

Best regards,

Global Corporate Partnerships
ELEVATE Events | New York &bull; London`
    );
    window.location.href = `mailto:${inq.email}?subject=${subject}&body=${body}`;
  });
}

// Helpers
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeCsv(text) {
  if (!text) return "";
  return String(text).replace(/"/g, '""');
}
