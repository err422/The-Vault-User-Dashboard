// =============================================================
// Shared Utilities — loaded by every page
// =============================================================

// -------------------------------------------------------------
// FORMAT HELPERS
// -------------------------------------------------------------

// Format raw seconds into "2h 30m" or "45m"
function formatPlaytime(seconds) {
  if (!seconds || seconds === 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Format a date string into "Feb 28, 2024"
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}


// -------------------------------------------------------------
// LEVEL & XP HELPERS
// -------------------------------------------------------------

// Calculate level from XP: floor(sqrt(xp / 100)) + 1
// This creates exponential cost per level — same as the backend
function calculateLevel(xp) {
  if (!xp || xp < 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// How many total XP does a given level START at?
function calculateXPForLevel(level) {
  return Math.pow(level - 1, 2) * 100;
}

// What percentage of the way through the current level is the user?
// Returns 0–100
function calculateXPProgress(xp) {
  const currentLevel = calculateLevel(xp);
  const xpForCurrentLevel = calculateXPForLevel(currentLevel);
  const xpForNextLevel = calculateXPForLevel(currentLevel + 1);
  const xpIntoLevel = xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  return (xpIntoLevel / xpNeeded) * 100;
}

// Get display title from level
function getTitle(level) {
  if (level < 5)  return 'Novice';
  if (level < 10) return 'Explorer';
  if (level < 15) return 'Veteran';
  if (level < 20) return 'Expert';
  if (level < 30) return 'Master';
  if (level < 50) return 'Legend';
  return 'Mythic';
}


// -------------------------------------------------------------
// TOAST NOTIFICATIONS
// -------------------------------------------------------------

// Show a small notification that slides in from the right and
// disappears after 3 seconds. Styled to match the Vault palette.
function showToast(message, type = 'info') {
  // Pick border/text color based on type
  const colors = {
    success: { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.3)',  text: '#4ade80' },
    error:   { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', text: '#f87171' },
    info:    { bg: 'rgba(143,104,255,0.15)', border: 'rgba(143,104,255,0.3)', text: '#b99dff' }
  };

  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${c.bg};
    border: 1px solid ${c.border};
    color: ${c.text};
    padding: 14px 22px;
    border-radius: 12px;
    backdrop-filter: blur(20px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: 'Poppins', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    animation: toastIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Inject the toast animation keyframes once
if (!document.getElementById('toast-styles')) {
  const style = document.createElement('style');
  style.id = 'toast-styles';
  style.textContent = `
    @keyframes toastIn  { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes toastOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } }
  `;
  document.head.appendChild(style);
}


// -------------------------------------------------------------
// AUTH HELPER
// -------------------------------------------------------------

// Firebase's onAuthStateChanged is callback-based. We wrap it in
// a Promise so we can use `await` anywhere we need the auth state.
function checkAuth() {
  return new Promise((resolve) => {
    auth.onAuthStateChanged((user) => {
      resolve(user);
    });
  });
}


// -------------------------------------------------------------
// NAVBAR
// -------------------------------------------------------------

// renderNavbar() is called at the top of every page's init function.
// It inserts the navbar HTML at the start of <body>, then sets the
// active link based on the current URL.

async function renderNavbar() {
  const user = await checkAuth();
  const currentPath = window.location.pathname;

  // Helper: should this nav link be marked active?
  function isActive(path) {
    if (path === '/' && (currentPath === '/' || currentPath === '/index.html')) return true;
    if (path !== '/' && currentPath === path) return true;
    return false;
  }

  const navbarHTML = `
    <nav class="navbar">
      <div class="navbar-content">

        <!-- Left: logo -->
        <a href="/" class="navbar-brand">
          <div class="navbar-brand-icon">V</div>
          <span class="gradient-text">THE VAULT</span>
        </a>

        <!-- Centre: glass pill nav links -->
        <div class="navbar-links">
          <a href="/" class="${isActive('/') ? 'active' : ''}">Home</a>
          <a href="/mystats.html" class="${isActive('/mystats.html') ? 'active' : ''}">My Stats</a>
        </div>

        <!-- Right: user chip or sign-in button -->
        <div class="user-menu">
          ${user ? `
            <div class="user-chip">
              <div class="user-avatar">${user.email[0].toUpperCase()}</div>
              <span style="font-size:0.82rem;font-weight:600;">
                ${user.email.split('@')[0]}
              </span>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="handleSignOut()">
              Sign Out
            </button>
          ` : `
            <button class="btn btn-sm btn-primary" onclick="window.location.href='/mystats.html'">
              Sign In
            </button>
          `}
        </div>

      </div>
    </nav>
  `;

  document.body.insertAdjacentHTML('afterbegin', navbarHTML);
}

// Sign out and return to homepage
async function handleSignOut() {
  try {
    await auth.signOut();
    showToast('Signed out successfully', 'success');
    setTimeout(() => { window.location.href = '/'; }, 1000);
  } catch (error) {
    showToast('Error signing out: ' + error.message, 'error');
  }
}


// -------------------------------------------------------------
// ACHIEVEMENT DEFINITIONS
// -------------------------------------------------------------

// Each achievement has:
//   id          — unique key
//   name        — display title
//   description — what you need to do
//   icon        — emoji
//   check(stats, last7Days) — returns true if unlocked

const ACHIEVEMENTS = [
  {
    id: 'first_game',
    name: 'First Steps',
    description: 'Play your first game',
    icon: '🎮',
    check: (stats) => stats.gamesPlayed >= 1
  },
  {
    id: 'ten_games',
    name: 'Game Explorer',
    description: 'Play 10 different games',
    icon: '🗺️',
    check: (stats) => stats.gamesPlayed >= 10
  },
  {
    id: 'one_hour',
    name: 'Dedicated',
    description: 'Play for 1 hour total',
    icon: '⏱️',
    check: (stats) => stats.totalPlaytime >= 3600
  },
  {
    id: 'ten_hours',
    name: 'Veteran',
    description: 'Play for 10 hours total',
    icon: '🏆',
    check: (stats) => stats.totalPlaytime >= 36000
  },
  {
    id: 'fifty_hours',
    name: 'Committed',
    description: 'Play for 50 hours total',
    icon: '💪',
    check: (stats) => stats.totalPlaytime >= 180000
  },
  {
    id: 'level_5',
    name: 'Rising',
    description: 'Reach level 5',
    icon: '⭐',
    check: (stats) => stats.level >= 5
  },
  {
    id: 'level_10',
    name: 'Expert',
    description: 'Reach level 10',
    icon: '💎',
    check: (stats) => stats.level >= 10
  },
  {
    id: 'level_20',
    name: 'Legend',
    description: 'Reach level 20',
    icon: '👑',
    check: (stats) => stats.level >= 20
  },
  {
    id: 'seven_day_streak',
    name: 'Consistent',
    description: 'Play every day for 7 days',
    icon: '🔥',
    check: (stats, last7Days) => {
      return last7Days && last7Days.every(day => day.minutes > 0);
    }
  }
];

// Calculate which achievements are unlocked for a given stats object
function calculateAchievements(stats, last7Days) {
  const list = ACHIEVEMENTS.map(achievement => ({
    ...achievement,
    unlocked: achievement.check(stats, last7Days)
  }));

  return {
    list,
    unlockedCount: list.filter(a => a.unlocked).length,
    total: ACHIEVEMENTS.length
  };
}


console.log('Shared utilities loaded');