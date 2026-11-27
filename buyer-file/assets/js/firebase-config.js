// ==========================================================
// ELEVATE LUXURY EVENT MANAGEMENT — FIREBASE INITIALIZATION
// ==========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase web application configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBXs0WTMrm74jE7clNmE9p75XXDAltCEsc",
  authDomain: "elevate-fd71a.firebaseapp.com",
  projectId: "elevate-fd71a",
  storageBucket: "elevate-fd71a.firebasestorage.app",
  messagingSenderId: "221833845225",
  appId: "1:221833845225:web:2e1ffcb348b7c4605e5378",
  measurementId: "G-VBDZH9XK1G"
};

// Agency Admin User ID for strict access verification
export const ADMIN_UID = "dZUgNFj1Eibu96JwFXEDiWCS1XA2";

// Google Sheets Auto-Sync Webhook URL (Pre-configured production webhook)
export const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbw_GLzliepRp7lcAaafkJxCtu4iVB-sAyDB1vWz7NeNN1-swkIaXHSUJ2u3dqZCHYps1w/exec";

// Initialize Firebase Core services
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
