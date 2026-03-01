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
const { Timestamp } = require('firebase-admin/firestore');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
});

// Get database reference
const db = admin.database();

// Get overall statistics for all users
app.get('api/stats', async (req, res) => {
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
                    return sum + (Number(secons) || 0);
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

// Helper function to format seconds
function formatSeconds(seconds) { 
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`
}

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on htpp://localhost:${PORT}`);
    console.log(`Firebase Admin SDK initialized`);
});