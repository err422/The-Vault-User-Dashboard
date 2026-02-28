// Import required packages
require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Initialize Firebase Admin SDK
let firebaseConfig;

if (process.env.NODE_ENV === 'production') {
  // Production: use environment variables
  firebaseConfig = {
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  };
} else {
  // Development: use service account file
  const serviceAccount = require('./serviceAccountKey.json');
  firebaseConfig = {
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  };
}

admin.initializeApp(firebaseConfig);

// Get a reference to the database
const db = admin.database();

// Test route - verify Firebase connection
app.get('/', async (req, res) => {
  try {
    // Try to read from Firebase
    const ref = db.ref('System/latestVersion');
    const snapshot = await ref.once('value');
    const version = snapshot.val();
    
    res.send(`
      <h1>Dashboard Server is Running!</h1>
      <p>Firebase connection successful</p>
      <p>Latest version from database: ${version}</p>
      <p><a href="/api/stats">View Stats API</a></p>
    `);
  } catch (error) {
    res.send(`
      <h1>Dashboard Server is Running!</h1>
      <p>Firebase connection failed</p>
      <p>Error: ${error.message}</p>
    `);
  }
});

// API endpoint to get overall statistics
app.get('/api/stats', async (req, res) => {
  try {
    console.log('Fetching statistics...');
    
    const stats = {};
    
    // Get users data
    console.log('  → Fetching users...');
    const usersSnapshot = await db.ref('users').once('value');
    const users = usersSnapshot.val() || {};
    stats.totalUsers = Object.keys(users).length;
    
    // Count recent signups (last 7 days)
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    stats.recentSignups = Object.values(users).filter(user => {
      return user.createdAt && new Date(user.createdAt).getTime() > weekAgo;
    }).length;
    
    // Get usernames
    console.log('  → Fetching usernames...');
    const usernamesSnapshot = await db.ref('usernames').once('value');
    const usernames = usernamesSnapshot.val() || {};
    stats.totalUsernames = Object.keys(usernames).length;
    
    // Get games
    console.log('  → Fetching games...');
    const gamesSnapshot = await db.ref('customEntries/games').once('value');
    const games = gamesSnapshot.val() || {};
    stats.totalGames = Object.keys(games).length;
    
    // Get websites
    console.log('  → Fetching websites...');
    const websitesSnapshot = await db.ref('customEntries/websites').once('value');
    const websites = websitesSnapshot.val() || {};
    stats.totalWebsites = Object.keys(websites).length;
    
    // Calculate total entries
    stats.totalEntries = stats.totalGames + stats.totalWebsites;
    
    console.log('Statistics fetched successfully!');
    
    // Send JSON response
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user total playtime
app.get('/api/playtime', async (req, res) => {
  try {
    const playtimeSnapshot = await db.ref('users').once('value');
    const playtimeData = playtimeSnapshot.val() || {};
    
    const playtime = Object.entries(playtimeData).map(([uid, user]) => ({
      uid,
      username: user.username,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      playtime: user.playtime
    }));
    
    // Sort by creation date (newest first)
    playtime.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
        
    res.json({
      success: true,
      data: playtime
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: error.message });
  } 
});

// Get list of all users with details
app.get('/api/users', async (req, res) => {
  try {
    const usersSnapshot = await db.ref('users').once('value');
    const usersData = usersSnapshot.val() || {};
    
    // Convert to array with user IDs
    const users = Object.entries(usersData).map(([uid, user]) => ({
      uid,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }));
    
    // Sort by creation date (newest first)
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get list of all custom entries (games + websites)
app.get('/api/entries', async (req, res) => {
  try {
    // Fetch both games and websites
    const [gamesSnapshot, websitesSnapshot] = await Promise.all([
      db.ref('customEntries/games').once('value'),
      db.ref('customEntries/websites').once('value')
    ]);
    
    const gamesData = gamesSnapshot.val() || {};
    const websitesData = websitesSnapshot.val() || {};
    
    // Convert to arrays and add type
    const games = Object.entries(gamesData).map(([id, entry]) => ({
      id,
      type: 'game',
      ...entry
    }));
    
    const websites = Object.entries(websitesData).map(([id, entry]) => ({
      id,
      type: 'website',
      ...entry
    }));
    
    // Combine and sort by creation date
    const allEntries = [...games, ...websites];
    allEntries.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    
    res.json({
      success: true,
      count: allEntries.length,
      breakdown: {
        games: games.length,
        websites: websites.length
      },
      data: allEntries
    });
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get top contributors (users with most entries)
app.get('/api/top-contributors', async (req, res) => {
  try {
    const [gamesSnapshot, websitesSnapshot] = await Promise.all([
      db.ref('customEntries/games').once('value'),
      db.ref('customEntries/websites').once('value')
    ]);
    
    const games = Object.values(gamesSnapshot.val() || {});
    const websites = Object.values(websitesSnapshot.val() || {});
    const allEntries = [...games, ...websites];
    
    // Count entries per user
    const contributorCounts = {};
    allEntries.forEach(entry => {
      const username = entry.username || 'Unknown';
      contributorCounts[username] = (contributorCounts[username] || 0) + 1;
    });
    
    // Convert to array and sort
    const contributors = Object.entries(contributorCounts).map(([username, count]) => ({
      username,
      entryCount: count
    }));
    contributors.sort((a, b) => b.entryCount - a.entryCount);
    
    res.json({
      success: true,
      data: contributors.slice(0, 10) // Top 10
    });
  } catch (error) {
    console.error('Error fetching contributors:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Firebase Admin SDK initialized successfully!');
});