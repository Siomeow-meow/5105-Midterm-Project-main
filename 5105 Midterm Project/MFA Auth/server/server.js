// server/server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const speakeasy = require('speakeasy');
const qr = require('qr-image');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - fix CORS issues
app.use(cors({
    origin: '*', // In production, replace with your actual domain
    methods: ['GET', 'POST', 'PUT'],
    credentials: false
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// In-memory storage (in production, use a database)
let users = [];
let sessions = {};

// Helper function to find user by session
function getUserBySession(sessionId) {
    if (!sessions[sessionId]) return null;
    return users.find(u => u.id === sessions[sessionId].userId);
}

// API Routes

// User registration
app.post('/api/register', (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('Registration attempt:', { username });
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        // Check if user already exists
        if (users.find(user => user.username === username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            username,
            password, // In production, hash this!
            mfaEnabled: false,
            mfaSecret: null,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        console.log('User registered successfully:', username);
        res.json({ 
            message: 'User registered successfully', 
            userId: newUser.id 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User login
app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('Login attempt:', { username });
        
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create session
        const sessionId = generateSessionId();
        sessions[sessionId] = {
            userId: user.id,
            username: user.username,
            mfaVerified: false,
            createdAt: new Date().toISOString()
        };
        
        console.log('Login successful:', username);
        res.json({ 
            sessionId,
            requiresMFA: user.mfaEnabled,
            user: { 
                username: user.username, 
                mfaEnabled: user.mfaEnabled 
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate MFA secret
app.post('/api/mfa/generate', (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessions[sessionId]) {
            return res.status(401).json({ error: 'Invalid session' });
        }
        
        const secret = speakeasy.generateSecret({
            name: `SecureApp (${sessions[sessionId].username})`,
            issuer: 'SecureApp'
        });
        
        // Store temporary secret in session
        sessions[sessionId].tempSecret = secret.base32;
        
        // Generate QR code as PNG instead of SVG
        const qrCode = qr.imageSync(secret.otpauth_url, { type: 'png' });
        
        res.json({
            secret: secret.base32,
            qrCode: qrCode.toString('base64'),
            qrCodeType: 'png' // Add type information
        });
    } catch (error) {
        console.error('MFA generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Verify MFA setup
app.post('/api/mfa/verify-setup', (req, res) => {
    try {
        const { sessionId, token } = req.body;
        
        if (!sessions[sessionId] || !sessions[sessionId].tempSecret) {
            return res.status(401).json({ error: 'Invalid session or no MFA setup in progress' });
        }
        
        const verified = speakeasy.totp.verify({
            secret: sessions[sessionId].tempSecret,
            encoding: 'base32',
            token,
            window: 2 // Allow 2 time steps (60 seconds) for verification
        });
        
        if (verified) {
            // Enable MFA for user
            const session = sessions[sessionId];
            const user = users.find(u => u.id === session.userId);
            
            if (user) {
                user.mfaEnabled = true;
                user.mfaSecret = sessions[sessionId].tempSecret;
                delete sessions[sessionId].tempSecret;
                console.log('MFA enabled for user:', user.username);
            }
            
            res.json({ 
                success: true, 
                message: 'MFA enabled successfully',
                user: {
                    username: user.username,
                    mfaEnabled: user.mfaEnabled
                }
            });
        } else {
            res.status(400).json({ error: 'Invalid verification code' });
        }
    } catch (error) {
        console.error('MFA verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Verify MFA login with extended window
app.post('/api/mfa/verify-login', (req, res) => {
    try {
        const { sessionId, token } = req.body;
        
        if (!sessions[sessionId]) {
            return res.status(401).json({ error: 'Invalid session' });
        }
        
        const session = sessions[sessionId];
        const user = users.find(u => u.id === session.userId);
        
        if (!user || !user.mfaEnabled) {
            return res.status(400).json({ error: 'MFA not enabled for user' });
        }
        
        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token,
            window: 2 // Allow 2 time steps (60 seconds) for verification
        });
        
        if (verified) {
            session.mfaVerified = true;
            res.json({ 
                success: true, 
                user: { 
                    username: user.username, 
                    mfaEnabled: user.mfaEnabled 
                } 
            });
        } else {
            res.status(400).json({ error: 'Invalid verification code' });
        }
    } catch (error) {
        console.error('MFA login verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Change password
app.put('/api/user/change-password', (req, res) => {
    try {
        const { sessionId, currentPassword, newPassword } = req.body;
        
        if (!sessions[sessionId]) {
            return res.status(401).json({ error: 'Invalid session' });
        }
        
        const user = getUserBySession(sessionId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        if (user.password !== currentPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        
        // Update password
        user.password = newPassword;
        console.log('Password changed for user:', user.username);
        
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset MFA
app.post('/api/mfa/reset', (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessions[sessionId]) {
            return res.status(401).json({ error: 'Invalid session' });
        }
        
        const user = getUserBySession(sessionId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Disable MFA and clear secret
        user.mfaEnabled = false;
        user.mfaSecret = null;
        
        console.log('MFA reset for user:', user.username);
        res.json({ 
            success: true, 
            message: 'MFA has been reset successfully',
            user: {
                username: user.username,
                mfaEnabled: false
            }
        });
    } catch (error) {
        console.error('MFA reset error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get remaining time for current OTP
app.get('/api/mfa/remaining-time', (req, res) => {
    try {
        const period = 30; // TOTP period in seconds
        const currentTime = Math.floor(Date.now() / 1000);
        const remainingTime = period - (currentTime % period);
        
        res.json({ 
            remainingTime,
            period 
        });
    } catch (error) {
        console.error('Remaining time error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
    try {
        const { sessionId } = req.query;
        
        if (!sessionId || !sessions[sessionId]) {
            return res.json({ authenticated: false });
        }
        
        const session = sessions[sessionId];
        const user = users.find(u => u.id === session.userId);
        
        res.json({
            authenticated: session.mfaVerified,
            user: user ? { 
                username: user.username, 
                mfaEnabled: user.mfaEnabled 
            } : null
        });
    } catch (error) {
        console.error('Auth status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (sessionId && sessions[sessionId]) {
            console.log('Logging out session:', sessionId);
            delete sessions[sessionId];
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        usersCount: users.length,
        sessionsCount: Object.keys(sessions).length
    });
});

// Helper function to generate session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
    console.log('Server is accessible from:', `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
});