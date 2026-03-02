// Home Page Logic
// Displays global stats, leaderboard, and user browser

let allUsers = [];  // Kept in memory for live search filtering

// Called when the page DOM is ready
async function initHomePage() {
    console.log('🏠 Initializing home page...');
    await renderNavbar();
    await loadGlobalData();
}

// Fetch all data then render
async function loadGlobalData() {
    try {
        // Fetch global totals from our Express backend
        const statsResponse = await fetch('/api/stats');
        const statsData = await statsResponse.json();
        if (!statsData.success) throw new Error(statsData.error || 'Failed to load stats');

        // Fetch the user list from our Express backend
        const usersResponse = await fetch('/api/users');
        const usersData = await usersResponse.json();
        if (!usersData.success) throw new Error('Failed to load users');

        allUsers = usersData.data;

        // Render each section
        renderGlobalStats(statsData.data);
        await renderLeaderboard();
        renderUserList(allUsers);

        // Swap loading → content
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';

    } catch (error) {
        console.error('❌ Error loading data:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error-text').textContent = error.message;
    }
}

// Render the 4 KPI cards at the top using our kpi-strip CSS classes
function renderGlobalStats(stats) {
    const html = `
        <div class="sec-head" style="margin-bottom:14px;">
            <div class="sec-title">Platform Overview</div>
        </div>

        <div class="kpi-strip" style="margin-bottom:24px;">

            <div class="kpi-card">
                <div class="kpi-badge badge-purple">All Time</div>
                <div class="kpi-value">${stats.totalUsers.toLocaleString()}</div>
                <div class="kpi-label">Total Players</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-badge badge-blue">${stats.recentSignups} this week</div>
                <div class="kpi-value">${stats.totalPlaytimeFormatted}</div>
                <div class="kpi-label">Combined Playtime</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-badge badge-green">Custom</div>
                <div class="kpi-value">${stats.totalGames.toLocaleString()}</div>
                <div class="kpi-label">Games Tracked</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-badge badge-red">Custom</div>
                <div class="kpi-value">${stats.totalWebsites.toLocaleString()}</div>
                <div class="kpi-label">Websites Tracked</div>
            </div>

        </div>
    `;

    document.getElementById('global-stats').innerHTML = html;
}

// Render the top-10 leaderboard
// We fetch full user data directly from Firebase here because
// the backend's /api/users only returns basic profile info, not playtime.
async function renderLeaderboard() {
    try {
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

        // Build an array with calculated playtime for each user
        const leaderboard = Object.entries(users).map(([uid, userData]) => {
            let totalPlaytime = 0;

            if (userData.playtime && userData.playtime.total) {
                totalPlaytime = Object.values(userData.playtime.total).reduce((sum, seconds) => {
                    return sum + (Number(seconds) || 0);
                }, 0);
            }

            const xp = Math.floor(totalPlaytime / 60);
            const level = calculateLevel(xp);

            return {
                uid,
                username: userData.username || 'Unknown',
                totalPlaytime,
                level,
                title: getTitle(level)
            };
        });

        // Sort highest playtime first, take top 10
        leaderboard.sort((a, b) => b.totalPlaytime - a.totalPlaytime);
        const top10 = leaderboard.slice(0, 10);

        if (top10.every(user => user.totalPlaytime === 0)) {
            document.getElementById('leaderboard').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⏱️</div>
                    <p>No playtime recorded yet. Start playing to appear here!</p>
                </div>
            `;
            return;
        }

        // Render leaderboard entries
        // The first 3 get the "top3" CSS class for a purple tint
        const html = top10.map((user, index) => {
            const rank = index === 0 ? '🥇'
                       : index === 1 ? '🥈'
                       : index === 2 ? '🥉'
                       : `${index + 1}`;

            const entryClass = index < 3 ? 'lb-entry top3' : 'lb-entry';

            return `
                <a class="${entryClass}" href="/user.html?uid=${user.uid}">
                    <div class="lb-rank">${rank}</div>
                    <div class="lb-info">
                        <div class="lb-name">@${user.username}</div>
                        <div class="lb-sub">Level ${user.level} · ${user.title}</div>
                    </div>
                    <div class="lb-time">${formatPlaytime(user.totalPlaytime)}</div>
                </a>
            `;
        }).join('');

        document.getElementById('leaderboard').innerHTML = html;

    } catch (error) {
        console.error('❌ Error loading leaderboard:', error);
        document.getElementById('leaderboard').innerHTML = `
            <div class="error-message">Failed to load leaderboard</div>
        `;
    }
}

// Render the user grid and wire up the search box
function renderUserList(users) {
    const container = document.getElementById('user-list');

    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p>No users found</p>
            </div>
        `;
        return;
    }

    // Build a card for each user
    const cardsHTML = users.map(user => `
        <a class="user-card" href="/user.html?uid=${user.uid}">
            <div class="user-card-avatar">👤</div>
            <div class="user-card-name">@${user.username}</div>
            <div class="user-card-date">Joined ${formatDate(user.createdAt)}</div>
        </a>
    `).join('');

    container.innerHTML = `<div class="user-grid">${cardsHTML}</div>`;

    // Wire up the search box — runs on every keystroke
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = allUsers.filter(user =>
                user.username.toLowerCase().includes(query)
            );
            renderUserList(filtered);
        });
    }
}

document.addEventListener('DOMContentLoaded', initHomePage);