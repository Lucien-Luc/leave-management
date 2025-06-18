// Simple Express server to serve the HR Leave Management System
// This handles environment variable injection and serves static files

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files
app.use(express.static('.'));

// Endpoint to provide environment variables to client
app.get('/api/config', (req, res) => {
    res.json({
        FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
        FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
        FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
        FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
        FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
    });
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`HR Leave Management System running on http://0.0.0.0:${PORT}`);
});