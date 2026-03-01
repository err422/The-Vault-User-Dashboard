// Import dependencies
require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');

// Ititialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public folder
app.use(express.static('public'));

// Initilize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
});

// Get database reference
const db = admin.database();

//======================================
//Helper Functions
//======================================


// Helper function to format seconds
function formatSeconds(seconds) { 
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`
}

function calculateUserStats(uid, userData) {
    const stats = { 
        totalPlaytime: 0,
        gamesPlayed: 0,
        favoriteGame: { name: 'none', playtime: 0 },
        level: 1,
        xp: 0,
        xpProgress: 0,
        title: 'Novice'
    };

    // Calculate total playtime and games played
    if (userData.playtime && userData.playtime.total) {
        const gameTimes = userData.playtime.total;

        stats.totalPlaytime = Object.values(gameTimes).reduce((sum, seconds) => {
            return sum + (Number(seconds) || 0);
        }, 0);

        stats.gamesPlayed = Object.keys(gameTimes).length;

        // Find favorite game
        let maxTime = 0;
        let favoriteGameId = null;

        Object.entries(gameTimes).forEach(([GamepadHapticActuator, seconds]) => {
            const time = Number(seconds) || 0;
            if (time > maxTime) {
                maxTime = time;
                favoriteGameId = GamepadHapticActuator;
            }
        });

        if (favoriteGameId) {
            stats.favoriteGame = {
                id: favoriteGameId,
                name: favoriteGameId, // Would need to look up actual game name
                playtime: maxTime
            };
        }
    }

    // Calculate XP (1 minute = 1xp)
    stats.xp = Math.floor(stats.totalPlaytime / 60);

    // Calculate level (level = floor(sqrt(xp / 100)) + 1)
    stats.level = Math.floor(Math.sqrt(stats.xp / 100)) + 1;

    // Calculate XP progress to next level
    const xpForCurrentLevel = Math.pow(stats.level - 1, 2) * 100;
    const xpForNextLevel = Math.pow(stats.level, 2) * 100;
    const xpIntoLevel = stats.xp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    stats.xpProgress = (xpIntoLevel / xpNeeded) * 100;

    // Get title based on level
    if (stats.level < 5) stats.title = 'Novice';
    else if (stats.level < 10) stats.title = 'Explorer';
    else if (stats.level < 15) stats.title = 'Veteran';
    else if (stats.level < 20) stats.title = 'Expert';
    else if (stats.level < 30) stats.title = 'Master';
    else if (stats.level < 50) stats.title = 'Gooner';
    else stats.title = 'Get a life';

    // Format playtime
    stats.totalPlaytimeFormatted = formatSeconds(stats.totalPlaytime);

    return stats;
}



// Get overall statistics for all users
app.get('/api/stats', async (req, res) => {
    try {
        console.log('Featching global stats...');

        const stats = {};

        // Get users
        const usersSnapshot = await db.ref('users').once('value');
        const users = usersSnapshot.val() || {};
        stats.totalUsers = Object.keys(users).length;

        // Count recent signups(last 7 days)
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        stats.recentSignups = Object.values(users).filter(user => {
            return user.createdAt && new Date(user.createdAt).getTime() > weekAgo;
        }).length;

        // Get custom game entries
        const gamesSnapshot = await db.ref('customEntries/games').once('value');
        const games = gamesSnapshot.val() || {};
        stats.totalGames = Object.keys(games).length;

        // Get custom website entries
        const websitesSnapshot = await db.ref('customEntries/websites').once('value');
        const websites = websitesSnapshot.val() || {};
        stats.totalWebsites = Object.keys(websites).length;

        // Calculate total custom entries(Games + Websites)
        stats.totalEntries = stats.totalGames + stats.totalWebsites;

        // Calculate total playtime across all users
        let totalPlaytimeSeconds = 0;
        Object.values(users).forEach(user => {
            if(user.playtime && user.playtime.total) {
                const userPlaytime = Object.values(user.playtime.total).reduce((sum, seconds) => {
                    return sum + (Number(seconds) || 0);
                }, 0);
                totalPlaytimeSeconds += userPlaytime;
            }
        });
        stats.totalPlaytime = totalPlaytimeSeconds;
        stats.totalPlaytimeFormatted = formatSeconds(totalPlaytimeSeconds);

        console.log('User stats fetched');

        res.json({
            success: true,
            data: stats,
            Timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching stats:'. error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get list of all users
app.get('/api/users', async(req, res) => {
    try {
        const usersSnapshot = await db.ref('users').once('value');
        const usersData = usersSnapshot.val() || {};

        // Convert to array w/ UIDs
        const users = Object.entries(usersData).map(([uid, user]) => ({
            uid,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
        }));

        // Sort by account creation date (newest first)
        users.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
        });

        res.json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get specific user's detailed data
app.get('/api/users/:uid', async (req, res) => {
    try {
        const { uid } = req.params;

        const userSnapshot = await db.ref(`users/${uid}`).once('value');
        const userData = userSnapshot.val();

        if (!userData) {
            return res.status(404).json({
                success: false,
                error: 'user not found'
            });
        }

        // Calculate user stats
        const stats = calculateUserStats(uid, userData);

        res.json({
            success: true,
            data: {
                uid,
                ...userData,
                stats
            }
        });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on htpp://localhost:${PORT}`);
    console.log(`Firebase Admin SDK initialized`);
});