// Shared JavaScript Utilities
// Functions used across all pages

// Format seconds into readable time
function formatPlaytime(seconds) {
  if (!seconds || seconds === 0) return '0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Calculate level from XP
function calculateLevel(xp) {
  if (!xp || xp < 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// Calculate XP for a specific level
function calculateXPForLevel(level) {
  return Math.pow(level - 1, 2) * 100;
}

// Calculate XP progress percentage
function calculateXPProgress(xp) {
  const currentLevel = calculateLevel(xp);
  const xpForCurrentLevel = calculateXPForLevel(currentLevel);
  const xpForNextLevel = calculateXPForLevel(currentLevel + 1);
  const xpIntoLevel = xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  
  return (xpIntoLevel / xpNeeded) * 100;
}

// Get title based on level
function getTitle(level) {
  if (level < 5) return 'Novice';
  if (level < 10) return 'Explorer';
  if (level < 15) return 'Veteran';
  if (level < 20) return 'Expert';
  if (level < 30) return 'Master';
  if (level < 50) return 'Legend';
  return 'Mythic';
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#667eea'};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    font-weight: 600;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add toast animations
if (!document.getElementById('toast-styles')) {
  const style = document.createElement('style');
  style.id = 'toast-styles';
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// Check if user is authenticated
function checkAuth() {
  return new Promise((resolve) => {
    auth.onAuthStateChanged((user) => {
      resolve(user);
    });
  });
}

// Render navigation bar
async function renderNavbar() {
  const user = await checkAuth();
  const currentPath = window.location.pathname;
  
  const navbarHTML = `
    <nav class="navbar">
      <div class="navbar-content">
        <a href="/" class="navbar-brand">
          🔐 The Vault Stats
        </a>
        
        <div class="navbar-links">
          <a href="/" class="${(currentPath === '/' || currentPath === '/index.html') ? 'active' : ''}">
            Home
          </a>
          ${user ? `
            <a href="/mystats.html" class="${currentPath === '/mystats.html' ? 'active' : ''}">
              My Stats
            </a>
          ` : ''}
        </div>
        
        <div class="user-menu">
          ${user ? `
            <div class="user-avatar">👤</div>
            <span style="color: white; font-weight: 500;">
              ${user.email.split('@')[0]}
            </span>
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

// Handle sign out
async function handleSignOut() {
  try {
    await auth.signOut();
    showToast('Signed out successfully', 'success');
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  } catch (error) {
    showToast('Error signing out: ' + error.message, 'error');
  }
}

// Achievement definitions
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
        name: 'Dedicated Player',
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
        id: 'level_5',
        name: 'Rising Star',
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

// Calculate user achievements
function calculateAchievements(stats, last7Days) {
    const achievements = ACHIEVEMENTS.map(achievement => ({
        ...achievement,
        unlocked: achievement.check(stats, last7Days)
    }));
    
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    
    return {
        list: achievements,
        unlockedCount,
        total: ACHIEVEMENTS.length
    };
}

console.log('Shared utilities loaded');