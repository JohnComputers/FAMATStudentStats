/**
 * config.js — Firebase Configuration
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (free Spark plan)
 * 3. Enable Authentication > Email/Password
 * 4. Enable Firestore Database (start in production mode)
 * 5. Register a web app and copy your config below
 * 6. Replace the placeholder values with YOUR config
 *
 * For GitHub Pages deployment, these values are safe to include
 * in client-side code if you set proper Firestore Security Rules.
 * See DEPLOYMENT.md for security rules setup.
 */

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// App-wide constants
const APP_CONFIG = {
  // FAMAT Domain names — update to match your actual test domains
  DOMAINS: [
    "Algebra",
    "Geometry",
    "Statistics",
    "Number Theory",
    "Precalculus",
    "Calculus"
  ],
  // Score ranges
  SCORE_HIGH: 80,  // >= 80 = green
  SCORE_MID: 60,   // >= 60 = yellow, < 60 = red
  // CSV required columns
  CSV_REQUIRED: ["student_id", "student_name", "test_name", "test_date", "overall_score"],
  // App version
  VERSION: "1.0.0"
};

// Initialize Firebase
try {
  firebase.initializeApp(FIREBASE_CONFIG);
  console.log("[FAMAT] Firebase initialized ✓");
} catch (e) {
  console.warn("[FAMAT] Firebase init error — check config.js:", e.message);
}
