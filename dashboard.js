/**
 * pages/dashboard.js — Main dashboard page
 */

const PageDashboard = (() => {

  async function render() {
    const el = document.getElementById('page-dashboard');
    el.innerHTML = `
      <div id="dash-loading" style="text-align:center;padding:3rem;">
        <div class="loader"></div><br><span class="text-muted text-sm">Loading dashboard…</span>
      </div>`;

    try {
      const [students, tests, results, classAvg, growth] = await Promise.all([
        DB.getStudents(),
        DB.getTests(),
        DB.getResults(),
        DB.getClassAverages(),
        DB.getGrowthMetrics()
      ]);

      const overallAvg = results.length
        ? Math.round(results.reduce((s, r) => s + r.overallScore, 0) / results.length * 10) / 10
        : 0;

      el.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Students</div>
            <div class="stat-value">${students.length}</div>
            <div class="stat-delta">enrolled</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Tests Administered</div>
            <div class="stat-value">${tests.length}</div>
            <div class="stat-delta">total assessments</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Results</div>
            <div class="stat-value">${results.length}</div>
            <div class="stat-delta">score records</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Class Average</div>
            <div class="stat-value">${overallAvg || '—'}</div>
            <div class="stat-delta">overall score</div>
          </div>
        </div>

        <div class="grid-2 mb-3">
          <div class="card">
            <div class="card-header">
              <div class="card-title"><span class="ct-icon">◈</span> Class Average by Test</div>
            </div>
            ${classAvg.length ? `<div class="chart-container"><canvas id="dash-line-chart"></canvas></div>`
              : `<div class="empty-state"><div class="empty-state-icon">📈</div><h3>No data yet</h3><p>Import a CSV to see trends</p></div>`}
          </div>
          <div class="card">
            <div class="card-header">
              <div class="card-title"><span class="ct-icon">◎</span> Domain Averages</div>
            </div>
            ${classAvg.length ? `<div class="chart-container"><canvas id="dash-domain-chart"></canvas></div>`
              : `<div class="empty-state"><div class="empty-state-icon">📊</div><h3>No domain data</h3><p>Domain columns appear after import</p></div>`}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="ct-icon">▲</span> Top Growth Students</div>
          </div>
          ${growth.length
            ? `<div class="table-wrap"><table>
                <thead><tr><th>Student</th><th>First Score</th><th>Latest Score</th><th>Growth</th><th>% Change</th><th>Tests</th></tr></thead>
                <tbody>
                  ${growth.slice(0, 10).map(g => `
                    <tr>
                      <td><strong>${g.student.name}</strong><br>
                        <span class="mono text-muted" style="font-size:0.72rem">${g.student.externalId}</span></td>
                      <td><span class="score-badge ${scoreBadge(g.firstScore)}">${g.firstScore}</span></td>
                      <td><span class="score-badge ${scoreBadge(g.latestScore)}">${g.latestScore}</span></td>
                      <td><span class="growth-pill ${g.growth >= 0 ? 'growth-positive' : 'growth-negative'}">
                        ${g.growth >= 0 ? '▲' : '▼'} ${Math.abs(g.growth).toFixed(1)}</span></td>
                      <td class="mono">${g.pctChange >= 0 ? '+' : ''}${g.pctChange.toFixed(1)}%</td>
                      <td class="mono">${g.testCount}</td>
                    </tr>`).join('')}
                </tbody>
              </table></div>`
            : `<div class="empty-state"><div class="empty-state-icon">🏆</div>
                <h3>No growth data yet</h3><p>Students need at least 2 tests to show growth</p></div>`}
        </div>`;

      // Render charts
      if (classAvg.length) {
        CHARTS.createLineChart(
          'dash-line-chart',
          classAvg.map(t => t.testName),
          [{ label: 'Class Average', data: classAvg.map(t => t.average) }]
        );

        // Aggregate domain averages across all tests
        const domainTotals = {};
        classAvg.forEach(t => {
          Object.entries(t.domainAverages).forEach(([d, avg]) => {
            if (!domainTotals[d]) domainTotals[d] = [];
            domainTotals[d].push(avg);
          });
        });
        const domainLabels = Object.keys(domainTotals);
        const domainData = domainLabels.map(d =>
          Math.round(domainTotals[d].reduce((a, b) => a + b, 0) / domainTotals[d].length * 10) / 10
        );

        if (domainLabels.length) {
          CHARTS.createBarChart(
            'dash-domain-chart',
            domainLabels,
            [{ label: 'Domain Average', data: domainData, color: '#7c6fff' }]
          );
        }
      }

    } catch (e) {
      console.error(e);
      el.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Error loading dashboard</h3>
        <p>${e.message}</p>
      </div>`;
    }
  }

  function scoreBadge(score) {
    if (score >= APP_CONFIG.SCORE_HIGH) return 'score-high';
    if (score >= APP_CONFIG.SCORE_MID) return 'score-mid';
    return 'score-low';
  }

  return { render };
})();
