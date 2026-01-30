// Rate limiting configuration
const RATE_LIMIT = {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 10 // Maximum requests per window
};

// IP-based rate limiting store
const rateLimitStore = {};

// Helper function to check rate limit
function checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT.WINDOW_MS;
    
    if (!rateLimitStore[ip]) {
        rateLimitStore[ip] = [];
    }
    
    // Clean old requests
    rateLimitStore[ip] = rateLimitStore[ip].filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (rateLimitStore[ip].length >= RATE_LIMIT.MAX_REQUESTS) {
        return false;
    }
    
    // Add current request
    rateLimitStore[ip].push(now);
    return true;
}

// Helper function to validate Indian mobile number
function validateIndianMobile(mobile) {
    const cleaned = mobile.replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(cleaned);
}

// Helper function to validate Aadhar number
function validateAadhar(aadhar) {
    const cleaned = aadhar.replace(/\D/g, '');
    if (cleaned.length !== 12) return false;
    
    // Aadhar verification algorithm (basic)
    let sum = 0;
    for (let i = 0; i < 11; i++) {
        const digit = parseInt(cleaned[i]);
        if (i % 2 === 0) {
            sum += digit;
        } else {
            const doubled = digit * 2;
            sum += doubled > 9 ? doubled - 9 : doubled;
        }
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(cleaned[11]);
}

// Helper function to validate date of birth
function validateDOB(dob) {
    const date = new Date(dob);
    const today = new Date();
    
    // Check if valid date
    if (isNaN(date.getTime())) return false;
    
    // Check if not in future
    if (date > today) return false;
    
    // Check if not too old (optional, e.g., 100 years)
    const hundredYearsAgo = new Date();
    hundredYearsAgo.setFullYear(hundredYearsAgo.getFullYear() - 100);
    if (date < hundredYearsAgo) return false;
    
    return true;
}

// Helper function to sanitize input
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/[&<>"'`=\/]/g, '') // Remove other dangerous characters
        .substring(0, 255); // Limit length
}

// Generate unique response ID
function generateResponseId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `resp_${timestamp}_${random}`;
}

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        // Get client IP for rate limiting
        const clientIP = request.headers.get('CF-Connecting-IP') || 
                        request.headers.get('X-Forwarded-For') || 
                        'unknown';
        
        // Check rate limit
        if (!checkRateLimit(clientIP)) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Rate limit exceeded. Please try again later.'
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
        let formData;
        try {
            formData = await request.json();
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
        const requiredFields = ['name', 'dob', 'mobile', 'father', 'aadhar'];
        const missingFields = requiredFields.filter(field => !formData[field]);
        
        if (missingFields.length > 0) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Missing required fields: ${missingFields.join(', ')}`
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        // Sanitize inputs
        const sanitizedData = {
            name: sanitizeInput(formData.name),
            dob: formData.dob, // Date doesn't need sanitization
            mobile: formData.mobile.toString().replace(/\D/g, ''),
            father: sanitizeInput(formData.father),
            aadhar: formData.aadhar.toString().replace(/\D/g, '')
        };
        
        // Validate individual fields
        const validationErrors = [];
        
        // Name validation
        if (sanitizedData.name.length < 2) {
            validationErrors.push('Name must be at least 2 characters long');
        }
        if (sanitizedData.name.length > 100) {
            validationErrors.push('Name is too long');
        }
        
        // Date of birth validation
        if (!validateDOB(sanitizedData.dob)) {
            validationErrors.push('Invalid date of birth');
        }
        
        // Mobile validation
        if (!validateIndianMobile(sanitizedData.mobile)) {
            validationErrors.push('Invalid Indian mobile number');
        }
        
        // Father's name validation
        if (sanitizedData.father.length < 2) {
            validationErrors.push("Father's name must be at least 2 characters long");
        }
        if (sanitizedData.father.length > 100) {
            validationErrors.push("Father's name is too long");
        }
        
        // Aadhar validation
        if (!validateAadhar(sanitizedData.aadhar)) {
            validationErrors.push('Invalid Aadhar number');
        }
        
        if (validationErrors.length > 0) {
            return new Response(
                JSON.stringify({
                    success: false,
                    errors: validationErrors
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        // Generate response data
        const responseId = generateResponseId();
        const timestamp = new Date().toISOString();
        
        const responseData = {
            id: responseId,
            ...sanitizedData,
            timestamp: timestamp,
            ip: clientIP,
            userAgent: request.headers.get('User-Agent') || 'unknown'
        };
        
        // Store in KV
        const kv = env.KV_RESPONSES;
        
        // Store individual response
        await kv.put(`response:${responseId}`, JSON.stringify(responseData), {
            metadata: {
                timestamp: timestamp,
                ip: clientIP
            }
        });
        
        // Add to responses list
        const responsesList = await kv.get('responses:list', 'json') || [];
        responsesList.push(responseId);
        await kv.put('responses:list', JSON.stringify(responsesList));
        
        // Add to recent responses (for quick access)
        const recentResponses = await kv.get('responses:recent', 'json') || [];
        recentResponses.unshift({
            id: responseId,
            name: sanitizedData.name,
            timestamp: timestamp,
            mobile: sanitizedData.mobile
        });
        
        // Keep only last 50 recent responses
        if (recentResponses.length > 50) {
            recentResponses.length = 50;
        }
        
        await kv.put('responses:recent', JSON.stringify(recentResponses));
        
        // Update statistics
        const stats = await kv.get('stats', 'json') || {
            total: 0,
            today: 0,
            lastUpdated: timestamp
        };
        
        stats.total++;
        
        // Check if today's first submission
        const today = new Date().toISOString().split('T')[0];
        const lastSubmission = await kv.get('last_submission_date');
        
        if (lastSubmission !== today) {
            stats.today = 1;
            await kv.put('last_submission_date', today);
        } else {
            stats.today++;
        }
        
        stats.lastUpdated = timestamp;
        await kv.put('stats', JSON.stringify(stats));
        
        // Send success response
        return new Response(
            JSON.stringify({
                success: true,
                message: 'Form submitted successfully',
                data: {
                    id: responseId,
                    timestamp: timestamp,
                    name: sanitizedData.name
                }
            }),
            {
                status: 201,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            }
        );
        
    } catch (error) {
        // Log error for debugging
        console.error('Form submission error:', error);
        
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

// Handle CORS preflight requests
export async function onRequestOptions(context) {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'
        }
    });
              }
