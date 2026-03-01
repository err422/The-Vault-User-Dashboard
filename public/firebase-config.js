// Firebase Client SDK Configuration
// Initializes Firebase in the browser for frontend

const firebaseConfig = {
  apiKey: "AIzaSyAukwEW-0tGsjsgHSuatFQwc2-2u-RiXm8",
  authDomain: "the-vault-server.firebaseapp.com",
  databaseURL: "https://the-vault-server-default-rtdb.firebaseio.com",
  projectId: "the-vault-server",
  storageBucket: "the-vault-server.firebasestorage.app",
  messagingSenderId: "335810962420",
  appId: "1:335810962420:web:5d71b0c7e7625fb0e4cfa1",
  measurementId: "G-QG96FRFH0C"
};

// Initialize Firebase
firebaseConfig.initializeApp(firebaseConfig);

// Get service references
const auth = firebaseConfig.auth();
const database = firebaseConfig.database();

console.log('Firebase initialized in browser');