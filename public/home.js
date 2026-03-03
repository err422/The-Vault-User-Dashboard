// Home Page Logic
// Displays global stats, leaderboard, and user browser
let allUsers = [];

// Initialize page
async function initHomePage() {
    console.log('🏠 Initializing home page...');
    
    // Render navbar
    await renderNavbar();
    
    // Load data
    await loadGlobalData();
}

// Load all data
async function loadGlobalData() {
    try {
        // Fetch global stats from our backend API
        const statsResponse = await fetch('/api/stats');
        const statsData = await statsResponse.json();
        
        if (!statsData.success) {
            throw new Error(statsData.error || 'Failed to load stats');
        }
        
        // Fetch users list from backend API
        const usersResponse = await fetch('/api/users');
        const usersData = await usersResponse.json();
        
        if (!usersData.success) {
            throw new Error('Failed to load users');
        }
        
        allUsers = usersData.data;
        
        // Render everything
        renderGlobalStats(statsData.data);
        await renderLeaderboard();
        renderUserList(allUsers);
        
        // Hide loading, show content
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error-text').textContent = error.message;
    }
}

// Render global statistics cards
function renderGlobalStats(stats) {
    const html = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-info">
                    <h3>Total Players</h3>
                    <div class="stat-value">${stats.totalUsers}</div>
                    <div class="stat-label">${stats.recentSignups} new this week</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">⏱️</div>
                <div class="stat-info">
                    <h3>Total Playtime</h3>
                    <div class="stat-value">${stats.totalPlaytimeFormatted}</div>
                    <div class="stat-label">Combined playtime</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">🎮</div>
                <div class="stat-info">
                    <h3>Games</h3>
                    <div class="stat-value">${stats.totalGames}</div>
                    <div class="stat-label">Custom entries</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">🌐</div>
                <div class="stat-info">
                    <h3>Websites</h3>
                    <div class="stat-value">${stats.totalWebsites}</div>
                    <div class="stat-label">Custom entries</div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('global-stats').innerHTML = html;
}

// Render leaderboard
async function renderLeaderboard() {
    try {
        // Fetch detailed user data from Firebase for playtime calculation
        const snapshot = await database.ref('users').once('value');
        const users = snapshot.val();
        
        if (!users) {
            document.getElementById('leaderboard').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎮</div>
                    <p>No players yet!</p>
                </div>
            `;
            return;
        }
        
        // Calculate total playtime for each user
        const leaderboard = Object.entries(users).map(([uid, userData]) => {
            let totalPlaytime = 0;
            
            if (userData.playtime && userData.playtime.total) {
                // Sum all game playtime
                totalPlaytime = Object.values(userData.playtime.total).reduce((sum, seconds) => {
                    const num = Number(seconds);
                    return sum + (isNaN(num) ? 0 : num);
                }, 0);
            }
            
            // Calculate level (1 minute = 1 XP)
            const xp = Math.floor(totalPlaytime / 60);
            const level = calculateLevel(xp);
            
            return {
                uid,
                username: userData.username || 'Unknown',
                totalPlaytime,
                level
            };
        });
        
        // Sort by playtime (descending)
        leaderboard.sort((a, b) => b.totalPlaytime - a.totalPlaytime);
        
        // Take top 10
        const top10 = leaderboard.slice(0, 10);
        
        // Check if anyone has playtime
        if (top10.every(user => user.totalPlaytime === 0)) {
            document.getElementById('leaderboard').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⏱️</div>
                    <p>No playtime recorded yet. Start playing to appear here!</p>
                </div>
            `;
            return;
        }
        
        // Render leaderboard
        let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
        
        top10.forEach((user, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const playtimeStr = formatPlaytime(user.totalPlaytime);
            const title = getTitle(user.level);
            
            // Different styling for top 3
            const bgColor = index < 3 
                ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15))' 
                : 'rgba(255,255,255,0.05)';
            
            const borderColor = index < 3 
                ? 'rgba(251, 191, 36, 0.3)' 
                : 'rgba(255,255,255,0.1)';
            
            html += `
                <div style="
                    background: ${bgColor};
                    border: 1px solid ${borderColor};
                    border-radius: 10px;
                    padding: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                " onclick="window.location.href='/user.html?uid=${user.uid}'"
                onmouseover="this.style.transform='translateX(5px)'; this.style.background='rgba(255,255,255,0.1)';"
                onmouseout="this.style.transform='translateX(0)'; this.style.background='${bgColor}';">
                    
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span style="font-size: 28px; min-width: 50px; text-align: center;">
                            ${medal}
                        </span>
                        <div>
                            <div style="font-weight: 700; font-size: 18px; color: white;">
                                @${user.username}
                            </div>
                            <div style="font-size: 14px; color: #999;">
                                Level ${user.level} • ${title}
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: right;">
                        <div style="font-size: 18px; font-weight: 700; color: ${index < 3 ? '#fbbf24' : '#888'};">
                            ${playtimeStr}
                        </div>
                        <div style="font-size: 13px; color: #666;">
                            playtime
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        document.getElementById('leaderboard').innerHTML = html;
        
    } catch (error) {
        console.error('❌ Error loading leaderboard:', error);
        document.getElementById('leaderboard').innerHTML = `
            <div class="error-message">Failed to load leaderboard</div>
        `;
    }
}

// Render user list
function renderUserList(users) {
    if (users.length === 0) {
        document.getElementById('user-list').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p>No users yet!</p>
            </div>
        `;
        return;
    }
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; margin-top: 20px;">';
    
    users.forEach(user => {
        html += `
            <div style="
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                padding: 20px;
                cursor: pointer;
                transition: all 0.2s ease;
            " onclick="window.location.href='/user.html?uid=${user.uid}'"
            onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.transform='translateY(-3px)';"
            onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.transform='translateY(0)';">
                
                <div style="font-size: 40px; text-align: center; margin-bottom: 10px;">
                    👤
                </div>
                
                <div style="text-align: center;">
                    <div style="font-weight: 700; font-size: 16px; color: white; margin-bottom: 5px;">
                        @${user.username}
                    </div>
                    <div style="font-size: 13px; color: #999;">
                        Joined ${formatDate(user.createdAt)}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    document.getElementById('user-list').innerHTML = html;
    
    // Set up search functionality
    const searchInput = document.getElementById('user-search');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allUsers.filter(user => 
            user.username.toLowerCase().includes(query)
        );
        renderUserList(filtered);
    });
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', initHomePage);