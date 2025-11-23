// public/js/mfa.js
// MFA functions
class MFAService {
    static getBaseUrl() {
        return '';
    }

    static async makeRequest(endpoint, options = {}) {
        try {
            const url = `${this.getBaseUrl()}${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('MFA request failed:', error);
            throw new Error('Network error: Unable to connect to server');
        }
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
        if (!qrContainer) {
            console.error('QR code container not found');
            return;
        }
        
        qrContainer.innerHTML = '';
        
        try {
            // Create img element for QR code
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${qrCodeData}`;
            img.alt = 'MFA QR Code';
            img.style.width = '200px';
            img.style.height = '200px';
            img.style.border = '1px solid #ddd';
            img.style.borderRadius = '8px';
            
            // Add error handling for the image
            img.onerror = function() {
                console.error('Failed to load QR code image');
                this.style.display = 'none';
                const errorMsg = document.createElement('div');
                errorMsg.innerHTML = 'QR Code failed to load. Please try again.';
                errorMsg.style.color = 'red';
                errorMsg.style.textAlign = 'center';
                errorMsg.style.padding = '20px';
                qrContainer.appendChild(errorMsg);
            };
            
            img.onload = function() {
                console.log('QR code image loaded successfully');
            };
            
            qrContainer.appendChild(img);
        } catch (error) {
            console.error('Error displaying QR code:', error);
            qrContainer.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">Error generating QR code</div>';
        }
    }

    // Alternative method using QRCode.js library if available
    static displayQRCodeWithLibrary(secret, username) {
        const qrContainer = document.getElementById('qrcode');
        if (!qrContainer) return;
        
        qrContainer.innerHTML = '';
        
        try {
            // Generate TOTP URI
            const totpUri = `otpauth://totp/SecureApp:${encodeURIComponent(username)}?secret=${secret}&issuer=SecureApp&digits=6`;
            
            // Use QRCode.js if available
            if (typeof QRCode !== 'undefined') {
                QRCode.toCanvas(qrContainer, totpUri, {
                    width: 200,
                    height: 200,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                }, function(error) {
                    if (error) {
                        console.error('QRCode.js error:', error);
                        MFAService.displayManualSetup(secret);
                    } else {
                        console.log('QR code generated with QRCode.js');
                    }
                });
            } else {
                console.warn('QRCode.js not available, using manual setup');
                MFAService.displayManualSetup(secret);
            }
        } catch (error) {
            console.error('Error generating QR code with library:', error);
            MFAService.displayManualSetup(secret);
        }
    }

    static displayManualSetup(secret) {
        const qrContainer = document.getElementById('qrcode');
        const manualSetup = document.getElementById('manual-setup');
        const manualSecret = document.getElementById('manual-secret');
        
        if (manualSetup && manualSecret) {
            manualSecret.textContent = secret;
            manualSetup.classList.remove('hidden');
        }
        
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div class="manual-setup-fallback">
                    <p><i class="fas fa-exclamation-triangle"></i> QR code generation failed</p>
                    <p>Please use the manual setup method below</p>
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