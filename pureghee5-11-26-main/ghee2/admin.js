// AMRUTHA PURE GHEE - Admin Dashboard Script with Product Management

// Application State
let dbRefOrders = null;
let dbRefProducts = null;
let ordersList = {};
let productsList = {};
let activeFilter = 'all';
let isDemoMode = true;
let currentView = 'orders'; // 'orders' or 'products'

// Initialize Admin Dashboard
document.addEventListener("DOMContentLoaded", () => {
    checkAuthentication();
    setupLoginForm();
    setupChangePasswordForm();
    initializeDatabase();
    setupProductForm();
    initAdminUPIConfig();
});

// Admin UPI Configuration
function initAdminUPIConfig() {
    const upiInput = document.getElementById("admin-upi-id");
    if (!upiInput) return;
    
    // Check server config first
    fetch('/api/config?_t=' + Date.now(), { cache: 'no-store' })
        .then(res => res.json())
        .then(cfg => {
            if (cfg && cfg.upiId) {
                upiInput.value = cfg.upiId;
                localStorage.setItem("amrutha_store_upi_id", cfg.upiId);
            }
        })
        .catch(() => {});

    let storedUpi = localStorage.getItem("amrutha_store_upi_id");
    if (!storedUpi || storedUpi === "9849998509@ybl") {
        storedUpi = "antapalliradhakrishna888@ybl";
    }
    upiInput.value = storedUpi;
}

window.saveAdminUPIConfig = function() {
    const upiInput = document.getElementById("admin-upi-id");
    if (!upiInput) return;
    const val = upiInput.value.trim();
    if (!val || !val.includes("@")) {
        alert("Please enter a valid UPI ID (e.g. antapalliradhakrishna888@ybl, yourname@upi).");
        return;
    }
    localStorage.setItem("amrutha_store_upi_id", val);
    fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upiId: val })
    }).catch(e => console.warn("Failed to persist config to server:", e));
    alert(`Store UPI ID updated to: ${val}\nAll customer online payments will now be directed to this ID.`);
};

// Toggle password field visibility (Eye button)
window.togglePasswordVisibility = function(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input) return;

    if (input.type === "password") {
        input.type = "text";
        if (icon) {
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
        }
    } else {
        input.type = "password";
        if (icon) {
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
        }
    }
};

// Helper to get current admin password (from custom localStorage or default config)
function getAdminPassword() {
    const custom = localStorage.getItem("amrutha_admin_custom_password");
    if (custom && custom !== "g.tharshith@gmail" && custom !== "g.tharshith@gmail.com" && custom !== "admin123") {
        return custom;
    }
    return (window.adminConfig && window.adminConfig.dashboardPassword) || "saikrishnafoodproducts@123";
}

// Authentication checks
function checkAuthentication() {
    const isLogged = sessionStorage.getItem("amrutha_admin_logged");
    const loginContainer = document.getElementById("login-container");
    const dashboardContainer = document.getElementById("dashboard-container");

    if (isLogged === "true") {
        loginContainer.classList.add("hidden");
        dashboardContainer.classList.remove("hidden");
        document.body.classList.remove("overflow-hidden");
    } else {
        loginContainer.classList.remove("hidden");
        dashboardContainer.classList.add("hidden");
        document.body.classList.add("overflow-hidden");
    }
}

// Login Form Submit handler
function setupLoginForm() {
    const loginForm = document.getElementById("login-form");
    const passwordInput = document.getElementById("login-password");
    const loginError = document.getElementById("login-error");

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const inputPass = passwordInput.value.trim();
        const configuredPass = (window.adminConfig && window.adminConfig.dashboardPassword) || "saikrishnafoodproducts@123";
        const correctPass = getAdminPassword();

        if (
            inputPass === correctPass ||
            inputPass === configuredPass ||
            inputPass === "saikrishnafoodproducts@123"
        ) {
            localStorage.setItem("amrutha_admin_custom_password", "saikrishnafoodproducts@123");
            sessionStorage.setItem("amrutha_admin_logged", "true");
            loginError.classList.add("hidden");
            passwordInput.value = "";
            checkAuthentication();
            // Start listening to database
            loadDashboardData();
        } else {
            loginError.classList.remove("hidden");
        }
    });
}

// Log out admin
window.logoutAdmin = function() {
    sessionStorage.removeItem("amrutha_admin_logged");
    location.reload();
};

let isServerBackend = false;

// Initialize Server API, Firebase or local mock DB
function initializeDatabase() {
    const config = window.firebaseConfig;
    const isPlaceholder = config ? (config.apiKey === "PLACEHOLDER_API_KEY" || config.projectId === "PLACEHOLDER_PROJECT_ID") : true;
    const setupAlert = document.getElementById("setup-alert");

    // 0. Connect Live Google Firebase Realtime Database
    if (!isPlaceholder && typeof firebase !== 'undefined') {
        try {
            if (!firebase.apps.length) firebase.initializeApp(config);
            dbRefOrders = firebase.database().ref("orders");
            dbRefProducts = firebase.database().ref("products");
            isDemoMode = false;
            if (setupAlert) setupAlert.classList.add("hidden");
            console.log("Admin Dashboard: Live Google Firebase connected successfully!");

            // Real-time synchronization of all orders from Google Cloud
            dbRefOrders.on("value", (snapshot) => {
                const data = snapshot.val() || {};
                ordersList = data;
                localStorage.setItem("amrutha_ghee_cloud_orders", JSON.stringify(ordersList));
                renderOrdersTable();
            }, (err) => {
                console.error("Firebase Realtime read error:", err);
            });
        } catch (e) {
            console.error("Firebase init failed in Admin:", e);
        }
    }

    // 1. Also fetch products and orders from Node.js Server API
    fetch('/api/products?_t=' + Date.now(), { cache: 'no-store' })
        .then(res => {
            if (!res.ok) throw new Error("Server API not available (status " + res.status + ")");
            return res.json();
        })
        .then(products => {
            isServerBackend = true;
            if (setupAlert) setupAlert.classList.add("hidden");

            // Populate products list
            productsList = {};
            if (Array.isArray(products)) {
                products.forEach(p => { productsList[p.id] = p; });
            }
            localStorage.setItem("amrutha_ghee_cloud_products", JSON.stringify(productsList));
            if (currentView === 'products') renderProductsManager();

            // Load orders from server if Firebase is not active
            if (isDemoMode) {
                fetchOrdersFromServer();
            }
        })
        .catch(err => {
            console.log("Admin Dashboard: Server API fallback:", err.message);
            if (isDemoMode) {
                loadDashboardData();
            }
        });
}

function fetchOrdersFromServer() {
    fetch('/api/orders?_t=' + Date.now(), { cache: 'no-store' })
        .then(res => {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
        })
        .then(orders => {
            ordersList = orders || {};
            localStorage.setItem("amrutha_ghee_cloud_orders", JSON.stringify(ordersList));
            renderOrdersTable();
        })
        .catch(err => console.warn("Failed to fetch orders from server:", err.message));
}

function fetchProductsFromServer() {
    fetch('/api/products?_t=' + Date.now(), { cache: 'no-store' })
        .then(res => {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
        })
        .then(products => {
            productsList = {};
            if (Array.isArray(products)) {
                products.forEach(p => { productsList[p.id] = p; });
            }
            localStorage.setItem("amrutha_ghee_cloud_products", JSON.stringify(productsList));
            if (currentView === 'products') renderProductsManager();
        })
        .catch(err => console.warn("Failed to fetch products from server:", err.message));
}

// Switch between Orders View and Products View
window.switchView = function(view) {
    currentView = view;
    const ordersView = document.getElementById("orders-view");
    const productsView = document.getElementById("products-view");
    const tabOrders = document.getElementById("tab-orders");
    const tabProducts = document.getElementById("tab-products");

    if (view === 'orders') {
        ordersView.classList.remove("hidden");
        productsView.classList.add("hidden");
        
        tabOrders.className = "text-sm font-extrabold pb-3 border-b-2 border-amber-500 text-amber-600 focus:outline-none transition-all flex items-center gap-2";
        tabProducts.className = "text-sm font-extrabold pb-3 border-b-2 border-transparent text-gray-400 hover:text-amber-600 focus:outline-none transition-all flex items-center gap-2";
    } else {
        ordersView.classList.add("hidden");
        productsView.classList.remove("hidden");
        
        tabOrders.className = "text-sm font-extrabold pb-3 border-b-2 border-transparent text-gray-400 hover:text-amber-600 focus:outline-none transition-all flex items-center gap-2";
        tabProducts.className = "text-sm font-extrabold pb-3 border-b-2 border-amber-500 text-amber-600 focus:outline-none transition-all flex items-center gap-2";
        
        renderProductsManager();
    }
};

// Fetch both orders & products
function loadDashboardData() {
    if (sessionStorage.getItem("amrutha_admin_logged") !== "true") return;

    if (isDemoMode) {
        // Sync mock data on load
        syncDemoOrders();
        syncDemoProducts();
        
        // Listen to storage events (cross-tab local updates)
        window.addEventListener("storage", () => {
            syncDemoOrders();
            syncDemoProducts();
        });
    } else {
        // Listen to Firebase Orders
        dbRefOrders.on("value", (snapshot) => {
            ordersList = snapshot.val() || {};
            renderOrdersTable();
        }, (error) => {
            console.error("Error reading orders:", error);
        });

        // Listen to Firebase Products
        dbRefProducts.on("value", (snapshot) => {
            const data = snapshot.val();
            if (!data || Object.keys(data).length === 0) {
                // If cloud database is empty, seed it using products.js default array
                seedInitialProductsInCloud();
            } else {
                productsList = data;
                if (currentView === 'products') {
                    renderProductsManager();
                }
            }
        }, (error) => {
            console.error("Error reading products:", error);
        });
    }
}

// ----------------------------------------------------
// ORDERS LOGS SECTION
// ----------------------------------------------------

function syncDemoOrders() {
    const rawOrders = localStorage.getItem("amrutha_ghee_cloud_orders");
    ordersList = rawOrders ? JSON.parse(rawOrders) : {};
    renderOrdersTable();
}

function saveDemoOrders() {
    localStorage.setItem("amrutha_ghee_cloud_orders", JSON.stringify(ordersList));
    renderOrdersTable();
}

function renderOrdersTable() {
    const tbody = document.getElementById("orders-tbody");
    const noOrdersState = document.getElementById("no-orders-state");

    tbody.innerHTML = "";

    const ordersArray = [];
    Object.keys(ordersList).forEach(key => {
        ordersArray.push({
            id: key,
            ...ordersList[key]
        });
    });
    ordersArray.sort((a, b) => b.timestamp - a.timestamp);

    // Compute Stats
    let totalSales = 0;
    let totalOrdersCount = ordersArray.length;
    let pendingCount = 0;
    let confirmedCount = 0;
    let shippedCount = 0;
    let deliveredCount = 0;

    ordersArray.forEach(order => {
        if (order.status === "Delivered") {
            deliveredCount++;
            totalSales += order.subtotal;
        } else if (order.status === "Pending") {
            pendingCount++;
        } else if (order.status === "Confirmed") {
            confirmedCount++;
        } else if (order.status === "Shipped") {
            shippedCount++;
        }
    });

    // Render Stats
    document.getElementById("stat-sales").textContent = `₹${totalSales}`;
    document.getElementById("stat-orders").textContent = totalOrdersCount;
    document.getElementById("stat-pending").textContent = pendingCount;
    const statShipped = document.getElementById("stat-shipped");
    if (statShipped) statShipped.textContent = shippedCount;
    document.getElementById("stat-delivered").textContent = deliveredCount;

    // Filter array
    const filteredOrders = ordersArray.filter(order => {
        if (activeFilter === 'all') return true;
        return order.status === activeFilter;
    });

    if (filteredOrders.length === 0) {
        noOrdersState.classList.remove("hidden");
    } else {
        noOrdersState.classList.add("hidden");

        filteredOrders.forEach(order => {
            const tr = document.createElement("tr");
            tr.className = "hover:bg-gray-50/50 transition-colors";

            const orderDate = new Date(order.timestamp).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short"
            });

            let itemsHTML = "<ul class='list-disc pl-4 space-y-0.5 text-xs text-gray-500'>";
            order.items.forEach(it => {
                itemsHTML += `<li>${it.name} (${it.size}) x <strong>${it.quantity}</strong> - ₹${it.price * it.quantity}</li>`;
            });
            itemsHTML += "</ul>";

            let statusSelectColor = "bg-amber-100 text-amber-800 border-amber-200";
            if (order.status === "Confirmed") statusSelectColor = "bg-blue-100 text-blue-800 border-blue-200";
            if (order.status === "Shipped") statusSelectColor = "bg-indigo-100 text-indigo-800 border-indigo-200";
            if (order.status === "Delivered") statusSelectColor = "bg-green-100 text-green-800 border-green-200";
            if (order.status === "Cancelled") statusSelectColor = "bg-red-100 text-red-800 border-red-200";

            let quickActionsHTML = '';
            if (order.status === 'Pending') {
                quickActionsHTML = `
                    <div class="flex items-center justify-center gap-1.5 mt-2">
                        <button onclick="updateOrderStatus('${order.id}', 'Confirmed')" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1" title="Confirm Order">
                            <i class="fa-solid fa-check"></i> Confirm
                        </button>
                        <button onclick="updateOrderStatus('${order.id}', 'Cancelled')" class="px-2 py-1 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-700 rounded-md text-[11px] font-bold transition-colors" title="Cancel Order">
                            <i class="fa-solid fa-xmark"></i> Cancel
                        </button>
                    </div>
                `;
            } else if (order.status === 'Confirmed') {
                quickActionsHTML = `
                    <div class="flex items-center justify-center gap-1.5 mt-2">
                        <button onclick="updateOrderStatus('${order.id}', 'Shipped')" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1" title="Ship / Dispatch Order">
                            <i class="fa-solid fa-truck-fast"></i> Ship Order
                        </button>
                        <button onclick="updateOrderStatus('${order.id}', 'Cancelled')" class="px-2 py-1 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-700 rounded-md text-[11px] font-bold transition-colors" title="Cancel Order">
                            <i class="fa-solid fa-xmark"></i> Cancel
                        </button>
                    </div>
                `;
            } else if (order.status === 'Shipped') {
                quickActionsHTML = `
                    <div class="flex items-center justify-center gap-1.5 mt-2">
                        <button onclick="updateOrderStatus('${order.id}', 'Delivered')" class="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1" title="Mark as Delivered">
                            <i class="fa-solid fa-circle-check"></i> Delivered
                        </button>
                        <button onclick="updateOrderStatus('${order.id}', 'Cancelled')" class="px-2 py-1 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-700 rounded-md text-[11px] font-bold transition-colors" title="Cancel Order">
                            <i class="fa-solid fa-xmark"></i> Cancel
                        </button>
                    </div>
                `;
            } else if (order.status === 'Delivered') {
                quickActionsHTML = `
                    <div class="text-[11px] text-green-600 font-bold mt-1.5 flex items-center justify-center gap-1">
                        <i class="fa-solid fa-circle-check"></i> Delivered to Customer
                    </div>
                `;
            } else if (order.status === 'Cancelled') {
                quickActionsHTML = `
                    <div class="text-[11px] text-red-500 font-bold mt-1.5 flex items-center justify-center gap-1">
                        <i class="fa-solid fa-ban"></i> Order Cancelled
                    </div>
                `;
            }

            tr.innerHTML = `
                <td class="px-6 py-4">
                    <span class="block font-bold text-gray-800 text-xs">${orderDate}</span>
                    <span class="inline-block font-mono text-[10px] text-gray-400 mt-1">${order.id}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="font-bold text-gray-800 text-sm">${order.customer.name}</div>
                    <div class="text-xs text-amber-600 font-semibold mt-0.5"><i class="fa-solid fa-phone text-[10px]"></i> ${order.customer.phone}</div>
                    <div class="text-xs text-gray-400 mt-1 leading-relaxed max-w-[220px]">
                        ${order.customer.address}
                        ${order.customer.landmark ? `<br><strong class='text-gray-500'>Landmark:</strong> ${order.customer.landmark}` : ''}
                    </div>
                    <div class="text-[10px] uppercase font-bold tracking-wider text-gray-400 mt-2 flex flex-wrap items-center gap-1">
                        <span>Method:</span>
                        ${(order.paymentStatus === 'Paid' || (order.checkoutMethod && order.checkoutMethod.includes('Online UPI')))
                            ? `<span class="bg-purple-100 text-purple-900 border border-purple-200 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-1"><i class="fa-solid fa-circle-check text-green-600 text-[10px]"></i> ${order.checkoutMethod || 'Online UPI'} (Paid)</span>`
                            : `<span class="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">${order.checkoutMethod || 'COD'}</span>`
                        }
                    </div>
                    ${(order.transactionId && order.transactionId !== 'Verified' && order.transactionId !== 'Paid Online') ? `
                    <div class="text-[11px] font-mono text-gray-600 mt-1">
                        <strong class="text-gray-500 font-sans text-[10px] uppercase">Ref / UTR:</strong> <span class="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-amber-900 font-bold">${order.transactionId}</span>
                    </div>` : ''}
                </td>
                <td class="px-6 py-4">
                    ${itemsHTML}
                </td>
                <td class="px-6 py-4 text-right font-extrabold text-gray-900 text-sm">
                    ₹${order.subtotal}
                </td>
                <td class="px-6 py-4 text-center">
                    <select 
                        onchange="updateOrderStatus('${order.id}', this.value)" 
                        class="px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none cursor-pointer transition-colors ${statusSelectColor}"
                    >
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                    ${quickActionsHTML}
                </td>
                <td class="px-6 py-4 text-center">
                    <button 
                        onclick="deleteOrder('${order.id}')" 
                        class="w-8 h-8 rounded-lg border border-gray-200 hover:border-red-500 text-gray-400 hover:text-red-600 flex items-center justify-center mx-auto transition-colors"
                        title="Delete Order Record"
                    >
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });
    }
}

window.updateOrderStatus = function(orderId, newStatus) {
    const timestamp = Date.now();
    if (ordersList[orderId]) {
        ordersList[orderId].status = newStatus;
        ordersList[orderId].updatedAt = timestamp;
        if (!ordersList[orderId].statusTimestamps) {
            ordersList[orderId].statusTimestamps = {};
        }
        ordersList[orderId].statusTimestamps[newStatus] = timestamp;
        saveDemoOrders();
        window.dispatchEvent(new Event('storage'));
    }

    // Sync to Server API
    fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus })
    }).catch(err => console.warn("Failed to sync order status to server:", err));

    // Sync to Firebase if active
    if (!isDemoMode && dbRefOrders) {
        const updatePayload = {
            status: newStatus,
            updatedAt: timestamp
        };
        updatePayload[`statusTimestamps/${newStatus}`] = timestamp;
        dbRefOrders.child(orderId).update(updatePayload)
            .then(() => {
                console.log(`Order ${orderId} updated to ${newStatus}`);
            })
            .catch(err => console.error("Error updating status in Firebase:", err));
    }
};

window.deleteOrder = function(orderId) {
    if (!confirm("Are you sure you want to permanently delete this order record? This action cannot be undone.")) return;

    if (ordersList[orderId]) {
        delete ordersList[orderId];
        saveDemoOrders();
        window.dispatchEvent(new Event('storage'));
    }

    // Delete on Server API
    fetch('/api/orders/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId })
    }).catch(err => console.warn("Failed to delete order on server:", err));

    // Delete in Firebase if active
    if (!isDemoMode && dbRefOrders) {
        dbRefOrders.child(orderId).remove()
            .catch(err => console.error("Error deleting order from Firebase:", err));
    }
};

window.filterOrders = function(status) {
    activeFilter = status;
    const tabs = ["all", "Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];
    tabs.forEach(tab => {
        const tabEl = document.getElementById(`filter-${tab}`);
        if (!tabEl) return;
        if (tab === status) {
            tabEl.className = "px-3.5 py-2 rounded-lg border border-amber-500 bg-amber-500 text-white shadow-sm transition-all";
        } else {
            tabEl.className = "px-3.5 py-2 rounded-lg border border-gray-200 hover:border-amber-500 bg-white transition-all";
        }
    });
    renderOrdersTable();
};

// ----------------------------------------------------
// PRODUCT MANAGEMENT SECTION
// ----------------------------------------------------

function syncDemoProducts() {
    const rawProducts = localStorage.getItem("amrutha_ghee_cloud_products");
    const stored = rawProducts ? JSON.parse(rawProducts) : {};
    const deletedIds = JSON.parse(localStorage.getItem("amrutha_deleted_products") || "[]");
    
    // Purge old deleted placeholders and all permanently deleted products
    deletedIds.push("a2-cow-ghee", "premium-buffalo-ghee", "golden-cow-ghee");
    deletedIds.forEach(id => {
        delete stored[id];
    });
    
    // Always sync latest sizes, prices, and defaultSizeIndex from products.js so code changes reflect immediately
    if (window.gheeProducts && Array.isArray(window.gheeProducts)) {
        window.gheeProducts.forEach(p => {
            if (!deletedIds.includes(p.id)) {
                if (stored[p.id]) {
                    stored[p.id].sizes = p.sizes;
                    stored[p.id].name = p.name;
                    stored[p.id].defaultSizeIndex = (typeof p.defaultSizeIndex === 'number') ? p.defaultSizeIndex : stored[p.id].defaultSizeIndex;
                    stored[p.id].subtitle = p.subtitle;
                    stored[p.id].description = p.description;
                    stored[p.id].image = p.image || stored[p.id].image;
                    stored[p.id].features = p.features;
                } else {
                    stored[p.id] = p;
                }
            }
        });
        localStorage.setItem("amrutha_ghee_products_initialized_v2", "true");
    }
    
    localStorage.setItem("amrutha_ghee_cloud_products", JSON.stringify(stored));
    productsList = stored;
    if (currentView === 'products') {
        renderProductsManager();
    }
}

function saveDemoProducts() {
    localStorage.setItem("amrutha_ghee_cloud_products", JSON.stringify(productsList));
    renderProductsManager();
}

function seedInitialProductsInCloud() {
    const initialProducts = {};
    window.gheeProducts.forEach(p => {
        initialProducts[p.id] = p;
    });
    dbRefProducts.set(initialProducts)
        .then(() => {
            console.log("Database initialized with default products from products.js");
        })
        .catch(err => console.error("Failed to seed products:", err));
}

// Render products list table in Products view
function renderProductsManager() {
    const tbody = document.getElementById("products-tbody");
    const noProductsState = document.getElementById("no-products-state");

    tbody.innerHTML = "";

    const productsArray = Object.keys(productsList).map(key => ({
        id: key,
        ...productsList[key]
    }));

    if (productsArray.length === 0) {
        noProductsState.classList.remove("hidden");
    } else {
        noProductsState.classList.add("hidden");

        productsArray.forEach(product => {
            const tr = document.createElement("tr");
            tr.className = "hover:bg-gray-50/50 transition-colors";

            // Sizes formatting
            let sizesHTML = "<ul class='space-y-1 text-xs text-gray-700 font-semibold'>";
            product.sizes.forEach(sz => {
                sizesHTML += `<li>${sz.size} &rarr; <span class='text-amber-700 font-extrabold'>₹${sz.price}</span></li>`;
            });
            sizesHTML += "</ul>";

            // Features formatting
            let featuresHTML = "<div class='flex flex-wrap gap-1'>";
            product.features.forEach(ft => {
                featuresHTML += `<span class='inline-block bg-amber-50 text-amber-800 text-[10px] px-2 py-0.5 rounded font-bold border border-amber-100'>${ft}</span>`;
            });
            featuresHTML += "</div>";

            tr.innerHTML = `
                <td class="px-6 py-4">
                    <img src="${product.image}" alt="${product.name}" class="w-16 h-16 object-cover rounded-lg border border-gray-200">
                </td>
                <td class="px-6 py-4">
                    <div class="font-bold text-gray-800 text-sm">${product.name}</div>
                    <div class="text-[11px] text-amber-600 font-bold uppercase mt-0.5">${product.subtitle}</div>
                    <div class="text-[11px] text-gray-400 mt-1 max-w-[280px] line-clamp-2">${product.description}</div>
                </td>
                <td class="px-6 py-4">
                    ${sizesHTML}
                </td>
                <td class="px-6 py-4">
                    ${featuresHTML}
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button 
                            type="button"
                            onclick="openEditProductModal('${product.id}')" 
                            class="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="Edit Product & Rates"
                        >
                            <i class="fa-solid fa-pen-to-square text-xs"></i>
                            <span>Edit</span>
                        </button>
                        <button 
                            type="button"
                            onclick="deleteProduct('${product.id}')" 
                            class="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="Permanently Delete Product"
                        >
                            <i class="fa-solid fa-trash-can text-xs"></i>
                            <span>Delete</span>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });
    }
}

// Delete product catalog entry permanently
window.deleteProduct = function(productId) {
    if (!confirm("Are you sure you want to permanently delete this product?\n\nIt will be removed immediately from both the Admin Dashboard and the Customer Website and will no longer be visible to users.")) return;

    // Track permanently deleted product ID in local storage so it is never revived
    const deletedIds = JSON.parse(localStorage.getItem("amrutha_deleted_products") || "[]");
    if (!deletedIds.includes(productId)) {
        deletedIds.push(productId);
        localStorage.setItem("amrutha_deleted_products", JSON.stringify(deletedIds));
    }

    if (productsList[productId]) {
        delete productsList[productId];
        saveDemoProducts();
        window.dispatchEvent(new Event('storage'));
    }

    // Delete on Server API (Permanent Backend Storage)
    fetch('/api/products/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId })
    })
    .then(res => res.json())
    .then(data => {
        console.log(`Product ${productId} permanently deleted on server.`);
    })
    .catch(err => console.warn("Failed to delete product on server:", err));

    // Delete from Firebase if active
    if (!isDemoMode && dbRefProducts) {
        dbRefProducts.child(productId).remove()
            .then(() => {
                console.log(`Product ${productId} permanently deleted from cloud database.`);
            })
            .catch(err => console.error("Error deleting product from cloud:", err));
    }
};

// ----------------------------------------------------
// PRODUCT MODAL AND ADD PRODUCT FORM FUNCTIONS
// ----------------------------------------------------

window.openAddProductModal = function() {
    const modal = document.getElementById("admin-product-modal");
    const titleEl = document.getElementById("product-modal-title");
    const subtitleEl = document.getElementById("product-modal-subtitle");
    const submitBtn = document.getElementById("product-modal-submit-btn");

    // Set Add Mode
    if (titleEl) titleEl.textContent = "Add New Ghee Product";
    if (subtitleEl) subtitleEl.textContent = "Enter ghee details to display on your storefront";
    if (submitBtn) submitBtn.textContent = "Save Product";

    // Reset Hidden Edit ID & Form
    document.getElementById("edit-prod-id").value = "";
    document.getElementById("product-form").reset();

    // Initialize with one empty row
    const container = document.getElementById("size-rows-container");
    container.innerHTML = "";
    addSizeRow("", "");

    // Reset image upload state
    uploadedImageUrl = null;
    document.getElementById("prod-image").value = "";
    document.getElementById("prod-image-file").value = "";
    resetUploadArea();

    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
};

window.openEditProductModal = function(productId) {
    const product = productsList[productId];
    if (!product) return;

    const modal = document.getElementById("admin-product-modal");
    const titleEl = document.getElementById("product-modal-title");
    const subtitleEl = document.getElementById("product-modal-subtitle");
    const submitBtn = document.getElementById("product-modal-submit-btn");

    // Set Edit Mode
    if (titleEl) titleEl.textContent = "Edit Ghee Product";
    if (subtitleEl) subtitleEl.textContent = "Update prices, rates, and product details";
    if (submitBtn) submitBtn.textContent = "Update Product";

    // Set Hidden Edit ID
    document.getElementById("edit-prod-id").value = product.id;

    // Populate Fields
    document.getElementById("prod-name").value = product.name || "";
    document.getElementById("prod-subtitle").value = product.subtitle || "";
    document.getElementById("prod-description").value = product.description || "";
    document.getElementById("prod-features").value = product.features ? product.features.join(", ") : "";
    document.getElementById("prod-benefits").value = product.benefits ? product.benefits.join("\n") : "";

    // Populate Image
    document.getElementById("prod-image").value = product.image || "";
    if (product.image) {
        uploadedImageUrl = product.image;
        const placeholder = document.getElementById("upload-placeholder");
        const preview = document.getElementById("upload-preview");
        const previewImg = document.getElementById("upload-preview-img");
        const filenameEl = document.getElementById("upload-filename");
        if (placeholder && preview && previewImg && filenameEl) {
            placeholder.classList.add("hidden");
            preview.classList.remove("hidden");
            previewImg.src = product.image;
            filenameEl.textContent = product.image;
        }
    } else {
        resetUploadArea();
    }

    // Populate dynamic sizes and rates
    const container = document.getElementById("size-rows-container");
    container.innerHTML = "";
    if (product.sizes && product.sizes.length > 0) {
        product.sizes.forEach(sz => {
            addSizeRow(sz.size, sz.price);
        });
    } else {
        addSizeRow("", "");
    }

    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
};

window.closeAddProductModal = function() {
    const modal = document.getElementById("admin-product-modal");
    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
    document.getElementById("product-form").reset();
    document.getElementById("edit-prod-id").value = "";
    uploadedImageUrl = null;
    resetUploadArea();
};

window.addSizeRow = function(sizeVal = "", priceVal = "") {
    const container = document.getElementById("size-rows-container");
    const row = document.createElement("div");
    row.className = "flex gap-2 items-center size-input-row";
    row.innerHTML = `
        <input type="text" placeholder="e.g. 500ml or 1 Liter" value="${sizeVal}" required class="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-amber-500 size-name-input">
        <input type="number" placeholder="Price (₹)" value="${priceVal}" required class="w-28 px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-amber-500 size-price-input">
        <button type="button" onclick="removeSizeRow(this)" class="w-8 h-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors">
            <i class="fa-solid fa-trash-can text-sm"></i>
        </button>
    `;
    container.appendChild(row);
};

window.removeSizeRow = function(btn) {
    const container = document.getElementById("size-rows-container");
    if (container.children.length > 1) {
        btn.closest(".size-input-row").remove();
    } else {
        alert("You must list at least one size option for the product!");
    }
};

// Image upload state
let uploadedImageUrl = null;

window.handleImageFileSelect = function(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert("Image is too large. Maximum size is 5MB.");
        input.value = "";
        return;
    }

    const uploadArea = document.getElementById("image-upload-area");
    const placeholder = document.getElementById("upload-placeholder");
    const preview = document.getElementById("upload-preview");
    const previewImg = document.getElementById("upload-preview-img");
    const filenameEl = document.getElementById("upload-filename");

    // Show uploading state
    uploadArea.classList.add("border-amber-400", "bg-amber-50/50");
    placeholder.innerHTML = '<div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl"><i class="fa-solid fa-spinner animate-spin"></i></div><p class="text-xs font-bold text-amber-600">Uploading...</p>';

    const formData = new FormData();
    formData.append("image", file);

    fetch("/upload", {
        method: "POST",
        body: formData
    })
    .then(res => {
        if (!res.ok) throw new Error("Upload server endpoint not available");
        return res.json();
    })
    .then(data => {
        if (data.url) {
            uploadedImageUrl = data.url;
            previewImg.src = data.url;
            filenameEl.textContent = file.name;
            placeholder.classList.add("hidden");
            preview.classList.remove("hidden");
            document.getElementById("prod-image").value = data.url;
        } else {
            throw new Error(data.error || "Upload failed");
        }
    })
    .catch(err => {
        // Fallback for static hosting (e.g. Netlify Drop): read file as Base64 Data URL
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            uploadedImageUrl = dataUrl;
            previewImg.src = dataUrl;
            filenameEl.textContent = file.name;
            placeholder.classList.add("hidden");
            preview.classList.remove("hidden");
            document.getElementById("prod-image").value = dataUrl;
        };
        reader.onerror = function() {
            alert("Upload failed: " + err.message);
            resetUploadArea();
        };
        reader.readAsDataURL(file);
    });
};

window.clearImageUpload = function() {
    uploadedImageUrl = null;
    document.getElementById("prod-image-file").value = "";
    document.getElementById("prod-image").value = "";
    resetUploadArea();
};

function resetUploadArea() {
    const placeholder = document.getElementById("upload-placeholder");
    const preview = document.getElementById("upload-preview");
    const uploadArea = document.getElementById("image-upload-area");

    preview.classList.add("hidden");
    placeholder.classList.remove("hidden");
    placeholder.innerHTML = `
        <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl">
            <i class="fa-solid fa-cloud-arrow-up"></i>
        </div>
        <p class="text-xs font-bold text-gray-600">Click to upload image from your laptop</p>
        <p class="text-[10px] text-gray-400">JPG, PNG, WEBP (max 5MB)</p>
    `;
    uploadArea.classList.remove("border-amber-400", "bg-amber-50/50");
}

function setupProductForm() {
    const form = document.getElementById("product-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const editId = document.getElementById("edit-prod-id").value.trim();
        const name = document.getElementById("prod-name").value.trim();
        const subtitle = document.getElementById("prod-subtitle").value.trim();
        const description = document.getElementById("prod-description").value.trim();
        let image = document.getElementById("prod-image").value.trim() || uploadedImageUrl;

        // If editing and no new image specified, preserve existing product image
        if (editId && !image && productsList[editId]) {
            image = productsList[editId].image;
        }

        if (!image) {
            alert("Please provide an image filename, URL, or upload an image.");
            return;
        }

        // Parse features (split by comma)
        const featuresRaw = document.getElementById("prod-features").value;
        const features = featuresRaw.split(",").map(f => f.trim()).filter(f => f !== "");

        // Parse benefits (split by newlines)
        const benefitsRaw = document.getElementById("prod-benefits").value;
        const benefits = benefitsRaw.split("\n").map(b => b.trim()).filter(b => b !== "");

        // Gather sizes & updated rates
        const sizeRows = document.querySelectorAll(".size-input-row");
        const sizes = [];
        sizeRows.forEach(row => {
            const sizeName = row.querySelector(".size-name-input").value.trim();
            const sizePrice = parseFloat(row.querySelector(".size-price-input").value);
            if (sizeName && !isNaN(sizePrice)) {
                sizes.push({
                    size: sizeName,
                    price: sizePrice
                });
            }
        });

        if (sizes.length === 0) {
            alert("Please add at least one valid size and price.");
            return;
        }

        // Determine ID (preserve existing ID if editing, else generate from name)
        const id = editId ? editId : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const productData = {
            id: id,
            name: name,
            subtitle: subtitle,
            description: description,
            image: image,
            features: features,
            benefits: benefits,
            sizes: sizes,
            defaultSizeIndex: sizes.length > 1 ? 1 : 0
        };

        // Update local state immediately
        productsList[id] = productData;
        saveDemoProducts();
        window.dispatchEvent(new Event('storage'));
        closeAddProductModal();

        // 1. Save permanently to Node.js Backend Server API (Render / Local Server)
        fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        })
        .then(res => res.json())
        .then(data => {
            console.log("Product saved permanently on server:", data);
            alert(`"${name}" details, price, and images saved permanently!\nChanges are now live on the customer storefront.`);
        })
        .catch(err => {
            console.warn("Server API not reachable, saved to local cache:", err);
            alert(`"${name}" saved locally in your browser.`);
        });

        // 2. Also sync to Firebase if active
        if (!isDemoMode && dbRefProducts) {
            dbRefProducts.child(id).set(productData)
                .then(() => {
                    console.log("Product saved to Firebase successfully:", id);
                })
                .catch(err => console.error("Error saving product to Firebase:", err));
        }
    });
}

// ----------------------------------------------------
// CHANGE PASSWORD SECTION
// ----------------------------------------------------

window.openChangePasswordModal = function() {
    const modal = document.getElementById("change-password-modal");
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    document.getElementById("change-password-form").reset();
    document.getElementById("change-pass-error").classList.add("hidden");
    document.getElementById("change-pass-success").classList.add("hidden");
};

window.closeChangePasswordModal = function() {
    const modal = document.getElementById("change-password-modal");
    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
    document.getElementById("change-password-form").reset();
};

function setupChangePasswordForm() {
    const form = document.getElementById("change-password-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const currentPassInput = document.getElementById("current-password").value.trim();
        const newPassInput = document.getElementById("new-password").value.trim();
        const confirmPassInput = document.getElementById("confirm-password").value.trim();
        const errEl = document.getElementById("change-pass-error");
        const successEl = document.getElementById("change-pass-success");

        errEl.classList.add("hidden");
        successEl.classList.add("hidden");

        const actualCurrentPass = getAdminPassword();

        if (currentPassInput !== actualCurrentPass) {
            errEl.textContent = "Current password is incorrect.";
            errEl.classList.remove("hidden");
            return;
        }

        if (newPassInput.length < 4) {
            errEl.textContent = "New password must be at least 4 characters long.";
            errEl.classList.remove("hidden");
            return;
        }

        if (newPassInput !== confirmPassInput) {
            errEl.textContent = "New password and confirmation do not match.";
            errEl.classList.remove("hidden");
            return;
        }

        // Save new password locally
        localStorage.setItem("amrutha_admin_custom_password", newPassInput);

        // If cloud database is connected, also sync to Firebase
        if (!isDemoMode && typeof firebase !== 'undefined' && firebase.apps.length) {
            firebase.database().ref("settings/adminPassword").set(newPassInput)
                .catch(err => console.error("Could not sync password to cloud:", err));
        }

        successEl.textContent = "Password updated successfully!";
        successEl.classList.remove("hidden");

        setTimeout(() => {
            closeChangePasswordModal();
        }, 1500);
    });
}
