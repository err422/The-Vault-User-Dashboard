// Home Page Logic - TrackR Style
// Displays global stats, leaderboard, and user browser

let allUsers = [];

// Initialize page
async function initHomePage() {
    console.log('🏠 Initializing home page...');
    
    // Render user menu
    await renderUserMenu();
    
    // Load data
    await loadGlobalData();
}

// Render user menu (sign in status)
async function renderUserMenu() {
    const user = await checkAuth();
    const menuContent = document.getElementById('user-menu-content');
    
    if (user) {
        const initials = user.email.slice(0, 2).toUpperCase();
        menuContent.innerHTML = `
            <div class="user-avatar">${initials}</div>
        `;
    } else {
        menuContent.innerHTML = `
            <button class="btn btn-primary" onclick="window.location.href='/mystats.html'" style="padding: 6px 14px; font-size: 12px;">
                Sign In
            </button>
        `;
    }
}

// Load all data
async function loadGlobalData() {
    try {
        // Fetch global stats from backend API
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
    document.getElementById('total-users').textContent = stats.totalUsers;
    document.getElementById('recent-signups').textContent = stats.recentSignups;
    document.getElementById('total-playtime').textContent = stats.totalPlaytimeFormatted;
    document.getElementById('total-games').textContent = stats.totalGames;
    document.getElementById('total-websites').textContent = stats.totalWebsites;
}

// Render leaderboard
async function renderLeaderboard() {
    try {
        // Fetch detailed user data from Firebase for playtime calculation
        const snapshot = await database.ref('users').once('value');
        const users = snapshot.val();
        
        if (!users) {
            document.getElementById('leaderboard-body').innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <div class="empty-state-icon">🎮</div>
                        <div style="color: var(--muted2);">No players yet!</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Calculate total playtime for each user
        const leaderboard = Object.entries(users).map(([uid, userData]) => {
            let totalPlaytime = 0;
            
            if (userData.playtime && userData.playtime.total) {
                totalPlaytime = Object.values(userData.playtime.total).reduce((sum, seconds) => {
                    const num = Number(seconds);
                    return sum + (isNaN(num) ? 0 : num);
                }, 0);
            }
            
            // Calculate level (1 minute = 1 XP)
            const xp = Math.floor(totalPlaytime / 60);
            const level = calculateLevel(xp);
            const xpProgress = calculateXPProgress(xp);
            const title = getTitle(level);
            
            // Count games played
            const gamesPlayed = userData.playtime?.total 
                ? Object.keys(userData.playtime.total).length 
                : 0;
            
            return {
                uid,
                username: userData.username || 'Unknown',
                email: userData.email || '',
                totalPlaytime,
                level,
                xpProgress,
                title,
                gamesPlayed
            };
        });
        
        // Sort by playtime (descending)
        leaderboard.sort((a, b) => b.totalPlaytime - a.totalPlaytime);
        
        // Take top 20 for leaderboard
        const top20 = leaderboard.slice(0, 20);
        
        // Check if anyone has playtime
        if (top20.every(user => user.totalPlaytime === 0)) {
            document.getElementById('leaderboard-body').innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <div class="empty-state-icon">⏱️</div>
                        <div style="color: var(--muted2);">No playtime recorded yet. Start playing!</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Render leaderboard rows
        let html = '';
        
        top20.forEach((user, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-n';
            const initials = user.username.slice(0, 2).toUpperCase();
            const playtimeStr = formatPlaytime(user.totalPlaytime);
            
            html += `
                <tr style="cursor: pointer;" onclick="window.location.href='/user.html?uid=${user.uid}'">
                    <td>
                        <span class="rank-badge ${rankClass}">${rank}</span>
                    </td>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar-sm">${initials}</div>
                            <div>
                                <div class="user-name">${user.username}</div>
                                <div class="user-email">${user.email}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="title-pill title-${user.title}">${user.title}</span>
                    </td>
                    <td>
                        <div class="xp-bar-wrap">
                            <div class="xp-bar">
                                <div class="xp-fill" style="width: ${user.xpProgress}%"></div>
                            </div>
                            <span class="xp-text">Lv.${user.level}</span>
                        </div>
                    </td>
                    <td class="text-muted">${user.gamesPlayed}</td>
                    <td>
                        <span class="mono" style="color: var(--muted2);">${playtimeStr}</span>
                    </td>
                </tr>
            `;
        });
        
        document.getElementById('leaderboard-body').innerHTML = html;
        
        // Setup search
        setupSearch(leaderboard);
        
    } catch (error) {
        console.error('❌ Error loading leaderboard:', error);
        document.getElementById('leaderboard-body').innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="error-message">Failed to load leaderboard</div>
                </td>
            </tr>
        `;
    }
}

// Setup search functionality
function setupSearch(allLeaderboardUsers) {
    const searchInput = document.getElementById('user-search');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        if (!query) {
            // Show top 20 again
            renderFilteredLeaderboard(allLeaderboardUsers.slice(0, 20));
            return;
        }
        
        // Filter users
        const filtered = allLeaderboardUsers.filter(user =>
            user.username.toLowerCase().includes(query) ||
            (user.email && user.email.toLowerCase().includes(query))
        ).slice(0, 20);
        
        renderFilteredLeaderboard(filtered);
    });
}

// Render filtered leaderboard results
function renderFilteredLeaderboard(users) {
    const tbody = document.getElementById('leaderboard-body');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <div style="color: var(--muted2);">No users found</div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    users.forEach((user, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-n';
        const initials = user.username.slice(0, 2).toUpperCase();
        const playtimeStr = formatPlaytime(user.totalPlaytime);
        
        html += `
            <tr style="cursor: pointer;" onclick="window.location.href='/user.html?uid=${user.uid}'">
                <td>
                    <span class="rank-badge ${rankClass}">${rank}</span>
                </td>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-sm">${initials}</div>
                        <div>
                            <div class="user-name">${user.username}</div>
                            <div class="user-email">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="title-pill title-${user.title}">${user.title}</span>
                </td>
                <td>
                    <div class="xp-bar-wrap">
                        <div class="xp-bar">
                            <div class="xp-fill" style="width: ${user.xpProgress}%"></div>
                        </div>
                        <span class="xp-text">Lv.${user.level}</span>
                    </div>
                </td>
                <td class="text-muted">${user.gamesPlayed}</td>
                <td>
                    <span class="mono" style="color: var(--muted2);">${playtimeStr}</span>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Render user list (grid below leaderboard)
function renderUserList(users) {
    const userListDiv = document.getElementById('user-list');
    
    if (users.length === 0) {
        userListDiv.innerHTML = `
            <div style="grid-column: 1 / -1;">
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>No users yet!</p>
                </div>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // Show first 12 users in grid
    users.slice(0, 12).forEach(user => {
        const initials = user.username.slice(0, 2).toUpperCase();
        
        html += `
            <div 
                style="
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 16px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                "
                onclick="window.location.href='/user.html?uid=${user.uid}'"
                onmouseover="this.style.borderColor='var(--accent)'; this.style.transform='translateY(-2px)';"
                onmouseout="this.style.borderColor='var(--border)'; this.style.transform='translateY(0)';"
            >
                <div style="
                    width: 48px;
                    height: 48px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, var(--accent), var(--accent2));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    font-weight: 800;
                    margin: 0 auto 12px;
                ">${initials}</div>
                
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">
                    ${user.username}
                </div>
                <div style="font-size: 11px; color: var(--muted);">
                    Joined ${formatDate(user.createdAt)}
                </div>
            </div>
        `;
    });
    
    userListDiv.innerHTML = html;
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', initHomePage);