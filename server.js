// server.js (Render-ready)
// ---------------------------------------------------------------------------

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Basic admin creds (change in production)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend')));

// EJS reports directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'reports'));

// ------------------------------
// MySQL Pool for Render
// ------------------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ------------------------------
// Utility helpers
// ------------------------------
function normalizeDocumentLink(row) {
  if (!row || !row.document_link) return row;
  let clean = row.document_link.replace(/\/?reports\/?/g, "");
  row.document_link = "/reports/" + clean;
  return row;
}

function ensureReportPath(link) {
  if (!link) return link;
  if (!link.startsWith('/reports/')) return '/reports/' + link.replace(/^\/+/, '');
  return link;
}

function randFloat(min, max, decimals = 1) {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

// ------------------------------
// TEST DEFINITIONS
// ------------------------------
const TEST_DEFINITIONS = {
  "CBC": {
    displayName: "Complete Blood Count (CBC)",
    fields: [
      { name: "Hemoglobin", unit: "g/dL", refLow: 12, refHigh: 16 },
      { name: "RBC", unit: "Million/µL", refLow: 4.0, refHigh: 5.5 },
      { name: "WBC", unit: "×10^3/µL", refLow: 4.0, refHigh: 11.0 },
      { name: "Platelets", unit: "×10^3/µL", refLow: 150, refHigh: 450 }
    ]
  },
  "Liver Function Test": {
    displayName: "Liver Function Test (LFT)",
    fields: [
      { name: "ALT (SGPT)", unit: "U/L", refLow: 7, refHigh: 56 },
      { name: "AST (SGOT)", unit: "U/L", refLow: 10, refHigh: 40 },
      { name: "Alkaline Phosphatase", unit: "U/L", refLow: 44, refHigh: 147 },
      { name: "Bilirubin Total", unit: "mg/dL", refLow: 0.1, refHigh: 1.2 }
    ]
  },
  "Thyroid Panel": {
    displayName: "Thyroid Panel",
    fields: [
      { name: "TSH", unit: "µIU/mL", refLow: 0.4, refHigh: 4.0 },
      { name: "Free T3", unit: "pg/mL", refLow: 2.3, refHigh: 4.2 },
      { name: "Free T4", unit: "ng/dL", refLow: 0.9, refHigh: 1.7 }
    ]
  },
  "Blood Glucose": {
    displayName: "Blood Glucose",
    fields: [
      { name: "Fasting Glucose", unit: "mg/dL", refLow: 70, refHigh: 100 },
      { name: "Random Glucose", unit: "mg/dL", refLow: 70, refHigh: 140 }
    ]
  },
  "Urinalysis": {
    displayName: "Urinalysis",
    fields: [
      { name: "Appearance", refText: "Clear" },
      { name: "pH", unit: "", refLow: 5, refHigh: 8 },
      { name: "Protein", refText: "Negative" },
      { name: "Glucose", refText: "Negative" }
    ]
  }
};

function generateResultsForTest(testName) {
  const def = TEST_DEFINITIONS[testName];
  if (!def) return null;
  const results = def.fields.map(f => {
    if (f.refText) {
      return {
        name: f.name,
        value: f.refText,
        unit: f.unit || '',
        reference: f.refText
      };
    } else if (typeof f.refLow === 'number' && typeof f.refHigh === 'number') {
      const low = Number(f.refLow);
      const high = Number(f.refHigh);
      const spread = (high - low) || Math.max(1, low * 0.1);
      const value = randFloat(Math.max(0, low - spread * 0.1), high + spread * 0.1, 1);
      return {
        name: f.name,
        value,
        unit: f.unit || '',
        reference: `${low} - ${high}`
      };
    } else {
      return {
        name: f.name,
        value: "N/A",
        unit: f.unit || '',
        reference: "N/A"
      };
    }
  });
  return { displayName: def.displayName || testName, fields: results };
}

// ------------------------------
// ROUTES
// ------------------------------
// Keep all your routes exactly as they are in your original file,
// but replace any top-level `connection` with `pool` where used.
// Example:
// const [rows] = await pool.execute(query, params);

// ------------------------------
// Server listener for Render
// ------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
