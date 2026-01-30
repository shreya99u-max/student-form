// Configuration
const CONFIG = {
    ADMIN_PASSWORD: null, // Will be set from environment variable
    SESSION_DURATION: 24 * 60 * 60, // 24 hours in seconds
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    DEBUG_MODE: false
};

// Store for login attempts (in-memory, will reset on worker restart)
const loginAttempts = {};

// Helper function to check login attempts
function checkLoginAttempts(ip) {
    const now = Date.now();
    const windowStart = now - CONFIG.LOGIN_WINDOW_MS;
    
    if (!loginAttempts[ip]) {
        loginAttempts[ip] = [];
    }
    
    // Clean old attempts
    loginAttempts[ip] = loginAttempts[ip].filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (loginAttempts[ip].length >= CONFIG.MAX_LOGIN_ATTEMPTS) {
        return false;
    }
    
    // Add current attempt
    loginAttempts[ip].push(now);
    return true;
}

// Helper function to generate session ID
function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 16);
    return `sess_${timestamp}_${random}`;
}

// Helper function to hash password (basic)
function hashPassword(password) {
    // In production, use a proper hashing library
    // This is a simple example - replace with bcrypt or similar
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        // Get environment variable
        CONFIG.ADMIN_PASSWORD = env.ADMIN_PASSWORD || 'admin123';
        
        // Get client IP
        const clientIP = request.headers.get('CF-Connecting-IP') || 
                        request.headers.get('X-Forwarded-For') || 
                        'unknown';
        
        // Check login attempts
        if (!checkLoginAttempts(clientIP)) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Too many login attempts. Please try again later.'
                }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': '900'
                    }
                }
            );
        }
        
        // Parse request body
        let loginData;
        try {
            loginData = await request.json();
        } catch (error) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Invalid JSON data'
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        // Validate required fields
        if (!loginData.password) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Password is required'
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        // Get KV instance
        const kv = env.KV_RESPONSES;
        
        // Verify password
        // Note: In production, use proper password hashing and comparison
        const storedHash = hashPassword(CONFIG.ADMIN_PASSWORD);
        const providedHash = hashPassword(loginData.password);
        
        if (providedHash !== storedHash) {
            // Log failed attempt
            await logFailedAttempt(kv, clientIP, loginData);
            
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Invalid password'
                }),
                {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        // Generate session
        const sessionId = generateSessionId();
        const sessionData = {
            loggedIn: true,
            timestamp: Date.now(),
            ip: clientIP,
            userAgent: request.headers.get('User-Agent') || 'unknown'
        };
        
        // Store session in KV
        await kv.put(`session:${sessionId}`, JSON.stringify(sessionData), {
            expirationTtl: CONFIG.SESSION_DURATION
        });
        
        // Log successful login
        await logSuccessfulLogin(kv, clientIP);
        
        // Clear login attempts for this IP
        delete loginAttempts[clientIP];
        
        // Set session cookie
        const cookie = `admin_session=${sessionId}; HttpOnly; Path=/; Max-Age=${CONFIG.SESSION_DURATION}; SameSite=Strict; ${request.url.startsWith('https') ? 'Secure;' : ''}`;
        
        return new Response(
            JSON.stringify({
                success: true,
                message: 'Login successful',
                sessionId: sessionId
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Set-Cookie': cookie,
                    'Cache-Control': 'no-store, no-cache, must-revalidate'
                }
            }
        );
        
    } catch (error) {
        console.error('Login error:', error);
        
        return new Response(
            JSON.stringify({
                success: false,
                error: 'Internal server error',
                debug: CONFIG.DEBUG_MODE ? error.message : undefined
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store'
                }
            }
        );
    }
}

export async function onRequestGet(context) {
    const { request, env } = context;
    
    try {
        // Check session from cookie
        const cookieHeader = request.headers.get('Cookie');
        let isLoggedIn = false;
        let sessionData = null;
        
        if (cookieHeader) {
            const cookies = Object.fromEntries(
                cookieHeader.split('; ').map(c => c.split('='))
            );
            
            const sessionId = cookies.admin_session;
            if (sessionId) {
                const kv = env.KV_RESPONSES;
                sessionData = await kv.get(`session:${sessionId}`, 'json');
                
                if (sessionData && sessionData.loggedIn) {
                    // Check if session expired
                    if (Date.now() - sessionData.timestamp < 24 * 60 * 60 * 1000) {
                        isLoggedIn = true;
                        
                        // Update last activity (optional)
                        sessionData.lastActivity = Date.now();
                        await kv.put(`session:${sessionId}`, JSON.stringify(sessionData), {
                            expirationTtl: CONFIG.SESSION_DURATION
                        });
                    } else {
                        // Session expired, delete it
                        await kv.delete(`session:${sessionId}`);
                    }
                }
            }
        }
        
        return new Response(
            JSON.stringify({
                loggedIn: isLoggedIn,
                session: isLoggedIn ? {
                    timestamp: sessionData.timestamp,
                    ip: sessionData.ip
                } : null
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store'
                }
            }
        );
        
    } catch (error) {
        console.error('Session check error:', error);
        
        return new Response(
            JSON.stringify({
                loggedIn: false,
                error: 'Session check failed'
            }),
            {
                status: 200, // Still return 200 for frontend to handle
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Log failed login attempt
async function logFailedAttempt(kv, ip, loginData) {
    try {
        const logEntry = {
            type: 'failed_login',
            ip: ip,
            timestamp: new Date().toISOString(),
            userAgent: loginData.userAgent || 'unknown',
            attemptedPassword: CONFIG.DEBUG_MODE ? loginData.password : '***'
        };
        
        const logKey = `log:failed_login:${Date.now()}`;
        await kv.put(logKey, JSON.stringify(logEntry), {
            expirationTtl: 7 * 24 * 60 * 60 // Keep for 7 days
        });
        
        // Update failed attempts count
        const securityStats = await kv.get('stats:security', 'json') || {
            failedAttempts: 0,
            lastFailed: null
        };
        
        securityStats.failedAttempts++;
        securityStats.lastFailed = new Date().toISOString();
        
        await kv.put('stats:security', JSON.stringify(securityStats));
        
    } catch (error) {
        console.error('Failed to log failed attempt:', error);
    }
}

// Log successful login
async function logSuccessfulLogin(kv, ip) {
    try {
        const logEntry = {
            type: 'successful_login',
            ip: ip,
            timestamp: new Date().toISOString()
        };
        
        const logKey = `log:success_login:${Date.now()}`;
        await kv.put(logKey, JSON.stringify(logEntry), {
            expirationTtl: 30 * 24 * 60 * 60 // Keep for 30 days
        });
        
        // Update successful logins count
        const securityStats = await kv.get('stats:security', 'json') || {
            successfulLogins: 0,
            lastSuccessful: null,
            failedAttempts: 0
        };
        
        securityStats.successfulLogins++;
        securityStats.lastSuccessful = new Date().toISOString();
        
        await kv.put('stats:security', JSON.stringify(securityStats));
        
    } catch (error) {
        console.error('Failed to log successful login:', error);
    }
}

// Handle logout
export async function onRequestDelete(context) {
    const { request, env } = context;
    
    try {
        // Get session from cookie
        const cookieHeader = request.headers.get('Cookie');
        let sessionId = null;
        
        if (cookieHeader) {
            const cookies = Object.fromEntries(
                cookieHeader.split('; ').map(c => c.split('='))
            );
            sessionId = cookies.admin_session;
        }
        
        // If session exists, delete it
        if (sessionId) {
            const kv = env.KV_RESPONSES;
            await kv.delete(`session:${sessionId}`);
        }
        
        // Clear session cookie
        const cookie = `admin_session=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
        
        return new Response(
            JSON.stringify({
                success: true,
                message: 'Logged out successfully'
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Set-Cookie': cookie
                }
            }
        );
        
    } catch (error) {
        console.error('Logout error:', error);
        
        return new Response(
            JSON.stringify({
                success: false,
                error: 'Logout failed'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Handle CORS preflight requests
export async function onRequestOptions(context) {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Cookie',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400'
        }
    });
      }
