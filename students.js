/**
 * pages/students.js — Student list + individual student profile
 */

const PageStudents = (() => {
  let allStudents = [];
  let currentStudentId = null;

  function scoreBadge(score) {
    if (score >= APP_CONFIG.SCORE_HIGH) return 'score-high';
    if (score >= APP_CONFIG.SCORE_MID) return 'score-mid';
    return 'score-low';
  }

  async function render() {
    const el = document.getElementById('page-students');
    el.innerHTML = `<div style="text-align:center;padding:3rem;"><div class="loader"></div></div>`;

    try {
      allStudents = await DB.getStudents();
      renderList(allStudents);
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>${e.message}</h3></div>`;
    }
  }

  function renderList(students) {
    const el = document.getElementById('page-students');
    el.innerHTML = `
      <div class="search-bar">
        <div class="search-input-wrap">
          <span class="search-icon">⌕</span>
          <input type="text" id="student-search" placeholder="Search by name or student ID…" />
        </div>
      </div>

      ${students.length === 0
        ? `<div class="empty-state">
            <div class="empty-state-icon">👤</div>
            <h3>No students found</h3>
            <p>Import a CSV file to add students.</p>
          </div>`
        : `<div class="card" style="padding:0;overflow:hidden;">
            <div class="table-wrap">
              <table>
                <thead><tr><th>Student ID</th><th>Name</th><th>Grade</th><th>Actions</th></tr></thead>
                <tbody id="students-tbody">
                  ${students.map(s => `
                    <tr>
                      <td class="mono">${s.externalId || '—'}</td>
                      <td><strong>${s.name}</strong></td>
                      <td>${s.grade || '—'}</td>
                      <td>
                        <button class="btn-secondary btn-sm" onclick="PageStudents.viewStudent('${s.id}')">
                          View Profile →
                        </button>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>`}`;

    document.getElementById('student-search')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      const filtered = allStudents.filter(s =>
        s.name.toLowerCase().includes(q) || (s.externalId || '').toLowerCase().includes(q)
      );
      const tbody = document.getElementById('students-tbody');
      if (tbody) {
        tbody.innerHTML = filtered.map(s => `
          <tr>
            <td class="mono">${s.externalId || '—'}</td>
            <td><strong>${s.name}</strong></td>
            <td>${s.grade || '—'}</td>
            <td><button class="btn-secondary btn-sm" onclick="PageStudents.viewStudent('${s.id}')">View Profile →</button></td>
          </tr>`).join('');
      }
    });
  }

  async function viewStudent(studentId) {
    currentStudentId = studentId;
    const el = document.getElementById('page-students');
    el.innerHTML = `<div style="text-align:center;padding:3rem;"><div class="loader"></div></div>`;

    try {
      const [student, results, tests, allResults] = await Promise.all([
        DB.getStudentById(studentId),
        DB.getResultsForStudent(studentId),
        DB.getTests(),
        DB.getResults()
      ]);

      if (!student) throw new Error('Student not found');

      const testMap = Object.fromEntries(tests.map(t => [t.id, t]));

      // Sort results by date
      const sortedResults = results.map(r => ({
        ...r,
        test: testMap[r.testId] || { name: 'Unknown', date: '' }
      })).sort((a, b) => a.test.date.localeCompare(b.test.date));

      // Compute growth
      const firstResult = sortedResults[0];
      const latestResult = sortedResults[sortedResults.length - 1];
      const growth = sortedResults.length >= 2
        ? latestResult.overallScore - firstResult.overallScore : null;

      // Class average for context
      const classAvg = allResults.length
        ? Math.round(allResults.reduce((s, r) => s + r.overallScore, 0) / allResults.length * 10) / 10 : 0;

      // Domain data from latest result
      const latestDomains = latestResult ? latestResult.domainScores || {} : {};

      el.innerHTML = `
        <button class="btn-secondary btn-sm mb-2" onclick="PageStudents.render()">← Back to Students</button>

        <div class="student-profile">
          <div class="student-avatar-lg">${student.name[0]}</div>
          <div class="student-info">
            <h2>${student.name}</h2>
            <div class="student-meta">
              ID: ${student.externalId || '—'} &nbsp;·&nbsp;
              Grade: ${student.grade || '—'} &nbsp;·&nbsp;
              ${results.length} test${results.length !== 1 ? 's' : ''} taken
            </div>
          </div>
          ${growth !== null ? `<div class="ml-auto" style="margin-left:auto;">
            <span class="growth-pill ${growth >= 0 ? 'growth-positive' : 'growth-negative'}" style="font-size:0.9rem">
              ${growth >= 0 ? '▲' : '▼'} ${Math.abs(growth).toFixed(1)} pts overall growth
            </span>
          </div>` : ''}
        </div>

        <div class="stats-grid mb-3">
          <div class="stat-card">
            <div class="stat-label">Tests Taken</div>
            <div class="stat-value">${results.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Latest Score</div>
            <div class="stat-value">${latestResult ? latestResult.overallScore : '—'}</div>
            <div class="stat-delta ${latestResult && latestResult.overallScore >= classAvg ? 'up' : 'down'}">
              class avg: ${classAvg}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Best Score</div>
            <div class="stat-value">${results.length ? Math.max(...results.map(r => r.overallScore)) : '—'}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Average Score</div>
            <div class="stat-value">${results.length
              ? Math.round(results.reduce((s, r) => s + r.overallScore, 0) / results.length * 10) / 10
              : '—'}</div>
          </div>
        </div>

        <div class="grid-2 mb-3">
          <div class="card">
            <div class="card-header">
              <div class="card-title"><span class="ct-icon">◈</span> Score Progression</div>
            </div>
            ${sortedResults.length
              ? `<div class="chart-container"><canvas id="stu-line-chart"></canvas></div>`
              : `<div class="empty-state"><div class="empty-state-icon">📈</div><h3>No scores yet</h3></div>`}
          </div>
          <div class="card">
            <div class="card-header">
              <div class="card-title"><span class="ct-icon">◎</span> Domain Profile (Latest)</div>
            </div>
            ${Object.keys(latestDomains).length
              ? `<div class="chart-container"><canvas id="stu-domain-chart"></canvas></div>`
              : `<div class="empty-state"><div class="empty-state-icon">📊</div><h3>No domain data</h3></div>`}
          </div>
        </div>

        ${Object.keys(latestDomains).length ? `
        <div class="card mb-3">
          <div class="card-header">
            <div class="card-title"><span class="ct-icon">◉</span> Domain Scores (Latest Test)</div>
          </div>
          <div class="domain-grid">
            ${Object.entries(latestDomains).map(([name, score]) => `
              <div class="domain-pill">
                <div class="domain-name">${name}</div>
                <div class="domain-score" style="color:${domainColor(score)}">${score}</div>
                <div class="progress-bar-wrap">
                  <div class="progress-bar" style="width:${score}%;background:${domainColor(score)}"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>` : ''}

        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="ct-icon">▦</span> Test History</div>
          </div>
          ${sortedResults.length
            ? `<div class="table-wrap"><table>
                <thead><tr><th>Test Name</th><th>Date</th><th>Score</th>
                  ${Object.keys(latestDomains).map(d => `<th>${d}</th>`).join('')}
                </tr></thead>
                <tbody>
                  ${sortedResults.map((r, idx) => {
                    const prevScore = idx > 0 ? sortedResults[idx-1].overallScore : null;
                    const delta = prevScore !== null ? r.overallScore - prevScore : null;
                    return `<tr>
                      <td><strong>${r.test.name}</strong></td>
                      <td class="mono">${r.test.date}</td>
                      <td>
                        <span class="score-badge ${scoreBadge(r.overallScore)}">${r.overallScore}</span>
                        ${delta !== null ? `<span class="growth-pill ${delta >= 0 ? 'growth-positive' : 'growth-negative'}" style="margin-left:0.4rem">
                          ${delta >= 0 ? '▲' : '▼'}${Math.abs(delta).toFixed(1)}</span>` : ''}
                      </td>
                      ${Object.keys(latestDomains).map(d => `<td class="mono">${r.domainScores?.[d] ?? '—'}</td>`).join('')}
                    </tr>`;}).join('')}
                </tbody>
              </table></div>`
            : `<div class="empty-state"><p>No test records for this student.</p></div>`}
        </div>`;

      // Render charts
      if (sortedResults.length) {
        CHARTS.createLineChart(
          'stu-line-chart',
          sortedResults.map(r => r.test.name),
          [
            { label: student.name, data: sortedResults.map(r => r.overallScore) },
            { label: 'Class Avg', data: sortedResults.map(() => classAvg), color: '#8892a4' }
          ]
        );
      }

      if (Object.keys(latestDomains).length) {
        CHARTS.createBarChart(
          'stu-domain-chart',
          Object.keys(latestDomains),
          [{ label: 'Domain Score', data: Object.values(latestDomains) }]
        );
      }

    } catch (e) {
      console.error(e);
      el.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">⚠️</div><h3>Error</h3><p>${e.message}</p>
        <button class="btn-secondary btn-sm mt-2" onclick="PageStudents.render()">← Back</button>
      </div>`;
    }
  }

  function domainColor(score) {
    if (score >= APP_CONFIG.SCORE_HIGH) return '#00e5a0';
    if (score >= APP_CONFIG.SCORE_MID) return '#ffcb47';
    return '#ff6b35';
  }

  return { render, viewStudent };
})();
