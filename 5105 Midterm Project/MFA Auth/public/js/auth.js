// public/js/auth.js - Frontend-only mock version
class AuthService {
    static users = JSON.parse(localStorage.getItem('mockUsers') || '{}');
    static sessions = JSON.parse(localStorage.getItem('mockSessions') || '{}');
    static currentSession = localStorage.getItem('currentSession');

    static getBaseUrl() {
        return ''; // Empty for frontend-only
    }

    static async makeRequest(endpoint, options = {}) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const method = options.method || 'GET';
        const body = options.body ? JSON.parse(options.body) : {};

        try {
            console.log('Mock API call:', endpoint, method, body);

            // Register endpoint
            if (endpoint === '/api/register' && method === 'POST') {
                const { username, password } = body;
                
                if (this.users[username]) {
                    throw new Error('User already exists');
                }

                if (username.length < 3) {
                    throw new Error('Username must be at least 3 characters');
                }

                if (password.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }

                this.users[username] = { 
                    username, 
                    password, 
                    mfaEnabled: false,
                    mfaSecret: null 
                };
                this.saveUsers();
                
                return { message: 'Account created successfully' };
            }

            // Login endpoint
            if (endpoint === '/api/login' && method === 'POST') {
                const { username, password } = body;
                const user = this.users[username];
                
                if (!user || user.password !== password) {
                    throw new Error('Invalid username or password');
                }

                const sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
                this.sessions[sessionId] = { username, createdAt: Date.now() };
                this.currentSession = sessionId;
                this.saveSessions();
                localStorage.setItem('currentSession', sessionId);

                return {
                    user: { 
                        username: user.username, 
                        mfaEnabled: user.mfaEnabled 
                    },
                    sessionId,
                    requiresMFA: user.mfaEnabled
                };
            }

            // Auth status endpoint
            if (endpoint.includes('/api/auth/status')) {
                const sessionId = this.currentSession;
                const session = this.sessions[sessionId];
                
                if (!session) {
                    return { authenticated: false };
                }

                const user = this.users[session.username];
                return { 
                    authenticated: true, 
                    user: { 
                        username: user.username, 
                        mfaEnabled: user.mfaEnabled 
                    } 
                };
            }

            // Logout endpoint
            if (endpoint === '/api/logout' && method === 'POST') {
                const { sessionId } = body;
                if (sessionId && this.sessions[sessionId]) {
                    delete this.sessions[sessionId];
                    this.saveSessions();
                }
                this.currentSession = null;
                localStorage.removeItem('currentSession');
                return { message: 'Logged out successfully' };
            }

            // Change password endpoint
            if (endpoint === '/api/user/change-password' && method === 'PUT') {
                const { sessionId, currentPassword, newPassword } = body;
                const session = this.sessions[sessionId || this.currentSession];
                
                if (!session) {
                    throw new Error('Not authenticated');
                }

                const user = this.users[session.username];
                if (user.password !== currentPassword) {
                    throw new Error('Current password is incorrect');
                }

                if (newPassword.length < 6) {
                    throw new Error('New password must be at least 6 characters');
                }

                user.password = newPassword;
                this.saveUsers();
                return { message: 'Password changed successfully' };
            }

            // Health check
            if (endpoint === '/api/health') {
                return { status: 'OK', timestamp: Date.now() };
            }

            throw new Error(`Endpoint not found: ${endpoint}`);
            
        } catch (error) {
            console.error('Mock API error:', error);
            throw new Error(error.message || 'Request failed');
        }
    }

    static saveUsers() {
        localStorage.setItem('mockUsers', JSON.stringify(this.users));
    }

    static saveSessions() {
        localStorage.setItem('mockSessions', JSON.stringify(this.sessions));
    }

    static async register(username, password) {
        return await this.makeRequest('/api/register', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    static async login(username, password) {
        return await this.makeRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    static async checkAuthStatus() {
        try {
            return await this.makeRequest('/api/auth/status');
        } catch (error) {
            return { authenticated: false };
        }
    }

    static async logout() {
        try {
            await this.makeRequest('/api/logout', {
                method: 'POST',
                body: JSON.stringify({ sessionId: this.currentSession })
            });
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            this.currentSession = null;
            localStorage.removeItem('currentSession');
        }
    }

    static getSessionId() {
        return this.currentSession;
    }

    static async changePassword(currentPassword, newPassword) {
        return await this.makeRequest('/api/user/change-password', {
            method: 'PUT',
            body: JSON.stringify({ 
                sessionId: this.currentSession, 
                currentPassword, 
                newPassword 
            })
        });
    }

    static async healthCheck() {
        try {
            await this.makeRequest('/api/health');
            return true;
        } catch (error) {
            return false;
        }
    }
}