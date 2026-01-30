// Configuration
const CONFIG = {
    MAX_RESPONSES: 1000, // Maximum responses to return
    CACHE_TTL: 5, // Cache for 5 seconds
    DEBUG_MODE: false
};

// Helper function to paginate array
function paginateArray(array, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const paginatedItems = array.slice(offset, offset + limit);
    const totalPages = Math.ceil(array.length / limit);
    
    return {
        items: paginatedItems,
        pagination: {
            page: page,
            limit: limit,
            totalItems: array.length,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
}

// Helper function to filter responses
function filterResponses(responses, filters = {}) {
    return responses.filter(response => {
        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const searchable = [
                response.name,
                response.father,
                response.mobile,
                response.aadhar,
                response.dob
            ].join(' ').toLowerCase();
            
            if (!searchable.includes(searchLower)) {
                return false;
            }
        }
        
        // Date range filter
        if (filters.startDate || filters.endDate) {
            const responseDate = new Date(response.timestamp).getTime();
            
            if (filters.startDate) {
                const startDate = new Date(filters.startDate).getTime();
                if (responseDate < startDate) return false;
            }
            
            if (filters.endDate) {
                const endDate = new Date(filters.endDate).getTime();
                if (responseDate > endDate) return false;
            }
        }
        
        // Mobile filter
        if (filters.mobile) {
            if (!response.mobile.includes(filters.mobile.replace(/\D/g, ''))) {
                return false;
            }
        }
        
        // Aadhar filter
        if (filters.aadhar) {
            if (!response.aadhar.includes(filters.aadhar.replace(/\D/g, ''))) {
                return false;
            }
        }
        
        return true;
    });
}

// Helper function to sort responses
function sortResponses(responses, sortBy = 'timestamp', sortOrder = 'desc') {
    return [...responses].sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
            case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
            case 'dob':
                aValue = new Date(a.dob);
                bValue = new Date(b.dob);
                break;
            case 'mobile':
                aValue = a.mobile;
                bValue = b.mobile;
                break;
            case 'timestamp':
            default:
                aValue = new Date(a.timestamp);
                bValue = new Date(b.timestamp);
                break;
        }
        
        if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
}

export async function onRequestGet(context) {
    const { request, env } = context;
    
    try {
        // Check for admin session
        const url = new URL(request.url);
        const requiresAuth = !url.searchParams.has('public');
        
        if (requiresAuth) {
            const sessionValid = await validateAdminSession(request, env);
            if (!sessionValid) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: 'Unauthorized access'
                    }),
                    {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }
        }
        
        // Get query parameters
        const searchParams = url.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const sortBy = searchParams.get('sortBy') || 'timestamp';
        const sortOrder = searchParams.get('sortOrder') || 'desc';
        
        // Get filters
        const filters = {
            search: searchParams.get('search'),
            startDate: searchParams.get('startDate'),
            endDate: searchParams.get('endDate'),
            mobile: searchParams.get('mobile'),
            aadhar: searchParams.get('aadhar')
        };
        
        // Get KV instance
        const kv = env.KV_RESPONSES;
        
        // Try to get from cache first
        const cacheKey = `cache:responses:${JSON.stringify({ page, limit, sortBy, sortOrder, filters })}`;
        const cached = await kv.get(cacheKey, 'json');
        
        if (cached && (Date.now() - cached.timestamp) < CONFIG.CACHE_TTL * 1000) {
            return new Response(
                JSON.stringify(cached.data),
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Cache': 'HIT',
                        'Cache-Control': 'public, max-age=5',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            );
        }
        
        // Get all response IDs
        const responsesList = await kv.get('responses:list', 'json') || [];
        
        // If no responses
        if (responsesList.length === 0) {
            const emptyResponse = {
                success: true,
                data: [],
                pagination: {
                    page: 1,
                    limit: limit,
                    totalItems: 0,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPrevPage: false
                },
                stats: {
                    total: 0,
                    today: 0
                }
            };
            
            await kv.put(cacheKey, JSON.stringify({
                data: emptyResponse,
                timestamp: Date.now()
            }));
            
            return new Response(
                JSON.stringify(emptyResponse),
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Cache': 'MISS',
                        'Cache-Control': 'public, max-age=5',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            );
        }
        
        // Get individual responses (with batching for performance)
        const responses = [];
        const batchSize = 20;
        
        for (let i = 0; i < responsesList.length; i += batchSize) {
            const batchIds = responsesList.slice(i, i + batchSize);
            const batchPromises = batchIds.map(id => 
                kv.get(`response:${id}`, 'json').catch(() => null)
            );
            
            const batchResults = await Promise.all(batchPromises);
            const validResponses = batchResults.filter(r => r !== null);
            responses.push(...validResponses);
        }
        
        // Filter responses
        let filteredResponses = filterResponses(responses, filters);
        
        // Sort responses
        filteredResponses = sortResponses(filteredResponses, sortBy, sortOrder);
        
        // Paginate
        const paginated = paginateArray(filteredResponses, page, limit);
        
        // Get statistics
        const stats = await kv.get('stats', 'json') || {
            total: 0,
            today: 0
        };
        
        // Prepare response
        const responseData = {
            success: true,
            data: paginated.items,
            pagination: paginated.pagination,
            stats: stats,
            filters: filters,
            sort: {
                by: sortBy,
                order: sortOrder
            }
        };
        
        // Cache the response
        await kv.put(cacheKey, JSON.stringify({
            data: responseData,
            timestamp: Date.now()
        }));
        
        return new Response(
            JSON.stringify(responseData),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Cache': 'MISS',
                    'Cache-Control': 'public, max-age=5',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
        
    } catch (error) {
        console.error('Get responses error:', error);
        
        return new Response(
            JSON.stringify({
                success: false,
                error: 'Failed to fetch responses',
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

// Validate admin session
async function validateAdminSession(request, env) {
    try {
        const cookieHeader = request.headers.get('Cookie');
        if (!cookieHeader) return false;
        
        const cookies = Object.fromEntries(
            cookieHeader.split('; ').map(c => c.split('='))
        );
        
        const sessionId = cookies.admin_session;
        if (!sessionId) return false;
        
        const sessionData = await env.KV_RESPONSES.get(`session:${sessionId}`, 'json');
        
        if (!sessionData || !sessionData.loggedIn) return false;
        
        // Check if session expired
        if (Date.now() - sessionData.timestamp > 24 * 60 * 60 * 1000) {
            await env.KV_RESPONSES.delete(`session:${sessionId}`);
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('Session validation error:', error);
        return false;
    }
}

// Handle CORS preflight requests
export async function onRequestOptions(context) {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Cookie',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400'
        }
    });
}
