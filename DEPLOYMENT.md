# FAMAT Analytics Dashboard — Deployment Guide

## Overview

This is a static web app deployable on **GitHub Pages** (free), powered by **Firebase** (Firestore + Auth, free Spark tier).

**No server required. No paid services.**

---

## 📁 Folder Structure

```
famat-dashboard/
├── index.html              # Main SPA entry point
├── css/
│   └── main.css            # All styles
├── js/
│   ├── config.js           # 🔧 EDIT THIS — Firebase config
│   ├── db.js               # Firestore database layer
│   ├── auth.js             # Authentication
│   ├── csv.js              # CSV parser & importer
│   ├── charts.js           # Chart.js wrappers
│   ├── app.js              # App controller & routing
│   └── pages/
│       ├── dashboard.js    # Overview dashboard
│       ├── students.js     # Student profiles
│       ├── analytics.js    # Class analytics
│       ├── compare.js      # Comparison tools
│       └── import.js       # CSV import UI
├── DEPLOYMENT.md           # This file
├── FIRESTORE_RULES.txt     # Security rules to paste
└── sample_data.csv         # Sample FAMAT CSV
```

---

## Step 1 — Firebase Setup (Free Spark Plan)

### 1.1 Create Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project** → name it (e.g., `famat-analytics`)
3. Disable Google Analytics (not needed)
4. Click **Create Project**

### 1.2 Enable Authentication

1. In the Firebase console sidebar: **Authentication** → **Get started**
2. Click **Email/Password** provider → **Enable** → **Save**
3. Go to **Users** tab → **Add User**
4. Enter your teacher email and a strong password
5. Click **Add User** — this is your login credential

### 1.3 Create Firestore Database

1. Sidebar: **Firestore Database** → **Create database**
2. Choose **Start in production mode** → **Next**
3. Select a region close to you → **Enable**

### 1.4 Set Security Rules

1. In Firestore: **Rules** tab
2. Replace the default rules with the contents of `FIRESTORE_RULES.txt`
3. Click **Publish**

### 1.5 Get Your Config

1. Firebase console: Project Settings (gear icon) → **General** tab
2. Scroll to **Your apps** → Click the `</>` (web) icon
3. Register app (nickname: `famat-web`) → **Register App**
4. Copy the `firebaseConfig` object

---

## Step 2 — Configure the App

Open `js/config.js` and replace the placeholder values:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",           // from Firebase
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456:web:abc123"
};
```

**Optional:** Update domain names to match your actual FAMAT test:
```javascript
const APP_CONFIG = {
  DOMAINS: ["Algebra", "Geometry", "Statistics", "Number Theory", "Precalculus", "Calculus"],
  // ...
};
```

---

## Step 3 — Deploy to GitHub Pages

### 3.1 Create a GitHub Repository

1. Go to [https://github.com/new](https://github.com/new)
2. Create a **public** repository (e.g., `famat-dashboard`)
3. Don't initialize with README

### 3.2 Push Code

```bash
cd famat-dashboard
git init
git add .
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/famat-dashboard.git
git push -u origin main
```

### 3.3 Enable GitHub Pages

1. Go to your repo on GitHub
2. **Settings** → **Pages** (left sidebar)
3. Under **Source**: select **Deploy from branch**
4. Branch: **main**, Folder: **/ (root)**
5. Click **Save**

Your site will be live at: `https://YOUR_USERNAME.github.io/famat-dashboard/`

*(Takes 1–2 minutes to deploy)*

### 3.4 Authorize GitHub Pages Domain in Firebase

1. Firebase console → **Authentication** → **Settings** tab
2. Under **Authorized domains** → **Add domain**
3. Add: `YOUR_USERNAME.github.io`

---

## Step 4 — First Login

1. Open your GitHub Pages URL
2. Enter the teacher email/password you created in Step 1.2
3. You're in!

---

## 📊 Importing FAMAT CSV Data

### Required Column Names (case-insensitive)

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| `student_id` | ✅ | text | STU001 |
| `student_name` | ✅ | text | Jane Smith |
| `grade` | ❌ | text | 10 |
| `test_name` | ✅ | text | FAMAT Fall 2024 |
| `test_date` | ✅ | YYYY-MM-DD | 2024-10-15 |
| `overall_score` | ✅ | 0–100 | 82.5 |
| `algebra` | ❌ | 0–100 | 85 |
| `geometry` | ❌ | 0–100 | 78 |
| *(any domain)* | ❌ | 0–100 | 90 |

- Domain columns are **auto-detected** — add any domain name as an extra column
- The app uses the column header as the domain label
- Dates also accepted as `MM/DD/YYYY` or `MM-DD-YYYY`

### Import Process

1. **Dashboard** → **Import Data** page
2. Click **Template** to download a sample CSV
3. Fill in your data
4. Drag & drop (or click to browse) your CSV
5. Review the preview — fix any errors shown
6. Click **Import N Records**

**Duplicates are automatically skipped** (same student + same test = skip).

---

## 🔐 Firestore Security Rules

See `FIRESTORE_RULES.txt`. The rules ensure:
- Only authenticated users (teachers) can read/write data
- Teachers can only see their own data (`teacherId == uid`)
- Public access is denied

---

## 🆓 Free Tier Limits (Firebase Spark Plan)

| Resource | Free Limit |
|----------|------------|
| Firestore reads | 50,000/day |
| Firestore writes | 20,000/day |
| Firestore storage | 1 GB |
| Auth users | 10,000/month |
| Hosting | N/A (use GitHub Pages) |

For a typical classroom (30 students, 10 tests), you'll use ~300 documents.
The free tier is more than sufficient for school use.

---

## ❓ Troubleshooting

**"Firebase: Error (auth/configuration-not-found)"**
→ Check `js/config.js` — your apiKey/projectId may be wrong.

**"Missing or insufficient permissions"**
→ Paste the security rules from `FIRESTORE_RULES.txt` into Firestore → Rules.

**"Authorized domain" error**
→ Add your GitHub Pages domain to Firebase Auth → Authorized domains.

**Charts not showing after theme switch**
→ This is normal — charts re-render after the theme changes (100ms delay).

**Import button disabled**
→ Ensure you are logged in. The teacher UID is attached to all records.

---

## 📱 Browser Support

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+.
Mobile-responsive layout included.
