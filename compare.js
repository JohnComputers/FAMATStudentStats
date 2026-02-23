/**
 * pages/compare.js — Student vs class / student vs student comparison
 */

const PageCompare = (() => {
  let students = [];
  let tests = [];

  async function render() {
    const el = document.getElementById('page-compare');
    el.innerHTML = `<div style="text-align:center;padding:3rem;"><div class="loader"></div></div>`;

    try {
      [students, tests] = await Promise.all([DB.getStudents(), DB.getTests()]);
      renderUI();
    } catch (e) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>${e.message}</h3></div>`;
    }
  }

  function renderUI() {
    const el = document.getElementById('page-compare');

    const studentOptions = students.map(s =>
      `<option value="${s.id}">${s.name} (${s.externalId})</option>`).join('');

    el.innerHTML = `
      <div class="tabs">
        <button class="tab active" onclick="PageCompare.switchTab(this,'tab-vs-class')">Student vs Class</button>
        <button class="tab" onclick="PageCompare.switchTab(this,'tab-vs-student')">Student vs Student</button>
        <button class="tab" onclick="PageCompare.switchTab(this,'tab-domain-growth')">Domain Growth</button>
      </div>

      <!-- Tab: vs Class -->
      <div id="tab-vs-class" class="tab-content">
        <div class="compare-form">
          <div class="form-group">
            <label>Select Student</label>
            <select id="cmp-student-1">
              <option value="">— choose student —</option>
              ${studentOptions}
            </select>
          </div>
          <button class="btn-primary" onclick="PageCompare.compareVsClass()">
            Compare →
          </button>
        </div>
        <div id="cmp-class-result"></div>
      </div>

      <!-- Tab: vs Student -->
      <div id="tab-vs-student" class="tab-content hidden">
        <div class="compare-form">
          <div class="form-group">
            <label>Student A</label>
            <select id="cmp-studentA">
              <option value="">— choose —</option>
              ${studentOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Student B</label>
            <select id="cmp-studentB">
              <option value="">— choose —</option>
              ${studentOptions}
            </select>
          </div>
          <button class="btn-primary" onclick="PageCompare.compareStudents()">
            Compare →
          </button>
        </div>
        <div id="cmp-students-result"></div>
      </div>

      <!-- Tab: Domain Growth -->
      <div id="tab-domain-growth" class="tab-content hidden">
        <div class="compare-form">
          <div class="form-group">
            <label>Select Student</label>
            <select id="cmp-domain-student">
              <option value="">— choose student —</option>
              ${studentOptions}
            </select>
          </div>
          <button class="btn-primary" onclick="PageCompare.domainGrowth()">
            Analyze →
          </button>
        </div>
        <div id="cmp-domain-result"></div>
      </div>`;
  }

  function switchTab(btn, tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(tabId).classList.remove('hidden');
  }

  async function compareVsClass() {
    const studentId = document.getElementById('cmp-student-1').value;
    const result = document.getElementById('cmp-class-result');
    if (!studentId) { showToast('Please select a student', 'error'); return; }

    result.innerHTML = `<div style="text-align:center;padding:2rem;"><div class="loader"></div></div>`;

    try {
      const [student, studentResults, allResults, testsMap] = await Promise.all([
        DB.getStudentById(studentId),
        DB.getResultsForStudent(studentId),
        DB.getResults(),
        DB.getTests().then(t => Object.fromEntries(t.map(x => [x.id, x])))
      ]);

      const classAvgByTest = {};
      allResults.forEach(r => {
        if (!classAvgByTest[r.testId]) classAvgByTest[r.testId] = [];
        classAvgByTest[r.testId].push(r.overallScore);
      });

      const sorted = studentResults.map(r => ({
        ...r, test: testsMap[r.testId] || { name: 'Unknown', date: '' }
      })).sort((a, b) => a.test.date.localeCompare(b.test.date));

      const labels = sorted.map(r => r.test.name);
      const studentData = sorted.map(r => r.overallScore);
      const classData = sorted.map(r => {
        const scores = classAvgByTest[r.testId] || [];
        return scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
          : null;
      });

      result.innerHTML = `
        <div class="card mb-3">
          <div class="card-header">
            <div class="card-title"><span class="ct-icon">◈</span> ${student.name} vs Class Average</div>
          </div>
          <div class="chart-container"><canvas id="cmp-line1"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="ct-icon">◉</span> Score Comparison Table</div>
          </div>
          <div class="table-wrap"><table>
            <thead><tr><th>Test</th><th>${student.name}</th><th>Class Avg</th><th>Difference</th></tr></thead>
            <tbody>
              ${sorted.map((r, i) => {
                const diff = classData[i] !== null ? r.overallScore - classData[i] : null;
                return `<tr>
                  <td>${r.test.name}</td>
                  <td><span class="score-badge ${scoreBadge(r.overallScore)}">${r.overallScore}</span></td>
                  <td>${classData[i] !== null ? `<span class="score-badge score-mid">${classData[i]}</span>` : '—'}</td>
                  <td>${diff !== null ? `<span class="growth-pill ${diff >= 0 ? 'growth-positive' : 'growth-negative'}">
                    ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}</span>` : '—'}</td>
                </tr>`;}).join('')}
            </tbody>
          </table></div>
        </div>`;

      CHARTS.createLineChart('cmp-line1', labels, [
        { label: student.name, data: studentData, color: '#00e5a0' },
        { label: 'Class Average', data: classData, color: '#8892a4' }
      ]);

    } catch (e) {
      result.innerHTML = `<div class="empty-state"><h3>${e.message}</h3></div>`;
    }
  }

  async function compareStudents() {
    const idA = document.getElementById('cmp-studentA').value;
    const idB = document.getElementById('cmp-studentB').value;
    const result = document.getElementById('cmp-students-result');
    if (!idA || !idB || idA === idB) { showToast('Select two different students', 'error'); return; }

    result.innerHTML = `<div style="text-align:center;padding:2rem;"><div class="loader"></div></div>`;

    try {
      const [stuA, stuB, resA, resB, testsMap] = await Promise.all([
        DB.getStudentById(idA), DB.getStudentById(idB),
        DB.getResultsForStudent(idA), DB.getResultsForStudent(idB),
        DB.getTests().then(t => Object.fromEntries(t.map(x => [x.id, x])))
      ]);

      const sortedA = resA.map(r => ({ ...r, test: testsMap[r.testId] || { name: '?', date: '' } }))
        .sort((a, b) => a.test.date.localeCompare(b.test.date));
      const sortedB = resB.map(r => ({ ...r, test: testsMap[r.testId] || { name: '?', date: '' } }))
        .sort((a, b) => a.test.date.localeCompare(b.test.date));

      // Find common tests
      const testIdsA = new Set(resA.map(r => r.testId));
      const testIdsB = new Set(resB.map(r => r.testId));
      const commonIds = [...testIdsA].filter(id => testIdsB.has(id));

      const commonA = sortedA.filter(r => commonIds.includes(r.testId));
      const commonB = sortedB.filter(r => commonIds.includes(r.testId));
      const labels = commonA.map(r => r.test.name);

      // Radar: latest domains
      const domA = resA[resA.length - 1]?.domainScores || {};
      const domB = resB[resB.length - 1]?.domainScores || {};
      const allDomains = [...new Set([...Object.keys(domA), ...Object.keys(domB)])];

      result.innerHTML = `
        <div class="grid-2 mb-3">
          <div class="card">
            <div class="card-header">
              <div class="card-title"><span class="ct-icon">◈</span> Score Progression</div>
            </div>
            ${labels.length
              ? `<div class="chart-container"><canvas id="cmp-line2"></canvas></div>`
              : `<div class="empty-state"><p>No common tests found</p></div>`}
          </div>
          <div class="card">
            <div class="card-header">
              <div class="card-title"><span class="ct-icon">◎</span> Domain Profile (Latest)</div>
            </div>
            ${allDomains.length
              ? `<div class="chart-container"><canvas id="cmp-radar"></canvas></div>`
              : `<div class="empty-state"><p>No domain data</p></div>`}
          </div>
        </div>`;

      if (labels.length) {
        CHARTS.createLineChart('cmp-line2', labels, [
          { label: stuA.name, data: commonA.map(r => r.overallScore), color: '#00e5a0' },
          { label: stuB.name, data: commonB.map(r => r.overallScore), color: '#7c6fff' }
        ]);
      }
      if (allDomains.length) {
        CHARTS.createRadarChart('cmp-radar', allDomains, [
          { label: stuA.name, data: allDomains.map(d => domA[d] || 0) },
          { label: stuB.name, data: allDomains.map(d => domB[d] || 0) }
        ]);
      }

    } catch (e) {
      result.innerHTML = `<div class="empty-state"><h3>${e.message}</h3></div>`;
    }
  }

  async function domainGrowth() {
    const studentId = document.getElementById('cmp-domain-student').value;
    const result = document.getElementById('cmp-domain-result');
    if (!studentId) { showToast('Select a student', 'error'); return; }

    result.innerHTML = `<div style="text-align:center;padding:2rem;"><div class="loader"></div></div>`;

    try {
      const [student, studentResults, testsMap] = await Promise.all([
        DB.getStudentById(studentId),
        DB.getResultsForStudent(studentId),
        DB.getTests().then(t => Object.fromEntries(t.map(x => [x.id, x])))
      ]);

      const sorted = studentResults.map(r => ({
        ...r, test: testsMap[r.testId] || { name: '?', date: '' }
      })).sort((a, b) => a.test.date.localeCompare(b.test.date));

      // Collect all domains
      const allDomains = [...new Set(sorted.flatMap(r => Object.keys(r.domainScores || {})))];
      const labels = sorted.map(r => r.test.name);

      if (!allDomains.length) {
        result.innerHTML = `<div class="empty-state"><h3>No domain data for this student</h3></div>`;
        return;
      }

      result.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="ct-icon">◈</span> ${student.name} — Domain Growth Over Time</div>
          </div>
          <div class="chart-container" style="height:320px"><canvas id="cmp-domain-line"></canvas></div>
        </div>`;

      const datasets = allDomains.map((d, i) => ({
        label: d,
        data: sorted.map(r => r.domainScores?.[d] ?? null),
        color: ['#00e5a0','#7c6fff','#ff6b35','#ffcb47','#00bcd4','#f06292'][i % 6]
      }));

      CHARTS.createLineChart('cmp-domain-line', labels, datasets);

    } catch (e) {
      result.innerHTML = `<div class="empty-state"><h3>${e.message}</h3></div>`;
    }
  }

  function scoreBadge(score) {
    if (score >= APP_CONFIG.SCORE_HIGH) return 'score-high';
    if (score >= APP_CONFIG.SCORE_MID) return 'score-mid';
    return 'score-low';
  }

  return { render, switchTab, compareVsClass, compareStudents, domainGrowth };
})();
