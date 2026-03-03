// My Stats Page Logic
// Handles authentication and personal stats display

let currentUser = null;
let activityChart = null;

// Initialize page
async function initMyStatsPage() {
    console.log('📊 Initializing My Stats page...');
    
    // Render navbar
    await renderNavbar();
    
    // Check auth state
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        
        if (user) {
            // User is signed in
            console.log('✅ User signed in:', user.email);
            await loadPersonalStats();
        } else {
            // User is not signed in
            console.log('❌ User not signed in');
            showSignInForm();
        }
    });
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
            // onAuthStateChanged will trigger and load stats
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
    const html = `
        <div class="page-header">
            <h1>📊 My Stats</h1>
            <p>@${userData.username}</p>
        </div>
        
        <!-- Level Progress -->
        <div class="card card-dark">
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 60px; margin-bottom: 10px;">👤</div>
                <h2 style="font-size: 2rem; margin-bottom: 5px;">
                    Level ${stats.level}
                </h2>
                <p style="color: #999; font-size: 1.1rem;">
                    ${stats.title}
                </p>
            </div>
            
            <!-- XP Progress Bar -->
            <div style="margin-bottom: 10px;">
                <div style="
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                    height: 30px;
                    overflow: hidden;
                    position: relative;
                ">
                    <div style="
                        background: linear-gradient(90deg, #667eea, #764ba2);
                        height: 100%;
                        width: ${stats.xpProgress}%;
                        border-radius: 10px;
                        transition: width 1s ease;
                    "></div>
                    <div style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: 700;
                        font-size: 14px;
                    ">
                        ${Math.floor(stats.xpProgress)}% to Level ${stats.level + 1}
                    </div>
                </div>
            </div>
            <div style="text-align: center; color: #999; font-size: 14px;">
                ${stats.xp} XP
            </div>
        </div>
        
        <!-- Stats Cards -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">⏱️</div>
                <div class="stat-info">
                    <h3>Total Playtime</h3>
                    <div class="stat-value">${formatPlaytime(stats.totalPlaytime)}</div>
                    <div class="stat-label">All time</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">🎮</div>
                <div class="stat-info">
                    <h3>Games Played</h3>
                    <div class="stat-value">${stats.gamesPlayed}</div>
                    <div class="stat-label">Unique games</div>
                </div>
            </div>
            
            ${stats.favoriteGame.name !== 'None' ? `
                <div class="stat-card">
                    <div class="stat-icon">👑</div>
                    <div class="stat-info">
                        <h3>Favorite Game</h3>
                        <div class="stat-value" style="font-size: 1.5rem;">
                            ${stats.favoriteGame.name}
                        </div>
                        <div class="stat-label">
                            ${formatPlaytime(stats.favoriteGame.playtime)} played
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
        
        <!-- 7-Day Activity Chart -->
        <div class="card card-dark">
            <div class="card-header">
                <h2 class="card-title">
                    <span>📈</span>
                    Last 7 Days
                </h2>
            </div>
            <canvas id="activity-chart"></canvas>
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
        type: 'line',
        data: {
            labels: days.map(d => d.dayName),
            datasets: [{
                label: 'Playtime (minutes)',
                data: days.map(d => d.minutes),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3
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
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff',
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
                        color: '#999',
                        callback: function(value) {
                            return value + 'm';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#999'
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