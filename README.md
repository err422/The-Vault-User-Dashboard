# The Vault Dashboard

Admin dashboard for The Vault - displays statistics, charts, and analytics from Firebase.
m install
```

## Project Structure

```
├── server.js              # Express server and API endpoints
├── package.json           # Dependencies
├── .env                   # Environment variables 
├── serviceAccountKey.json # Firebase credentials 
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

- Real-time statistics cards
- Interactive charts (distribution & contributors)
- Recent entries table
- Auto-refresh every 5 minutes
- Responsive design

## Deployment

See the guide for deploying to Render (free hosting).

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** Firebase Realtime Database
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Charts:** Chart.js