// My Stats Page Logic - TrackR Style
// Handles authentication and personal stats display

let currentUser = null;
let activityChart = null;

// Initialize page
async function initMyStatsPage() {
    console.log('📊 Initializing My Stats page...');
    
    // Check auth state
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        
        if (user) {
            // User is signed in
            console.log('✅ User signed in:', user.email);
            await renderUserMenu();
            await loadPersonalStats();
        } else {
            // User is not signed in
            console.log('❌ User not signed in');
            showSignInForm();
        }
    });
}

// Render user menu
async function renderUserMenu() {
    const menuContent = document.getElementById('user-menu-content');
    const initials = currentUser.email.slice(0, 2).toUpperCase();
    
    menuContent.innerHTML = `
        <div class="user-avatar">${initials}</div>
        <button class="btn btn-secondary" onclick="handleSignOut()" style="padding: 6px 14px; font-size: 12px;">
            Sign Out
        </button>
    `;
}

// Show sign in form
function showSignInForm() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('auth-form').style.display = 'block';
    
    // Handle form submission
    document.getElementById('signin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            showToast('Signed in successfully!', 'success');
        } catch (error) {
            console.error('Sign in error:', error);
            showToast('Sign in failed: ' + error.message, 'error');
        }
    });
}

// Load personal stats
async function loadPersonalStats() {
    try {
        // Hide auth form, show loading
        document.getElementById('auth-form').style.display = 'none';
        document.getElementById('loading').style.display = 'block';
        
        // Fetch user data from Firebase
        const userSnapshot = await database.ref(`users/${currentUser.uid}`).once('value');
        const userData = userSnapshot.val();
        
        if (!userData) {
            throw new Error('User data not found');
        }
        
        // Calculate stats
        const stats = calculateDetailedStats(userData);
        
        // Render personal stats
        renderPersonalStats(stats, userData);
        
        // Hide loading, show stats
        document.getElementById('loading').style.display = 'none';
        document.getElementById('personal-stats').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Error loading personal stats:', error);
        document.getElementById('loading').style.display = 'none';
        showToast('Error loading stats: ' + error.message, 'error');
    }
}

// Calculate detailed user stats
function calculateDetailedStats(userData) {
    const stats = {
        totalPlaytime: 0,
        gamesPlayed: 0,
        favoriteGame: { name: 'None', playtime: 0 },
        level: 1,
        xp: 0,
        xpProgress: 0,
        title: 'Novice',
        last7Days: []
    };
    
    // Calculate total playtime
    if (userData.playtime && userData.playtime.total) {
        const gameTimes = userData.playtime.total;
        
        stats.totalPlaytime = Object.values(gameTimes).reduce((sum, seconds) => {
            return sum + (Number(seconds) || 0);
        }, 0);
        
        stats.gamesPlayed = Object.keys(gameTimes).length;
        
        // Find favorite game
        let maxTime = 0;
        let favoriteGameId = null;
        
        Object.entries(gameTimes).forEach(([gameId, seconds]) => {
            const time = Number(seconds) || 0;
            if (time > maxTime) {
                maxTime = time;
                favoriteGameId = gameId;
            }
        });
        
        if (favoriteGameId) {
            stats.favoriteGame = {
                id: favoriteGameId,
                name: favoriteGameId,
                playtime: maxTime
            };
        }
    }
    
    // Calculate XP (1 minute = 1 XP)
    stats.xp = Math.floor(stats.totalPlaytime / 60);
    
    // Calculate level
    stats.level = calculateLevel(stats.xp);
    
    // Calculate XP progress
    stats.xpProgress = calculateXPProgress(stats.xp);
    
    // Get title
    stats.title = getTitle(stats.level);
    
    // Calculate last 7 days activity
    stats.last7Days = calculateLast7Days(userData);
    
    return stats;
}

// Calculate last 7 days activity
function calculateLast7Days(userData) {
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        let totalMinutes = 0;
        
        if (userData.playtime && userData.playtime.daily && userData.playtime.daily[dateStr]) {
            const dayData = userData.playtime.daily[dateStr];
            const seconds = Object.values(dayData).reduce((sum, s) => sum + Number(s), 0);
            totalMinutes = Math.floor(seconds / 60);
        }
        
        days.push({
            date: dateStr,
            dayName,
            minutes: totalMinutes
        });
    }
    
    return days;
}

// Render personal stats
function renderPersonalStats(stats, userData) {
    const initials = userData.username.slice(0, 2).toUpperCase();
    
    const html = `
        <div class="container">
            <!-- Page Header -->
            <div class="page-header">
                <h1 class="page-title">My Stats</h1>
                <p class="page-subtitle">@${userData.username}</p>
            </div>

            <!-- Profile Card -->
            <div class="profile-card" style="margin-bottom: 22px;">
                <div class="profile-banner">
                    <div class="profile-banner-pattern"></div>
                </div>
                <div class="profile-body">
                    <div class="profile-avatar-wrap">
                        <div class="profile-avatar">${initials}</div>
                    </div>
                    <div class="profile-username">${userData.username}</div>
                    <div class="profile-title-row">
                        <span class="title-pill title-${stats.title}">${stats.title}</span>
                    </div>
                    <div class="profile-stats">
                        <div class="ps-item">
                            <div class="ps-val" style="color: #a88dff;">${stats.level}</div>
                            <div class="ps-lbl">Level</div>
                        </div>
                        <div class="ps-item">
                            <div class="ps-val" style="color: #85aaff;">${stats.gamesPlayed}</div>
                            <div class="ps-lbl">Games</div>
                        </div>
                        <div class="ps-item">
                            <div class="ps-val" style="color: var(--green);">${formatPlaytime(stats.totalPlaytime)}</div>
                            <div class="ps-lbl">Playtime</div>
                        </div>
                    </div>
                    <div class="profile-xp-section">
                        <div class="profile-xp-top">
                            <span>XP Progress to Lv.${stats.level + 1}</span>
                            <span>${stats.xp} XP</span>
                        </div>
                        <div class="profile-xp-bar">
                            <div class="profile-xp-fill" style="width: ${stats.xpProgress}%"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid">
                <div class="stat-card purple">
                    <div class="stat-icon">⏱️</div>
                    <div class="stat-label">Total Playtime</div>
                    <div class="stat-value">${formatPlaytime(stats.totalPlaytime)}</div>
                    <div class="stat-meta">All time</div>
                </div>

                <div class="stat-card blue">
                    <div class="stat-icon">🎮</div>
                    <div class="stat-label">Games Played</div>
                    <div class="stat-value">${stats.gamesPlayed}</div>
                    <div class="stat-meta">Unique games</div>
                </div>

                ${stats.favoriteGame.name !== 'None' ? `
                    <div class="stat-card green">
                        <div class="stat-icon">👑</div>
                        <div class="stat-label">Favorite Game</div>
                        <div class="stat-value" style="font-size: 20px; font-weight: 700;">
                            ${stats.favoriteGame.name}
                        </div>
                        <div class="stat-meta">
                            ${formatPlaytime(stats.favoriteGame.playtime)} played
                        </div>
                    </div>
                ` : ''}

                <div class="stat-card yellow">
                    <div class="stat-icon">📈</div>
                    <div class="stat-label">This Week</div>
                    <div class="stat-value">
                        ${formatPlaytime(stats.last7Days.reduce((sum, d) => sum + d.minutes * 60, 0))}
                    </div>
                    <div class="stat-meta">Last 7 days</div>
                </div>
            </div>

            <!-- 7-Day Activity Chart -->
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Activity</div>
                        <div class="card-subtitle">Last 7 days</div>
                    </div>
                </div>
                <div class="card-body">
                    <canvas id="activity-chart" style="max-height: 300px;"></canvas>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('personal-stats').innerHTML = html;
    
    // Render the chart
    renderActivityChart(stats.last7Days);
}

// Render 7-day activity chart
function renderActivityChart(days) {
    const ctx = document.getElementById('activity-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (activityChart) {
        activityChart.destroy();
    }
    
    activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days.map(d => d.dayName),
            datasets: [{
                label: 'Playtime (minutes)',
                data: days.map(d => d.minutes),
                backgroundColor: 'rgba(124, 92, 252, 0.2)',
                borderColor: '#7c5cfc',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 19, 24, 0.95)',
                    titleColor: '#e8eaf0',
                    bodyColor: '#e8eaf0',
                    borderColor: '#1f2330',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const minutes = context.parsed.y;
                            const hours = Math.floor(minutes / 60);
                            const mins = minutes % 60;
                            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#5a607a',
                        font: {
                            family: 'JetBrains Mono',
                            size: 11
                        },
                        callback: function(value) {
                            return value + 'm';
                        }
                    },
                    grid: {
                        color: '#1f2330',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: '#8890a8',
                        font: {
                            family: 'Inter',
                            size: 12,
                            weight: 600
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', initMyStatsPage);