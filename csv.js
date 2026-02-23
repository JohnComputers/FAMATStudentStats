/**
 * csv.js — CSV Parser & Validator
 *
 * Expected CSV columns (case-insensitive, spaces normalized):
 *   student_id, student_name, grade, test_name, test_date, overall_score,
 *   + any domain columns (e.g., algebra, geometry, statistics, ...)
 *
 * Date format: YYYY-MM-DD or MM/DD/YYYY
 */

const CSV = (() => {

  /**
   * Parse raw CSV text into array of row objects.
   * Handles quoted fields with commas inside.
   */
  function parseText(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");

    const headers = parseRow(lines[0]).map(h =>
      h.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    );

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = parseRow(line);
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (values[idx] || "").trim();
      });
      rows.push(obj);
    }
    return { headers, rows };
  }

  /**
   * Parse a single CSV row respecting quoted fields.
   */
  function parseRow(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(current); current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  /**
   * Validate and normalize parsed rows.
   * Returns { valid: [], invalid: [] }
   */
  function validate(rows) {
    const required = APP_CONFIG.CSV_REQUIRED;
    const valid = [];
    const invalid = [];

    rows.forEach((row, idx) => {
      const errors = [];

      // Check required fields
      required.forEach(field => {
        if (!row[field] || row[field].trim() === '') {
          errors.push(`Missing required field: ${field}`);
        }
      });

      // Validate overall_score is a number 0–100
      const score = parseFloat(row.overall_score);
      if (isNaN(score) || score < 0 || score > 100) {
        errors.push(`overall_score must be 0–100 (got "${row.overall_score}")`);
      }

      // Normalize date
      const dateNorm = normalizeDate(row.test_date);
      if (!dateNorm) {
        errors.push(`Invalid date format: "${row.test_date}" (use YYYY-MM-DD or MM/DD/YYYY)`);
      }

      if (errors.length) {
        invalid.push({ row: idx + 2, data: row, errors });
      } else {
        valid.push({
          ...row,
          test_date: dateNorm,
          overall_score: Math.round(score * 10) / 10
        });
      }
    });

    return { valid, invalid };
  }

  /**
   * Extract domain scores from a row (columns not in the standard set).
   */
  function extractDomains(row, headers) {
    const standardCols = new Set([
      'student_id','student_name','grade','test_name','test_date','overall_score'
    ]);
    const domains = {};
    headers.forEach(h => {
      if (!standardCols.has(h) && row[h] !== undefined && row[h] !== '') {
        const score = parseFloat(row[h]);
        if (!isNaN(score)) {
          // Pretty-print domain name
          const label = h.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          domains[label] = Math.round(score * 10) / 10;
        }
      }
    });
    return domains;
  }

  /**
   * Normalize date string to YYYY-MM-DD.
   */
  function normalizeDate(str) {
    if (!str) return null;
    str = str.trim();
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // MM/DD/YYYY
    const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
    // MM-DD-YYYY
    const m2 = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m2) return `${m2[3]}-${m2[1].padStart(2,'0')}-${m2[2].padStart(2,'0')}`;
    return null;
  }

  /**
   * Import validated rows into Firestore.
   * Returns { inserted, duplicates, errors }
   */
  async function importRows(validRows, headers) {
    let inserted = 0, duplicates = 0, errors = 0;
    const errorLog = [];

    for (const row of validRows) {
      try {
        // Upsert student
        const studentDocId = await DB.upsertStudent({
          externalId: row.student_id,
          name: row.student_name,
          grade: row.grade || ''
        });

        // Upsert test
        const testDocId = await DB.upsertTest({
          name: row.test_name,
          date: row.test_date
        });

        // Extract domain scores
        const domainScores = extractDomains(row, headers);

        // Insert result (duplicate-safe)
        const result = await DB.insertResult({
          studentId: studentDocId,
          testId: testDocId,
          testDate: row.test_date,
          overallScore: row.overall_score,
          domainScores
        });

        if (result.duplicate) duplicates++;
        else inserted++;
      } catch (e) {
        errors++;
        errorLog.push({ row, error: e.message });
        console.error("[CSV Import Error]", e, row);
      }
    }

    return { inserted, duplicates, errors, errorLog };
  }

  /**
   * Generate a sample CSV template string.
   */
  function getSampleCsv() {
    const domains = APP_CONFIG.DOMAINS.map(d => d.toLowerCase().replace(/\s+/g,'_')).join(',');
    const header = `student_id,student_name,grade,test_name,test_date,overall_score,${domains}`;
    const rows = [
      `STU001,Jane Smith,10,FAMAT Fall 2024,2024-10-15,82,85,78,90,70,88,75`,
      `STU002,John Doe,10,FAMAT Fall 2024,2024-10-15,74,70,80,65,82,72,68`,
      `STU001,Jane Smith,10,FAMAT Spring 2025,2025-03-20,89,92,85,94,78,90,82`,
      `STU003,Maria Garcia,11,FAMAT Fall 2024,2024-10-15,91,95,88,93,86,92,90`,
    ];
    return [header, ...rows].join('\n');
  }

  /**
   * Convert array of objects to CSV string for export.
   */
  function arrayToCsv(data) {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => {
        const val = row[h] == null ? '' : String(row[h]);
        return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g,'""')}"` : val;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  function downloadCsv(csvString, filename) {
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { parseText, validate, extractDomains, importRows, getSampleCsv, arrayToCsv, downloadCsv };
})();
