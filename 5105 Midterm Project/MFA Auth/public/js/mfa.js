// public/js/mfa.js - Frontend-only mock version
class MFAService {
    static mfaSecrets = JSON.parse(localStorage.getItem('mfaSecrets') || '{}');

    static getBaseUrl() {
        return ''; // Empty for frontend-only
    }

    static async makeRequest(endpoint, options = {}) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const method = options.method || 'GET';
        const body = options.body ? JSON.parse(options.body) : {};

        try {
            console.log('Mock MFA API call:', endpoint, method, body);

            // Generate MFA secret
            if (endpoint === '/api/mfa/generate' && method === 'POST') {
                const { sessionId } = body;
                const secret = this.generateSecret();
                
                this.mfaSecrets[sessionId] = secret;
                localStorage.setItem('mfaSecrets', JSON.stringify(this.mfaSecrets));

                // Generate QR code data URL
                const qrCodeData = await this.generateQRCode(secret, 'SecureAuth User');
                
                return {
                    secret: secret,
                    qrCode: qrCodeData.split(',')[1] // Remove data URL prefix
                };
            }

            // Verify MFA setup
            if (endpoint === '/api/mfa/verify-setup' && method === 'POST') {
                const { sessionId, token } = body;
                const secret = this.mfaSecrets[sessionId];
                
                if (!secret) {
                    throw new Error('No MFA setup in progress');
                }

                // For demo purposes, accept any 6-digit code
                if (!/^\d{6}$/.test(token)) {
                    throw new Error('Please enter a valid 6-digit code');
                }

                const isValid = true; // Always true for demo
                
                if (isValid) {
                    // Enable MFA for user
                    const session = AuthService.sessions[sessionId];
                    if (session && AuthService.users[session.username]) {
                        AuthService.users[session.username].mfaEnabled = true;
                        AuthService.users[session.username].mfaSecret = secret;
                        AuthService.saveUsers();
                    }
                    
                    return {
                        verified: true,
                        user: { 
                            username: session?.username || 'user', 
                            mfaEnabled: true 
                        }
                    };
                } else {
                    throw new Error('Invalid verification code');
                }
            }

            // Verify MFA login
            if (endpoint === '/api/mfa/verify-login' && method === 'POST') {
                const { sessionId, token } = body;
                const session = AuthService.sessions[sessionId];
                
                if (!session) {
                    throw new Error('Invalid session');
                }

                const user = AuthService.users[session.username];
                const secret = user?.mfaSecret;
                
                if (!secret) {
                    throw new Error('MFA not set up for this user');
                }

                // For demo purposes, accept any 6-digit code
                if (!/^\d{6}$/.test(token)) {
                    throw new Error('Please enter a valid 6-digit code');
                }

                const isValid = true; // Always true for demo
                
                if (isValid) {
                    return {
                        verified: true,
                        user: { 
                            username: user.username, 
                            mfaEnabled: true 
                        }
                    };
                } else {
                    throw new Error('Invalid verification code');
                }
            }

            // Reset MFA
            if (endpoint === '/api/mfa/reset' && method === 'POST') {
                const { sessionId } = body;
                const session = AuthService.sessions[sessionId];
                
                if (session && AuthService.users[session.username]) {
                    AuthService.users[session.username].mfaEnabled = false;
                    AuthService.users[session.username].mfaSecret = null;
                    AuthService.saveUsers();
                    
                    delete this.mfaSecrets[sessionId];
                    localStorage.setItem('mfaSecrets', JSON.stringify(this.mfaSecrets));
                    
                    return {
                        user: { 
                            username: session.username, 
                            mfaEnabled: false 
                        }
                    };
                }
                
                throw new Error('User not found');
            }

            // Get remaining time
            if (endpoint === '/api/mfa/remaining-time') {
                const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
                return { remainingTime: remaining };
            }

            throw new Error(`Endpoint not found: ${endpoint}`);
            
        } catch (error) {
            console.error('Mock MFA API error:', error);
            throw new Error(error.message || 'MFA request failed');
        }
    }

    static generateSecret() {
        // Generate a base32-like secret for demo
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        for (let i = 0; i < 16; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return secret;
    }

    static async generateQRCode(secret, username) {
        return new Promise((resolve, reject) => {
            try {
                const totpUri = `otpauth://totp/SecureAuth:${encodeURIComponent(username)}?secret=${secret}&issuer=SecureAuth&algorithm=SHA1&digits=6&period=30`;
                
                QRCode.toDataURL(totpUri, {
                    width: 200,
                    height: 200,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                }, (err, url) => {
                    if (err) {
                        console.error('QRCode.js error:', err);
                        // Fallback to simple SVG
                        const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                            <rect width="200" height="200" fill="#f8f9fa"/>
                            <text x="100" y="100" font-family="Arial" font-size="14" fill="#6c757d" text-anchor="middle">Mock QR Code</text>
                            <text x="100" y="120" font-family="Arial" font-size="10" fill="#6c757d" text-anchor="middle">For demo purposes</text>
                        </svg>`;
                        resolve('data:image/svg+xml;base64,' + btoa(svg));
                    } else {
                        resolve(url);
                    }
                });
            } catch (error) {
                console.error('QR code generation failed:', error);
                reject(error);
            }
        });
    }

    static async generateSecret() {
        const sessionId = AuthService.getSessionId();
        return await this.makeRequest('/api/mfa/generate', {
            method: 'POST',
            body: JSON.stringify({ sessionId })
        });
    }

    static async verifySetup(token) {
        const sessionId = AuthService.getSessionId();
        return await this.makeRequest('/api/mfa/verify-setup', {
            method: 'POST',
            body: JSON.stringify({ sessionId, token })
        });
    }

    static async verifyLogin(token) {
        const sessionId = AuthService.getSessionId();
        return await this.makeRequest('/api/mfa/verify-login', {
            method: 'POST',
            body: JSON.stringify({ sessionId, token })
        });
    }

    static async resetMFA() {
        const sessionId = AuthService.getSessionId();
        return await this.makeRequest('/api/mfa/reset', {
            method: 'POST',
            body: JSON.stringify({ sessionId })
        });
    }

    static async getRemainingTime() {
        return await this.makeRequest('/api/mfa/remaining-time');
    }

    static displayQRCode(qrCodeData) {
        const qrContainer = document.getElementById('qrcode');
        if (!qrContainer) return;
        
        qrContainer.innerHTML = '';
        
        try {
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${qrCodeData}`;
            img.alt = 'MFA QR Code';
            img.style.width = '200px';
            img.style.height = '200px';
            img.style.border = '1px solid #ddd';
            img.style.borderRadius = '8px';
            
            img.onerror = function() {
                console.error('Failed to load QR code image');
                MFAService.displayManualSetupFallback();
            };
            
            qrContainer.appendChild(img);
        } catch (error) {
            console.error('Error displaying QR code:', error);
            MFAService.displayManualSetupFallback();
        }
    }

    static displayManualSetupFallback() {
        const qrContainer = document.getElementById('qrcode');
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    <i class="fas fa-qrcode fa-3x" style="margin-bottom: 10px;"></i>
                    <p>Mock QR Code Display</p>
                    <p style="font-size: 12px;">For demo purposes only</p>
                </div>
            `;
        }
    }

    static showManualSetup(secret) {
        const manualSetup = document.getElementById('manual-setup');
        const manualSecret = document.getElementById('manual-secret');
        
        if (manualSetup && manualSecret) {
            manualSecret.textContent = secret;
            manualSetup.classList.remove('hidden');
        }
    }
}