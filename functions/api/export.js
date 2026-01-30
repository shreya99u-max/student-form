export async function onRequestGet(context) {
    const { request, env } = context;
    
    try {
        // Check admin session
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
        
        const url = new URL(request.url);
        const format = url.searchParams.get('format') || 'csv';
        
        // Get KV instance
        const kv = env.KV_RESPONSES;
        
        // Get all response IDs
        const responsesList = await kv.get('responses:list', 'json') || [];
        
        // Get individual responses
        const responses = [];
        for (const id of responsesList) {
            const response = await kv.get(`response:${id}`, 'json');
            if (response) {
                responses.push(response);
            }
        }
        
        // Sort by timestamp (newest first)
        responses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        let exportData;
        let contentType;
        let fileName;
        
        switch (format.toLowerCase()) {
            case 'csv':
                exportData = convertToCSV(responses);
                contentType = 'text/csv';
                fileName = `student_responses_${new Date().toISOString().split('T')[0]}.csv`;
                break;
                
            case 'json':
                exportData = JSON.stringify(responses, null, 2);
                contentType = 'application/json';
                fileName = `student_responses_${new Date().toISOString().split('T')[0]}.json`;
                break;
                
            case 'excel':
                exportData = convertToExcel(responses);
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                fileName = `student_responses_${new Date().toISOString().split('T')[0]}.xlsx`;
                break;
                
            default:
                throw new Error('Unsupported format');
        }
        
        return new Response(exportData, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Cache-Control': 'no-store'
            }
        });
        
    } catch (error) {
        console.error('Export error:', error);
        
        return new Response(
            JSON.stringify({
                success: false,
                error: 'Export failed'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

function convertToCSV(responses) {
    const headers = ['Timestamp', 'Name', 'Date of Birth', 'Mobile No', 'Father Name', 'Aadhar No', 'IP Address'];
    
    const rows = responses.map(response => [
        new Date(response.timestamp).toLocaleString('hi-IN'),
        `"${response.name}"`,
        response.dob,
        `"${formatMobile(response.mobile)}"`,
        `"${response.father}"`,
        `"${formatAadhar(response.aadhar)}"`,
        response.ip || 'N/A'
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function formatMobile(mobile) {
    const cleaned = mobile.toString().replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `${cleaned.substring(0,5)} ${cleaned.substring(5)}`;
    }
    return cleaned;
}

function formatAadhar(aadhar) {
    const cleaned = aadhar.toString().replace(/\D/g, '');
    if (cleaned.length === 12) {
        return `${cleaned.substring(0,4)} ${cleaned.substring(4,8)} ${cleaned.substring(8)}`;
    }
    return cleaned;
}

// Note: Excel conversion would require a library
// For simplicity, we're returning CSV for excel format too
function convertToExcel(responses) {
    return convertToCSV(responses);
}

async function validateAdminSession(request, env) {
    // Same validation as in responses.js
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) return false;
    
    const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
    );
    
    const sessionId = cookies.admin_session;
    if (!sessionId) return false;
    
    const sessionData = await env.KV_RESPONSES.get(`session:${sessionId}`, 'json');
    
    if (!sessionData || !sessionData.loggedIn) return false;
    
    if (Date.now() - sessionData.timestamp > 24 * 60 * 60 * 1000) {
        await env.KV_RESPONSES.delete(`session:${sessionId}`);
        return false;
    }
    
    return true;
}
