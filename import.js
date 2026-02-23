/**
 * pages/import.js — CSV import page
 */

const PageImport = (() => {
  let parsedData = null;

  function render() {
    const el = document.getElementById('page-import');
    el.innerHTML = `
      <div class="setup-notice">
        <strong>⚠️ Firebase Setup Required</strong>
        Before importing, ensure your Firebase config is set in <code>js/config.js</code>
        and you are logged in as a teacher account. See DEPLOYMENT.md for instructions.
      </div>

      <div class="grid-2 mb-3">
        <!-- Upload Zone -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="ct-icon">⊕</span> Upload CSV File</div>
            <button class="btn-secondary btn-sm" onclick="PageImport.downloadTemplate()">
              ⬇ Template
            </button>
          </div>
          <div class="drop-zone" id="drop-zone" onclick="document.getElementById('csv-file-input').click()">
            <input type="file" id="csv-file-input" accept=".csv,text/csv" onchange="PageImport.handleFile(this.files[0])" />
            <div class="drop-zone-icon">📂</div>
            <div class="drop-zone-text">
              <strong>Click to browse</strong> or drag & drop your CSV<br>
              <span style="font-size:0.8rem;color:var(--text-3)">Accepts .csv files only</span>
            </div>
          </div>
        </div>

        <!-- Format Guide -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="ct-icon">◉</span> Required CSV Format</div>
          </div>
          <div style="font-family:'DM Mono',monospace;font-size:0.78rem;line-height:1.8;color:var(--text-2)">
            <div><span style="color:var(--accent)">student_id</span> — unique student identifier</div>
            <div><span style="color:var(--accent)">student_name</span> — full name</div>
            <div><span style="color:var(--text-3)">grade</span> — grade level (optional)</div>
            <div><span style="color:var(--accent)">test_name</span> — e.g. "FAMAT Fall 2024"</div>
            <div><span style="color:var(--accent)">test_date</span> — YYYY-MM-DD format</div>
            <div><span style="color:var(--accent)">overall_score</span> — numeric 0–100</div>
            <div style="margin-top:0.5rem;color:var(--text-3)">+ any domain columns (algebra, geometry, etc.)</div>
          </div>
          <div style="margin-top:1rem;padding:0.6rem;background:var(--bg-3);border-radius:6px;font-size:0.75rem;color:var(--text-3);font-family:'DM Mono',monospace">
            Dates accepted: YYYY-MM-DD · MM/DD/YYYY · MM-DD-YYYY
          </div>
        </div>
      </div>

      <!-- Preview Area -->
      <div id="import-preview"></div>
      <div id="import-progress"></div>`;

    // Drag & drop
    const zone = document.getElementById('drop-zone');
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      showToast('Please upload a .csv file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const { headers, rows } = CSV.parseText(e.target.result);
        const { valid, invalid } = CSV.validate(rows);
        parsedData = { headers, valid, invalid };
        renderPreview(file.name, headers, valid, invalid);
      } catch (err) {
        showToast('CSV parse error: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  function renderPreview(filename, headers, valid, invalid) {
    const el = document.getElementById('import-preview');
    el.innerHTML = `
      <div class="card mb-3">
        <div class="card-header">
          <div class="card-title"><span class="ct-icon">▦</span> Preview: ${filename}</div>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <span class="growth-pill growth-positive">${valid.length} valid</span>
            ${invalid.length ? `<span class="growth-pill growth-negative">${invalid.length} invalid</span>` : ''}
          </div>
        </div>

        ${invalid.length ? `
        <div style="margin-bottom:1rem;">
          <div class="section-label mb-1">⚠️ Rows with Errors (will be skipped)</div>
          ${invalid.map(row => `
            <div style="background:color-mix(in srgb, #ff4444 8%, transparent);border:1px solid color-mix(in srgb, #ff4444 20%, transparent);
                border-radius:8px;padding:0.6rem 0.875rem;margin-bottom:0.4rem;font-size:0.8rem;">
              <strong>Row ${row.row}:</strong> ${row.errors.join(' · ')}
            </div>`).join('')}
        </div>` : ''}

        ${valid.length ? `
        <div class="section-label mb-1">✓ Valid Rows Preview (first 5)</div>
        <div class="preview-table-wrap">
          <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
              ${valid.slice(0, 5).map(row =>
                `<tr>${headers.map(h => `<td>${row[h] !== undefined ? row[h] : '—'}</td>`).join('')}</tr>`
              ).join('')}
              ${valid.length > 5 ? `<tr><td colspan="${headers.length}" style="text-align:center;color:var(--text-3)">
                … and ${valid.length - 5} more rows</td></tr>` : ''}
            </tbody>
          </table>
        </div>
        <div style="margin-top:1.25rem;display:flex;gap:0.75rem;align-items:center">
          <button class="btn-primary" onclick="PageImport.importData()">
            ⊕ Import ${valid.length} Record${valid.length !== 1 ? 's' : ''}
          </button>
          <span class="text-muted text-sm">Duplicate entries will be skipped automatically</span>
        </div>` : `<div class="empty-state"><p>No valid rows to import.</p></div>`}
      </div>`;
  }

  async function importData() {
    if (!parsedData || !parsedData.valid.length) return;
    const progress = document.getElementById('import-progress');

    progress.innerHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">Importing…</div></div>
        <div style="display:flex;align-items:center;gap:1rem;padding:0.5rem 0;">
          <div class="loader"></div>
          <span class="text-muted">Inserting records into database…</span>
        </div>
      </div>`;

    // Disable import button
    document.querySelectorAll('.btn-primary').forEach(b => b.disabled = true);

    try {
      const { inserted, duplicates, errors, errorLog } = await CSV.importRows(
        parsedData.valid, parsedData.headers
      );

      progress.innerHTML = `
        <div class="card" style="border-color:${errors ? '#ff4444' : 'var(--accent)'}">
          <div class="card-header">
            <div class="card-title">
              <span style="color:${errors ? '#ff6b6b' : 'var(--accent)'}">
                ${errors ? '⚠️' : '✓'} Import Complete
              </span>
            </div>
          </div>
          <div class="stats-grid" style="margin-bottom:${errorLog.length ? '1rem' : '0'}">
            <div class="stat-card">
              <div class="stat-label">Inserted</div>
              <div class="stat-value" style="color:var(--accent)">${inserted}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Duplicates Skipped</div>
              <div class="stat-value" style="color:#ffcb47">${duplicates}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Errors</div>
              <div class="stat-value" style="color:#ff6b6b">${errors}</div>
            </div>
          </div>
          ${errorLog.length ? `
          <div class="section-label mb-1">Error Details</div>
          ${errorLog.map(e => `<div style="font-size:0.8rem;color:#ff6b6b;margin-bottom:0.3rem">
            ${e.row.student_name || e.row.student_id}: ${e.error}</div>`).join('')}` : ''}
          <button class="btn-secondary" onclick="PageImport.reset()" style="margin-top:1rem">
            Import Another File
          </button>
        </div>`;

      if (inserted > 0) showToast(`✓ ${inserted} records imported successfully!`, 'success');
      else if (duplicates > 0) showToast(`All records already exist (${duplicates} duplicates)`, 'success');

    } catch (e) {
      progress.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">⚠️</div><h3>Import Failed</h3><p>${e.message}</p></div>`;
      showToast('Import failed: ' + e.message, 'error');
    }

    document.querySelectorAll('.btn-primary').forEach(b => b.disabled = false);
  }

  function reset() {
    parsedData = null;
    render();
  }

  function downloadTemplate() {
    CSV.downloadCsv(CSV.getSampleCsv(), 'famat_template.csv');
    showToast('Template downloaded!', 'success');
  }

  return { render, handleFile, importData, reset, downloadTemplate };
})();
