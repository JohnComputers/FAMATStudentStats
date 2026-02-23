/**
 * charts.js — Chart.js wrapper utilities
 * Provides factory functions for consistent chart styling.
 */

const CHARTS = (() => {
  // Track active charts for cleanup
  const activeCharts = {};

  // Base color palette
  const PALETTE = [
    '#00e5a0', '#7c6fff', '#ff6b35', '#ffcb47', '#00bcd4',
    '#f06292', '#aed581', '#ff7043', '#ba68c8', '#4fc3f7'
  ];

  function getThemeColors() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: dark ? '#e8eaf0' : '#1a2030',
      subtext: dark ? '#8892a4' : '#5a6a82',
      grid: dark ? '#252b35' : '#dde2ea',
      bg: dark ? '#111418' : '#ffffff',
    };
  }

  /**
   * Destroy and recreate a chart on a canvas element.
   */
  function destroy(canvasId) {
    if (activeCharts[canvasId]) {
      activeCharts[canvasId].destroy();
      delete activeCharts[canvasId];
    }
  }

  function register(canvasId, chart) {
    destroy(canvasId);
    activeCharts[canvasId] = chart;
  }

  function baseOptions(extra = {}) {
    const tc = getThemeColors();
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: tc.subtext,
            font: { family: "'DM Mono', monospace", size: 11 },
            boxWidth: 12,
            padding: 16
          }
        },
        tooltip: {
          backgroundColor: tc.bg,
          borderColor: '#252b35',
          borderWidth: 1,
          titleColor: tc.text,
          bodyColor: tc.subtext,
          padding: 10,
          cornerRadius: 8,
          titleFont: { family: "'Syne', sans-serif", weight: '700' },
          bodyFont: { family: "'DM Mono', monospace", size: 12 }
        }
      },
      scales: {
        x: {
          ticks: { color: tc.subtext, font: { family: "'DM Mono', monospace", size: 11 } },
          grid: { color: tc.grid, drawBorder: false }
        },
        y: {
          ticks: { color: tc.subtext, font: { family: "'DM Mono', monospace", size: 11 } },
          grid: { color: tc.grid, drawBorder: false },
          beginAtZero: false
        }
      },
      ...extra
    };
  }

  /**
   * Line chart — score progression over time.
   * datasets: [{ label, data (numbers), color? }]
   * labels: string[]
   */
  function createLineChart(canvasId, labels, datasets, opts = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const tc = getThemeColors();

    const chartDatasets = datasets.map((ds, i) => {
      const color = ds.color || PALETTE[i % PALETTE.length];
      return {
        label: ds.label,
        data: ds.data,
        borderColor: color,
        backgroundColor: color + '20',
        pointBackgroundColor: color,
        pointBorderColor: tc.bg,
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.35,
        fill: datasets.length === 1
      };
    });

    const options = baseOptions({
      scales: {
        x: {
          ticks: { color: tc.subtext, font: { family: "'DM Mono', monospace", size: 11 } },
          grid: { color: tc.grid }
        },
        y: {
          ticks: { color: tc.subtext, font: { family: "'DM Mono', monospace", size: 11 } },
          grid: { color: tc.grid },
          min: opts.yMin || 0,
          max: opts.yMax || 100
        }
      }
    });

    const chart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets: chartDatasets },
      options
    });
    register(canvasId, chart);
    return chart;
  }

  /**
   * Bar chart — domain scores.
   * datasets: [{ label, data, color? }]
   * labels: domain names
   */
  function createBarChart(canvasId, labels, datasets, opts = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const tc = getThemeColors();

    const chartDatasets = datasets.map((ds, i) => {
      const color = ds.color || PALETTE[i % PALETTE.length];
      return {
        label: ds.label,
        data: ds.data,
        backgroundColor: color + 'cc',
        borderColor: color,
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false
      };
    });

    const options = baseOptions({
      scales: {
        x: {
          ticks: { color: tc.subtext, font: { family: "'DM Mono', monospace", size: 10 },
            maxRotation: 30 },
          grid: { display: false }
        },
        y: {
          ticks: { color: tc.subtext, font: { family: "'DM Mono', monospace", size: 11 } },
          grid: { color: tc.grid },
          min: 0,
          max: opts.yMax || 100
        }
      }
    });

    const chart = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: chartDatasets },
      options
    });
    register(canvasId, chart);
    return chart;
  }

  /**
   * Radar chart — multi-domain profile.
   */
  function createRadarChart(canvasId, labels, datasets) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const tc = getThemeColors();

    const chartDatasets = datasets.map((ds, i) => {
      const color = PALETTE[i % PALETTE.length];
      return {
        label: ds.label,
        data: ds.data,
        borderColor: color,
        backgroundColor: color + '22',
        pointBackgroundColor: color,
        pointRadius: 4
      };
    });

    const chart = new Chart(canvas, {
      type: 'radar',
      data: { labels, datasets: chartDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { labels: { color: tc.subtext, font: { family: "'DM Mono', monospace", size: 11 }, boxWidth: 12 } },
          tooltip: {
            backgroundColor: tc.bg,
            borderColor: '#252b35',
            borderWidth: 1,
            titleColor: tc.text,
            bodyColor: tc.subtext,
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          r: {
            min: 0, max: 100,
            ticks: { color: tc.subtext, font: { size: 10 }, stepSize: 20, backdropColor: 'transparent' },
            grid: { color: tc.grid },
            angleLines: { color: tc.grid },
            pointLabels: { color: tc.text, font: { family: "'DM Mono', monospace", size: 11 } }
          }
        }
      }
    });
    register(canvasId, chart);
    return chart;
  }

  /**
   * Horizontal bar — rankings.
   */
  function createHorizontalBar(canvasId, labels, data, color = '#00e5a0') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const tc = getThemeColors();

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: color + 'bb',
          borderColor: color,
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false },
          tooltip: {
            backgroundColor: tc.bg, borderColor: '#252b35', borderWidth: 1,
            titleColor: tc.text, bodyColor: tc.subtext, padding: 10, cornerRadius: 8
          }
        },
        scales: {
          x: {
            ticks: { color: tc.subtext, font: { family: "'DM Mono', monospace", size: 11 } },
            grid: { color: tc.grid },
            min: 0, max: 100
          },
          y: {
            ticks: { color: tc.text, font: { size: 12 } },
            grid: { display: false }
          }
        }
      }
    });
    register(canvasId, chart);
    return chart;
  }

  /** Destroy all charts (for theme switch refresh) */
  function destroyAll() {
    Object.keys(activeCharts).forEach(destroy);
  }

  return { createLineChart, createBarChart, createRadarChart, createHorizontalBar, destroy, destroyAll };
})();
