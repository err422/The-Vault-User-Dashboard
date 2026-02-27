# The Vault Dashboard

Admin dashboard for The Vault - displays statistics, charts, and analytics from Firebase.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Firebase

1. Download your service account key from Firebase Console:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` in this directory

2. Create a `.env` file and add your Firebase database URL:
```
FIREBASE_DATABASE_URL=https://your-project-xxxxx-default-rtdb.firebaseio.com
PORT=3000
```

### 3. Run the Server

```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

### 4. Open Dashboard

Visit `http://localhost:3000` in your browser!

## Project Structure

```
├── server.js              # Express server and API endpoints
├── package.json           # Dependencies
├── .env                   # Environment variables (create this)
├── serviceAccountKey.json # Firebase credentials (create this)
├── .gitignore            # Files to ignore in Git
└── public/               # Frontend files
    ├── index.html        # Dashboard HTML
    ├── style.css         # Dashboard styles
    └── dashboard.js      # Dashboard JavaScript
```

## API Endpoints

- `GET /api/stats` - Overall statistics
- `GET /api/users` - List of all users
- `GET /api/entries` - All custom entries (games + websites)
- `GET /api/top-contributors` - Top contributors by entry count

## Features

- 📊 Real-time statistics cards
- 📈 Interactive charts (distribution & contributors)
- 📋 Recent entries table
- 🔄 Auto-refresh every 5 minutes
- 📱 Responsive design

## Deployment

See the guide for deploying to Render (free hosting).

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** Firebase Realtime Database
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Charts:** Chart.js