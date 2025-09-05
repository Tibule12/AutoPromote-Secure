// API Configuration for AutoPromote

const API_CONFIG = {
  // For local development
  LOCAL: {
    API_URL: 'http://localhost:5000/api',
    AUTH_URL: 'http://localhost:5000/auth'
  },
  
  // For production - Update this URL once Render deployment is complete
  PRODUCTION: {
    API_URL: 'https://autopromote-api.onrender.com/api',
    AUTH_URL: 'https://autopromote-api.onrender.com/auth'
  },
  
  // Get the appropriate configuration based on environment
  get: function() {
    // Check if we're running on GitHub Pages
    const isGitHubPages = window.location.hostname.includes('github.io');
    
    if (isGitHubPages) {
      return this.PRODUCTION;
    } else {
      return this.LOCAL;
    }
  }
};

// Usage example:
// import API_CONFIG from './api-config.js';
// const { API_URL, AUTH_URL } = API_CONFIG.get();
// 
// fetch(`${API_URL}/users`)
//   .then(response => response.json())
//   .then(data => console.log(data));

export default API_CONFIG;
