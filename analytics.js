/**
 * pages/analytics.js — Class-wide analytics page
 */

const PageAnalytics = (() => {

  async function render() {
    const el = document.getElementById('page-analytics');
    el.innerHTML = `<div style="text-align:center;padding:3rem;"><div class="loader"></div></div>`;

    try {
      const [classAvg, growth, allResults, tests] = await Promise.all([
        DB.getClassAverages(),
        DB.getGrowthMetrics(),
        DB.getAllResultsEnriched(),
        DB.getTests()
      ]);

      // Domain weakness analysis
      const domainTotals = {};
      allResults.forEach(r => {
        Object.entries(r.domainScores || {}).forEach(([d, score]) => {
          if (!domainTotals[d]) domainTotals[d] = [];
          domainTotals[d].push(Number(score));
        });
      });
      const domainAvgs = Object.entries(domainTotals).map(([d, scores]) => ({
        domain: d,
        avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
      })).sort((a, b) => a.avg - b.avg);

      el.innerHTML = `
        <div class="grid-2 mb-3">
          <div class="card">
            <div class="card-header">
              <div class="card-title"><span class="ct-icon">◈</span> Class Average Trend</div>
            </div>
            ${classAvg.length
              ? `<div class="chart-container"><canvas id="ana-trend-chart"></canvas></div>`
              : emptyState('📈', 'No test data')}
          </div>
          <div class="card">
            <div class="card-header">
              <div class="card-title"><span class="ct-icon">◎</span> Domain Weaknesses (Lowest → Highest)</div>
            </div>
            ${domainAvgs.length
              ? `<div class="chart-container"><canvas id="ana-domain-chart"></canvas></div>`
              : emptyState('📊', 'No domain data')}
          </div>
        </div>

        <div class="grid-2 mb-3">
          <div class="card">
            <div class="card-header">
              <div class="card-title"><span class="ct-icon">▲</span> Top Growth Students</div>
              <button class="btn-secondary btn-sm" onclick="PageAnalytics.exportGrowth()">⬇ Export</button>
            </div>
            ${growth.length
              ? `<div class="chart-container" style="margin-bottom:1rem"><canvas id="ana-growth-chart"></canvas></div>`
              : emptyState('🏆', 'Need 2+ tests per student')}
          </div>
          <div class="card">
            <div class="card-header">
              <div class="card-title"><span class="ct-icon">◉</span> Per-Test Summary</div>
              <button class="btn-secondary btn-sm" onclick="PageAnalytics.exportSummary()">⬇ Export</button>
            </div>
            ${classAvg.length
              ? `<div class="table-wrap">
                  <table>
                    <thead><tr><th>Test</th><th>Date</th><th>Students</th><th>Avg Score</th></tr></thead>
                    <tbody>
                      ${classAvg.map(t => `
                        <tr>
                          <td><strong>${t.testName}</strong></td>
                          <td class="mono">${t.testDate}</td>
                          <td class="mono">${t.count}</td>
                          <td><span class="score-badge ${scoreBadge(t.average)}">${t.average}</span></td>
                        </tr>`).join('')}
                    </tbody>
                  </table>
                </div>`
              : emptyState('📋', 'No test data yet')}
          </div>
        </div>

        ${domainAvgs.length ? `
        <div class="card mb-3">
          <div class="card-header">
            <div class="card-title"><span class="ct-icon">▦</span> Domain Performance Detail</div>
          </div>
          <div class="domain-grid">
            ${domainAvgs.map(d => `
              <div class="domain-pill">
                <div class="domain-name">${d.domain}</div>
                <div class="domain-score" style="color:${domainColor(d.avg)}">${d.avg}</div>
                <div class="progress-bar-wrap">
                  <div class="progress-bar" style="width:${d.avg}%;background:${domainColor(d.avg)}"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>` : ''}`;

      // Charts
      if (classAvg.length) {
        CHARTS.createLineChart(
          'ana-trend-chart',
          classAvg.map(t => t.testName),
          [{ label: 'Class Average', data: classAvg.map(t => t.average), color: '#00e5a0' }]
        );
      }
      if (domainAvgs.length) {
        CHARTS.createBarChart(
          'ana-domain-chart',
          domainAvgs.map(d => d.domain),
          [{ label: 'Class Domain Avg', data: domainAvgs.map(d => d.avg), color: '#7c6fff' }]
        );
      }
      if (growth.length) {
        const top8 = growth.slice(0, 8);
        CHARTS.createHorizontalBar(
          'ana-growth-chart',
          top8.map(g => g.student.name),
          top8.map(g => g.latestScore),
          '#00e5a0'
        );
      }

    } catch (e) {
      console.error(e);
      el.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">⚠️</div><h3>Error</h3><p>${e.message}</p></div>`;
    }
  }

  async function exportSummary() {
    try {
      const classAvg = await DB.getClassAverages();
      const rows = classAvg.map(t => ({
        'Test Name': t.testName,
        'Date': t.testDate,
        'Student Count': t.count,
        'Average Score': t.average,
        ...Object.fromEntries(Object.entries(t.domainAverages).map(([k, v]) => [k + ' Avg', v]))
      }));
      CSV.downloadCsv(CSV.arrayToCsv(rows), 'famat_class_summary.csv');
      showToast('Summary exported!', 'success');
    } catch (e) {
      showToast('Export failed: ' + e.message, 'error');
    }
  }

  async function exportGrowth() {
    try {
      const growth = await DB.getGrowthMetrics();
      const rows = growth.map(g => ({
        'Student Name': g.student.name,
        'Student ID': g.student.externalId,
        'First Score': g.firstScore,
        'Latest Score': g.latestScore,
        'Growth (pts)': g.growth,
        'Growth (%)': g.pctChange,
        'Tests Taken': g.testCount
      }));
      CSV.downloadCsv(CSV.arrayToCsv(rows), 'famat_growth_report.csv');
      showToast('Growth report exported!', 'success');
    } catch (e) {
      showToast('Export failed: ' + e.message, 'error');
    }
  }

  function scoreBadge(score) {
    if (score >= APP_CONFIG.SCORE_HIGH) return 'score-high';
    if (score >= APP_CONFIG.SCORE_MID) return 'score-mid';
    return 'score-low';
  }

  function domainColor(score) {
    if (score >= APP_CONFIG.SCORE_HIGH) return '#00e5a0';
    if (score >= APP_CONFIG.SCORE_MID) return '#ffcb47';
    return '#ff6b35';
  }

  function emptyState(icon, text) {
    return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><h3>${text}</h3></div>`;
  }

  return { render, exportSummary, exportGrowth };
})();
