/**
 * auth.js — Firebase Authentication
 * Handles teacher login/logout and auth state management.
 */

const AUTH = (() => {
  let currentUser = null;
  const onLoginCallbacks = [];
  const onLogoutCallbacks = [];

  function onLogin(cb) { onLoginCallbacks.push(cb); }
  function onLogout(cb) { onLogoutCallbacks.push(cb); }

  function init() {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        currentUser = user;
        DB.init();
        onLoginCallbacks.forEach(cb => cb(user));
      } else {
        currentUser = null;
        onLogoutCallbacks.forEach(cb => cb());
      }
    });
  }

  async function signIn(email, password) {
    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
      return { success: true };
    } catch (e) {
      const messages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/too-many-requests': 'Too many failed attempts. Try again later.',
        'auth/network-request-failed': 'Network error. Check your connection.',
      };
      return { success: false, error: messages[e.code] || e.message };
    }
  }

  async function signOut() {
    await firebase.auth().signOut();
  }

  function getUser() { return currentUser; }

  function getUserInitial() {
    if (!currentUser) return "T";
    return (currentUser.displayName || currentUser.email || "T")[0].toUpperCase();
  }

  function getUserName() {
    if (!currentUser) return "Teacher";
    return currentUser.displayName || currentUser.email || "Teacher";
  }

  return { init, onLogin, onLogout, signIn, signOut, getUser, getUserInitial, getUserName };
})();
