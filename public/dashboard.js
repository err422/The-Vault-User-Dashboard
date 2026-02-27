// Dashboard JavaScript
// This file handles fetching data from our API and updating the UI

// Store our charts globally so we can update them
let distributionChart = null;
let contributorsChart = null;

// Main function to load all dashboard data
async function loadDashboard() {
    console.log('🔄 Loading dashboard data...');
    
    // Show loading, hide content and error
    document.getElementById('loading').style.display = 'block';
    document.getElementById('dashboard-content').style.display = 'none';
    document.getElementById('error').style.display = 'none';
    
    try {
        // Fetch all data in parallel
        const [statsRes, entriesRes, contributorsRes] = await Promise.all([
            fetch('/api/stats'),
            fetch('/api/entries'),
            fetch('/api/top-contributors')
        ]);
        
        // Parse JSON responses
        const stats = await statsRes.json();
        const entries = await entriesRes.json();
        const contributors = await contributorsRes.json();
        
        // Check if all requests were successful
        if (!stats.success || !entries.success || !contributors.success) {
            throw new Error('One or more API requests failed');
        }
        
        console.log('✅ Data loaded successfully');
        
        // Update the UI with our data
        updateStats(stats.data);
        updateCharts(stats.data, contributors.data);
        updateEntriesTable(entries.data);
        updateLastUpdated();
        
        // Hide loading, show content
        document.getElementById('loading').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        
        // Show error message
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error-message').textContent = error.message;
    }
}

// Update the statistics cards
function updateStats(stats) {
    document.getElementById('total-users').textContent = stats.totalUsers;
    document.getElementById('recent-signups').textContent = `${stats.recentSignups} new this week`;
    document.getElementById('total-games').textContent = stats.totalGames;
    document.getElementById('total-websites').textContent = stats.totalWebsites;
    document.getElementById('total-entries').textContent = stats.totalEntries;
}

// Create or update the charts
function updateCharts(stats, contributors) {
    // Distribution Chart (Pie Chart)
    const distributionCtx = document.getElementById('distribution-chart').getContext('2d');
    
    // Destroy existing chart if it exists (for refresh)
    if (distributionChart) {
        distributionChart.destroy();
    }
    
    distributionChart = new Chart(distributionCtx, {
        type: 'doughnut',
        data: {
            labels: ['Games', 'Websites'],
            datasets: [{
                data: [stats.totalGames, stats.totalWebsites],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(118, 75, 162, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Contributors Chart (Bar Chart)
    const contributorsCtx = document.getElementById('contributors-chart').getContext('2d');
    
    if (contributorsChart) {
        contributorsChart.destroy();
    }
    
    // Take top 5 contributors for cleaner visualization
    const topContributors = contributors.slice(0, 5);
    
    contributorsChart = new Chart(contributorsCtx, {
        type: 'bar',
        data: {
            labels: topContributors.map(c => c.username),
            datasets: [{
                label: 'Entries Created',
                data: topContributors.map(c => c.entryCount),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Update the entries table
function updateEntriesTable(entries) {
    const tbody = document.getElementById('entries-tbody');
    tbody.innerHTML = ''; // Clear existing rows
    
    // Show only the 10 most recent entries
    const recentEntries = entries.slice(0, 10);
    
    recentEntries.forEach(entry => {
        const row = document.createElement('tr');
        
        // Format the date nicely
        const date = new Date(entry.createdAt);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        // Create star rating
        const stars = '⭐'.repeat(entry.rating || 0);
        
        row.innerHTML = `
            <td><span class="entry-type ${entry.type}">${entry.type}</span></td>
            <td><strong>${entry.title}</strong></td>
            <td>${entry.username}</td>
            <td class="rating">${stars} ${entry.rating}/5</td>
            <td>${entry.category}</td>
            <td>${formattedDate}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Update the "last updated" timestamp
function updateLastUpdated() {
    const now = new Date();
    const formatted = now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    document.getElementById('last-updated').textContent = formatted;
}

// Load dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 Dashboard page loaded');
    loadDashboard();
});

// Auto-refresh every 5 minutes
setInterval(loadDashboard, 5 * 60 * 1000);