// Configuration file to load environment variables from server
// This fetches configuration from the server endpoint to keep secrets secure

(async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        // Expose configuration to global scope
        window.FIREBASE_API_KEY = config.FIREBASE_API_KEY;
        window.FIREBASE_AUTH_DOMAIN = config.FIREBASE_AUTH_DOMAIN;
        window.FIREBASE_PROJECT_ID = config.FIREBASE_PROJECT_ID;
        window.FIREBASE_STORAGE_BUCKET = config.FIREBASE_STORAGE_BUCKET;
        window.FIREBASE_MESSAGING_SENDER_ID = config.FIREBASE_MESSAGING_SENDER_ID;
        window.FIREBASE_APP_ID = config.FIREBASE_APP_ID;
        window.OPENAI_API_KEY = config.OPENAI_API_KEY;
        
        // Configuration loaded indicator
        window.CONFIG_LOADED = true;
        console.log('Configuration loaded successfully');
        
        // Dispatch event to notify other scripts that config is ready
        window.dispatchEvent(new CustomEvent('configLoaded'));
        
    } catch (error) {
        console.error('Failed to load configuration:', error);
        window.CONFIG_LOADED = false;
    }
})();