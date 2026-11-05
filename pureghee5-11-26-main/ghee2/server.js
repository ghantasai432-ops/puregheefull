// Zero-dependency production server for Amrutha Pure Ghee Store
// Works on Render, local development, and any Node.js hosting platform
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_JSON = path.join(DATA_DIR, 'products.json');
const PRODUCTS_JS = path.join(__dirname, 'products.js');
const ORDERS_JSON = path.join(DATA_DIR, 'orders.json');
const CONFIG_JSON = path.join(DATA_DIR, 'config.json');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to read JSON file safely
function readJsonFile(filePath, defaultValue) {
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e.message);
    }
    return defaultValue;
}

// Helper to write JSON file safely
function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error(`Error writing ${filePath}:`, e.message);
        return false;
    }
}

// Load or initialize products
function getProducts() {
    let products = readJsonFile(PRODUCTS_JSON, null);
    if (!products || !Array.isArray(products) || products.length === 0) {
        // Fallback to products.js if products.json is empty
        try {
            delete require.cache[require.resolve(PRODUCTS_JS)];
            const jsProducts = require(PRODUCTS_JS);
            if (Array.isArray(jsProducts) && jsProducts.length > 0) {
                products = jsProducts;
                writeJsonFile(PRODUCTS_JSON, products);
            }
        } catch (e) {
            console.error('Failed to require products.js:', e.message);
        }
    }
    return products || [];
}

// Save products to both products.json AND rewrite products.js permanently
function saveProducts(productsArray) {
    if (!Array.isArray(productsArray)) return false;

    // 1. Write to data/products.json
    writeJsonFile(PRODUCTS_JSON, productsArray);

    // 2. Rewrite products.js so static script tags and git commits reflect the changes
    const jsContent = `// Product data for the Vijayawada Pure Ghee Store
// Automatically updated by Amrutha Ghee Store Server
const products = ${JSON.stringify(productsArray, null, 4)};

// Export to window object for browser access
if (typeof window !== 'undefined') {
    window.gheeProducts = products;
}
if (typeof module !== 'undefined') {
    module.exports = products;
}
`;
    try {
        fs.writeFileSync(PRODUCTS_JS, jsContent, 'utf-8');
        console.log(`[STORE] Saved ${productsArray.length} products to products.json and products.js`);
    } catch (e) {
        console.error('Error writing products.js:', e.message);
    }

    return true;
}

// Initialize on server boot
const initialProducts = getProducts();
if (initialProducts.length > 0) {
    saveProducts(initialProducts);
}

// Helper to parse JSON request body
function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 2 * 1024 * 1024) { // 2MB limit for JSON
                req.destroy();
                reject(new Error('JSON body too large'));
            }
        });
        req.on('end', () => {
            if (!body.trim()) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

// Multipart parser for image uploads
function parseMultipart(buffer, boundary) {
    const files = [];
    const boundaryBuf = Buffer.from('--' + boundary);
    let start = bufferIndexOf(buffer, boundaryBuf, 0);

    while (start !== -1) {
        const nextStart = bufferIndexOf(buffer, boundaryBuf, start + boundaryBuf.length);
        const part = nextStart !== -1
            ? buffer.slice(start + boundaryBuf.length, nextStart)
            : buffer.slice(start + boundaryBuf.length);

        const headerEnd = bufferIndexOf(part, Buffer.from('\r\n\r\n'), 0);
        if (headerEnd === -1) { start = nextStart; continue; }

        const headers = part.slice(0, headerEnd).toString('utf-8');
        const body = part.slice(headerEnd + 4, part.length - 2);

        const nameMatch = headers.match(/name="([^"]+)"/);
        const filenameMatch = headers.match(/filename="([^"]+)"/);
        const contentTypeMatch = headers.match(/Content-Type:\s*(.+)/i);

        if (filenameMatch && nameMatch) {
            files.push({
                fieldName: nameMatch[1],
                filename: filenameMatch[1],
                contentType: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
                data: body
            });
        }
        start = nextStart;
    }
    return files;
}

function bufferIndexOf(buf, search, from) {
    for (let i = from; i <= buf.length - search.length; i++) {
        let found = true;
        for (let j = 0; j < search.length; j++) {
            if (buf[i + j] !== search[j]) { found = false; break; }
        }
        if (found) return i;
    }
    return -1;
}

// Handle file upload
function handleUpload(req, res) {
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No multipart boundary found' }));
        return;
    }

    const chunks = [];
    let totalSize = 0;

    req.on('data', (chunk) => {
        totalSize += chunk.length;
        if (totalSize > MAX_FILE_SIZE) {
            req.destroy();
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'File too large (max 5MB)' }));
            return;
        }
        chunks.push(chunk);
    });

    req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const boundary = boundaryMatch[1];
        const files = parseMultipart(buffer, boundary);

        if (files.length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No file found in upload' }));
            return;
        }

        const file = files[0];
        const ext = path.extname(file.filename) || '.jpg';
        const safeName = 'prod_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext;
        const savePath = path.join(UPLOADS_DIR, safeName);

        fs.writeFile(savePath, file.data, (err) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to save file: ' + err.message }));
                return;
            }
            const url = 'uploads/' + safeName;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ url: url, filename: safeName }));
        });
    });

    req.on('error', (err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Upload failed: ' + err.message }));
    });
}

// HTTP Server
const server = http.createServer(async (req, res) => {
    // Enable CORS for flexibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const cleanUrl = req.url.split('?')[0];

    // ==========================================
    // API: IMAGE UPLOADS
    // ==========================================
    if (cleanUrl === '/upload' && req.method === 'POST') {
        handleUpload(req, res);
        return;
    }

    // ==========================================
    // API: PRODUCTS (/api/products)
    // ==========================================
    if (cleanUrl === '/api/products') {
        // GET: Return all products
        if (req.method === 'GET') {
            const products = getProducts();
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
            });
            res.end(JSON.stringify(products));
            return;
        }

        // POST: Save or update product(s)
        if (req.method === 'POST') {
            try {
                const body = await parseJsonBody(req);
                let currentProducts = getProducts();

                if (Array.isArray(body)) {
                    // Entire list provided
                    currentProducts = body;
                } else if (body.products && Array.isArray(body.products)) {
                    currentProducts = body.products;
                } else if (body.id) {
                    // Single product upsert
                    const idx = currentProducts.findIndex(p => p.id === body.id);
                    if (idx !== -1) {
                        currentProducts[idx] = { ...currentProducts[idx], ...body };
                    } else {
                        currentProducts.push(body);
                    }
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid product data: missing id' }));
                    return;
                }

                saveProducts(currentProducts);

                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store'
                });
                res.end(JSON.stringify({ success: true, products: currentProducts }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }
    }

    // API: DELETE PRODUCT (/api/products/delete)
    if (cleanUrl === '/api/products/delete' && req.method === 'POST') {
        try {
            const body = await parseJsonBody(req);
            if (!body.id) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing product id' }));
                return;
            }
            let currentProducts = getProducts();
            currentProducts = currentProducts.filter(p => p.id !== body.id);
            saveProducts(currentProducts);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, products: currentProducts }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // ==========================================
    // API: ORDERS (/api/orders)
    // ==========================================
    if (cleanUrl === '/api/orders') {
        // GET: Return all orders
        if (req.method === 'GET') {
            const orders = readJsonFile(ORDERS_JSON, {});
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store, no-cache, must-revalidate'
            });
            res.end(JSON.stringify(orders));
            return;
        }

        // POST: Place a new order
        if (req.method === 'POST') {
            try {
                const orderData = await parseJsonBody(req);
                if (!orderData.id) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing order id' }));
                    return;
                }
                const orders = readJsonFile(ORDERS_JSON, {});
                orders[orderData.id] = orderData;
                writeJsonFile(ORDERS_JSON, orders);

                console.log(`[ORDER] New order recorded: ${orderData.id} (₹${orderData.subtotal})`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, order: orderData }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }
    }

    // API: UPDATE ORDER STATUS (/api/orders/update)
    if (cleanUrl === '/api/orders/update' && req.method === 'POST') {
        try {
            const body = await parseJsonBody(req);
            if (!body.id) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing order id' }));
                return;
            }
            const orders = readJsonFile(ORDERS_JSON, {});
            if (!orders[body.id]) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Order not found' }));
                return;
            }

            if (body.status) orders[body.id].status = body.status;
            if (body.paymentStatus) orders[body.id].paymentStatus = body.paymentStatus;
            if (!orders[body.id].statusTimestamps) orders[body.id].statusTimestamps = {};
            if (body.status) orders[body.id].statusTimestamps[body.status] = Date.now();

            writeJsonFile(ORDERS_JSON, orders);
            console.log(`[ORDER] Order ${body.id} updated to status: ${body.status}`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, order: orders[body.id] }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // API: DELETE ORDER (/api/orders/delete)
    if (cleanUrl === '/api/orders/delete' && req.method === 'POST') {
        try {
            const body = await parseJsonBody(req);
            const orders = readJsonFile(ORDERS_JSON, {});
            if (orders[body.id]) {
                delete orders[body.id];
                writeJsonFile(ORDERS_JSON, orders);
                console.log(`[ORDER] Order ${body.id} deleted`);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // ==========================================
    // API: STORE CONFIG (/api/config)
    // ==========================================
    if (cleanUrl === '/api/config') {
        if (req.method === 'GET') {
            const config = readJsonFile(CONFIG_JSON, { upiId: 'antapalliradhakrishna888@ybl' });
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store, no-cache, must-revalidate'
            });
            res.end(JSON.stringify(config));
            return;
        }

        if (req.method === 'POST') {
            try {
                const body = await parseJsonBody(req);
                const config = readJsonFile(CONFIG_JSON, { upiId: 'antapalliradhakrishna888@ybl' });
                const updated = { ...config, ...body };
                writeJsonFile(CONFIG_JSON, updated);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, config: updated }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }
    }

    // ==========================================
    // STATIC FILE SERVING
    // ==========================================
    let filePath = path.join(__dirname, cleanUrl === '/' ? 'index.html' : cleanUrl);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>404 File Not Found</h1><p>The file you requested does not exist.</p>');
            } else {
                res.writeHead(500);
                res.end(`Internal Server Error: ${error.code}`);
            }
        } else {
            // For HTML, JS, and JSON files, prevent aggressive browser caching so price/image changes reflect instantly
            const headers = { 'Content-Type': contentType };
            if (['.html', '.js', '.json'].includes(extname)) {
                headers['Cache-Control'] = 'no-cache, must-revalidate';
            }
            res.writeHead(200, headers);
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` AMRUTHA PURE GHEE - PRODUCTION SERVER RUNNING `);
    console.log(` Port: ${PORT}`);
    console.log(` Storefront:      http://localhost:${PORT}/index.html`);
    console.log(` Admin Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(` API Endpoint:    http://localhost:${PORT}/api/products`);
    console.log(`==================================================`);
});
