// server/server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const speakeasy = require('speakeasy');
const qr = require('qr-image');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// In-memory storage (in production, use a database)
let users = [];
let sessions = {};

// API Routes

// Health check endpoint - important for Replit
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        usersCount: users.length,
        sessionsCount: Object.keys(sessions).length,
        message: 'Server is running correctly!'
    });
});

// User registration
app.post('/api/register', (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('Registration attempt:', { username });
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        if (users.find(user => user.username === username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        const newUser = {
            id: Date.now().toString(),
            username,
            password,
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
        
        sessions[sessionId].tempSecret = secret.base32;
        
        // Generate QR code
        const qrCode = qr.imageSync(secret.otpauth_url, { type: 'png' });
        
        res.json({
            secret: secret.base32,
            qrCode: qrCode.toString('base64'),
            qrCodeType: 'png'
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
            window: 1
        });
        
        if (verified) {
            const session = sessions[sessionId];
            const user = users.find(u => u.id === session.userId);
            
            if (user) {
                user.mfaEnabled = true;
                user.mfaSecret = sessions[sessionId].tempSecret;
                delete sessions[sessionId].tempSecret;
                console.log('MFA enabled for user:', user.username);
            }
            
            res.json({ success: true, message: 'MFA enabled successfully' });
        } else {
            res.status(400).json({ error: 'Invalid verification code' });
        }
    } catch (error) {
        console.error('MFA verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Verify MFA login
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
            window: 1
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

// Helper function to generate session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('=== MFA Authentication Server Started ===');
    console.log(`Server running on port: ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Replit: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
    console.log('=========================================');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});