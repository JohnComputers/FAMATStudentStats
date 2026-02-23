/**
 * app.js — Main application controller
 * Handles routing, auth UI, theme, and page lifecycle.
 */

(function () {
  // ── State ──────────────────────────────────────────────────────────────
  let currentPage = 'dashboard';

  // ── DOM Refs ───────────────────────────────────────────────────────────
  const loginScreen   = document.getElementById('login-screen');
  const appShell      = document.getElementById('app-shell');
  const loginForm     = document.getElementById('login-form');
  const loginError    = document.getElementById('login-error');
  const loginBtn      = document.getElementById('login-btn');
  const logoutBtn     = document.getElementById('logout-btn');
  const sidebar       = document.getElementById('sidebar');
  const mainContent   = document.getElementById('main-content');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const themeToggle   = document.getElementById('theme-toggle');
  const themeIcon     = document.getElementById('theme-icon');
  const pageTitle     = document.getElementById('page-title');
  const userNameEl    = document.getElementById('user-name-display');
  const userChip      = document.getElementById('user-chip');

  // ── Auth flow ──────────────────────────────────────────────────────────
  AUTH.onLogin(user => {
    loginScreen.classList.add('hidden');
    appShell.classList.remove('hidden');

    // Update user chip
    const initial = AUTH.getUserInitial();
    const name = AUTH.getUserName();
    document.querySelector('.user-avatar').textContent = initial;
    userNameEl.textContent = name.length > 20 ? name.slice(0, 20) + '…' : name;

    navigateTo(currentPage);
  });

  AUTH.onLogout(() => {
    appShell.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginForm.reset();
  });

  AUTH.init();

  // ── Login form ─────────────────────────────────────────────────────────
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    loginError.classList.add('hidden');
    loginBtn.innerHTML = '<span class="loader" style="width:16px;height:16px;border-width:2px;vertical-align:middle"></span> Signing in…';
    loginBtn.disabled = true;

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const result   = await AUTH.signIn(email, password);

    if (!result.success) {
      loginError.textContent = result.error;
      loginError.classList.remove('hidden');
      loginBtn.innerHTML = '<span>Sign In</span>';
      loginBtn.disabled = false;
    }
  });

  logoutBtn.addEventListener('click', () => AUTH.signOut());

  // ── Routing ────────────────────────────────────────────────────────────
  const PAGE_TITLES = {
    dashboard: 'Dashboard',
    students:  'Students',
    analytics: 'Analytics',
    compare:   'Compare',
    import:    'Import Data'
  };

  const PAGE_RENDERERS = {
    dashboard: PageDashboard.render,
    students:  PageStudents.render,
    analytics: PageAnalytics.render,
    compare:   PageCompare.render,
    import:    PageImport.render
  };

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  function navigateTo(page) {
    if (!PAGE_RENDERERS[page]) page = 'dashboard';
    currentPage = page;

    // Update nav active state
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === page);
    });

    // Update page title
    pageTitle.textContent = PAGE_TITLES[page] || page;

    // Show correct page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');

    // Render page content
    PAGE_RENDERERS[page]();
  }

  // ── Sidebar collapse ───────────────────────────────────────────────────
  let sidebarCollapsed = localStorage.getItem('sidebar-collapsed') === '1';
  if (sidebarCollapsed) {
    sidebar.classList.add('collapsed');
    mainContent.classList.add('expanded');
  }

  sidebarToggle.addEventListener('click', () => {
    sidebarCollapsed = !sidebarCollapsed;
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
    mainContent.classList.toggle('expanded', sidebarCollapsed);
    localStorage.setItem('sidebar-collapsed', sidebarCollapsed ? '1' : '0');
  });

  // ── Theme toggle ───────────────────────────────────────────────────────
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'dark' ? '☀' : '☾';
    localStorage.setItem('theme', theme);
    // Re-render active page charts after theme change
    if (!appShell.classList.contains('hidden')) {
      CHARTS.destroyAll();
      setTimeout(() => PAGE_RENDERERS[currentPage]?.(), 50);
    }
  }

  // ── Toast helper (global) ──────────────────────────────────────────────
  window.showToast = function (message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.add('hidden'), 3500);
  };

})();
