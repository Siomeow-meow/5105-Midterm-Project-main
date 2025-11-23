// public/js/auth.js
// Authentication functions
class AuthService {
    static getBaseUrl() {
        // For Replit deployment, use relative URLs
        return '';
    }

    static async makeRequest(endpoint, options = {}) {
        try {
            const url = `${this.getBaseUrl()}${endpoint}`;
            console.log(`Making request to: ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Request failed:', error);
            throw new Error(error.message || 'Network error: Unable to connect to server. Please make sure the server is running.');
        }
    }

    static async register(username, password) {
        return await this.makeRequest('/api/register', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    static async login(username, password) {
        const result = await this.makeRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        // Store session ID
        if (result.sessionId) {
            localStorage.setItem('sessionId', result.sessionId);
        }
        
        return result;
    }

    static async checkAuthStatus() {
        try {
            const sessionId = localStorage.getItem('sessionId');
            if (!sessionId) return { authenticated: false };
            
            const result = await this.makeRequest(`/api/auth/status?sessionId=${sessionId}`);
            return result;
        } catch (error) {
            console.error('Auth status check failed:', error);
            return { authenticated: false };
        }
    }

    static async logout() {
        try {
            const sessionId = localStorage.getItem('sessionId');
            if (sessionId) {
                await this.makeRequest('/api/logout', {
                    method: 'POST',
                    body: JSON.stringify({ sessionId })
                });
            }
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            localStorage.removeItem('sessionId');
        }
    }

    static async changePassword(currentPassword, newPassword) {
        const sessionId = this.getSessionId();
        if (!sessionId) {
            throw new Error('No active session found');
        }
        return await this.makeRequest('/api/user/change-password', {
            method: 'PUT',
            body: JSON.stringify({ sessionId, currentPassword, newPassword })
        });
    }

    static getSessionId() {
        return localStorage.getItem('sessionId');
    }

    // Health check
    static async healthCheck() {
        try {
            await this.makeRequest('/api/health');
            return true;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }
}