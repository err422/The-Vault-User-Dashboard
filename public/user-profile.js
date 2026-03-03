// User Profile Page Logic
// Displays any user's public stats

let profileChart = null;

// Initialize page
async function initUserProfilePage() {
    console.log('👤 Initializing user profile page...');
    
    // Render navbar
    await renderNavbar();
    
    // Get UID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get('uid');
    
    if (!uid) {
        showError('No user ID provided');
        return;
    }
    
    // Load user data
    await loadUserProfile(uid);
}

// Load user profile
async function loadUserProfile(uid) {
    try {
        // Fetch from our backend API
        const response = await fetch(`/api/users/${uid}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'User not found');
        }
        
        const userData = data.data;
        
        // Calculate last 7 days
        const last7Days = calculateLast7Days(userData);
        
        // Render profile
        renderUserProfile(userData, last7Days);
        
        // Hide loading, show profile
        document.getElementById('loading').style.display = 'none';
        document.getElementById('profile').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Error loading profile:', error);
        showError(error.message);
    }
}

// Calculate last 7 days (same as mystats.js)
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

// Render user profile (similar to personal stats)
function renderUserProfile(userData, last7Days) {
    const stats = userData.stats;
    
    const html = `
        <div class="page-header">
            <h1>👤 ${userData.username}</h1>
            <p>${userData.email}</p>
        </div>
        
        <!-- Level Display -->
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
                    <div class="stat-value">${stats.totalPlaytimeFormatted}</div>
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
            <canvas id="profile-chart"></canvas>
        </div>
    `;
    
    document.getElementById('profile').innerHTML = html;
    
    // Render chart
    renderProfileChart(last7Days);
}

// Render chart (same as mystats.js)
function renderProfileChart(days) {
    const ctx = document.getElementById('profile-chart').getContext('2d');
    
    if (profileChart) {
        profileChart.destroy();
    }
    
    profileChart = new Chart(ctx, {
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

// Show error
function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    document.getElementById('error-text').textContent = message;
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', initUserProfilePage);