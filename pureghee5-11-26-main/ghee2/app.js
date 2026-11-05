// Vijayawada Pure Ghee Store - Core JavaScript Logic

// Configuration - USER CAN UPDATE THESE DETAILS
const STORE_CONFIG = {
    whatsappNumber: "919346201521", // Store WhatsApp number (with country code 91, no +, spaces, or dashes)
    storeName: "AMRUTHA PURE GHEE",
    storeAddress: "20-4-182, Ayodhya Nagar, Donka Road, Vijayawada, Andhra Pradesh",
    upiId: "antapalliradhakrishna888@ybl", // Store Default UPI ID (PhonePe / GPay / Paytm / BHIM)
    merchantName: "AMRUTHA PURE GHEE"
};

// Retrieve active UPI ID (allows admin customization saved in localStorage)
function getActiveStoreUPI() {
    const stored = localStorage.getItem("amrutha_store_upi_id");
    if (stored && stored !== "9849998509@ybl") {
        return stored;
    }
    return STORE_CONFIG.upiId || "antapalliradhakrishna888@ybl";
}
// State Management
let cart = [];
let storeProducts = [];

// Initialize Page
document.addEventListener("DOMContentLoaded", () => {
    loadCartFromLocalStorage();
    setupCartDrawerEventListeners();
    setupCheckoutForm();
    setupAccordion();
    setupTrackOrder();
    updateCartUI();
    initializeAppDatabase();
});

// Load products onto UI
function renderProducts() {
    const productGrid = document.getElementById("product-grid");
    if (!productGrid) return;

    productGrid.innerHTML = "";

    storeProducts.forEach((product, productIndex) => {
        // Create product card element
        const productCard = document.createElement("div");
        productCard.className = "bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col glass-card group";
        
        // Active selected size index (fallback to 0 if defaultSizeIndex is missing or invalid)
        let activeSizeIndex = (typeof product.defaultSizeIndex === 'number' && product.defaultSizeIndex < product.sizes.length) ? product.defaultSizeIndex : 0;
        productCard.setAttribute('data-selected-size-idx', activeSizeIndex);

        // Build HTML for sizes selector
        let sizesHTML = "";
        product.sizes.forEach((sz, idx) => {
            const isSelected = idx === activeSizeIndex;
            sizesHTML += `
                <button 
                    type="button"
                    onclick="selectProductSize(${productIndex}, ${idx}, this, event)" 
                    class="px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 cursor-pointer active:scale-95 ${
                        isSelected 
                        ? 'bg-amber-500 border-amber-500 text-white shadow-md scale-[1.03]' 
                        : 'border-gray-200 hover:border-amber-500 text-gray-700 bg-white'
                    }"
                    data-price="${sz.price}"
                    data-size="${sz.size}"
                    data-idx="${idx}"
                >
                    ${sz.size}
                </button>
            `;
        });

        // Features list
        let featuresHTML = "";
        if (product.features && product.features.length) {
            product.features.forEach(feat => {
                featuresHTML += `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-100">
                        ${feat}
                    </span>
                `;
            });
        }

        // Default price
        const initialPrice = product.sizes[activeSizeIndex] ? product.sizes[activeSizeIndex].price : 0;
        const initialSizeName = product.sizes[activeSizeIndex] ? product.sizes[activeSizeIndex].size : '';

        productCard.innerHTML = `
            <div class="relative overflow-hidden bg-gradient-to-b from-amber-50/70 via-amber-100/25 to-white flex items-center justify-center p-3 sm:p-4 cursor-pointer group/img" onclick="openProductImageModal('${product.image}', '${product.name}')">
                <img 
                    src="${product.image}" 
                    alt="${product.name}" 
                    class="w-full h-72 sm:h-80 md:h-96 object-contain mx-auto drop-shadow-md transform group-hover/img:scale-105 transition-transform duration-500 rounded-2xl"
                    loading="lazy"
                />
                <div class="absolute top-3 left-3 bg-amber-600 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md shadow-sm pointer-events-none flex items-center gap-1">
                    <i class="fa-solid fa-award text-[10px]"></i>
                    <span>Pure & Natural</span>
                </div>
                <div class="absolute top-3 right-3 bg-white/95 hover:bg-white text-gray-700 hover:text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm border border-amber-200 transition-all flex items-center gap-1 opacity-90 group-hover/img:opacity-100" title="Click to view full photo">
                    <i class="fa-solid fa-magnifying-glass-plus text-amber-600"></i>
                    <span class="hidden sm:inline">View Full</span>
                </div>
            </div>
            
            <div class="p-6 flex-1 flex flex-col">
                <div class="flex flex-wrap gap-1 mb-3">
                    ${featuresHTML}
                </div>
                
                <h3 class="text-xl font-bold text-gray-800 mb-1 group-hover:text-amber-700 transition-colors">
                    ${product.name}
                </h3>
                <p class="text-xs text-amber-600 font-semibold mb-3 tracking-wide uppercase">${product.subtitle}</p>
                <p class="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                    ${product.description}
                </p>

                <!-- Sizes Selector -->
                <div class="mb-5">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Size:</span>
                        <span class="text-xs font-extrabold text-amber-700 selected-size-label">${initialSizeName}</span>
                    </div>
                    <div class="flex flex-wrap gap-2 size-selector-container">
                        ${sizesHTML}
                    </div>
                </div>

                <!-- Price and Action Buttons (Mobile-first) -->
                <div class="pt-4 border-t border-amber-100 mt-auto space-y-3">
                    <div class="flex items-baseline justify-between">
                        <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Price:</span>
                        <div class="text-2xl sm:text-3xl font-black text-amber-950">
                            ₹<span class="price-display">${initialPrice}</span>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2">
                        <button 
                            type="button"
                            onclick="addProductToCart(${productIndex})" 
                            class="py-3 px-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-amber-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md cursor-pointer"
                        >
                            <i class="fa-solid fa-cart-plus"></i>
                            <span>Add to Cart</span>
                        </button>
                        <button 
                            type="button"
                            onclick="buyNowWhatsApp(${productIndex})" 
                            class="py-3 px-3 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md cursor-pointer"
                            title="Direct Order on WhatsApp"
                        >
                            <i class="fa-brands fa-whatsapp text-base"></i>
                            <span>WhatsApp</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        productGrid.appendChild(productCard);
    });
}

// Direct 1-Click WhatsApp Quick Order for Mobile Users
window.buyNowWhatsApp = function(productIndex) {
    const product = storeProducts[productIndex];
    if (!product) return;

    const productGrid = document.getElementById("product-grid");
    const card = productGrid ? productGrid.children[productIndex] : null;
    let sizeIndex = 0;
    if (card) {
        const attr = card.getAttribute('data-selected-size-idx');
        if (attr !== null && !isNaN(parseInt(attr))) {
            sizeIndex = parseInt(attr);
        }
    }
    let chosenSize = (product.sizes && product.sizes[sizeIndex]) ? product.sizes[sizeIndex] : null;
    if (!chosenSize && card) {
        const activeBtn = card.querySelector('.size-selector-container button.bg-amber-500');
        if (activeBtn) {
            chosenSize = {
                size: activeBtn.getAttribute('data-size'),
                price: parseFloat(activeBtn.getAttribute('data-price'))
            };
        }
    }
    if (!chosenSize && product.sizes && product.sizes[0]) {
        chosenSize = product.sizes[0];
    }
    if (!chosenSize) return;

    const waText = 
`🧈 *AMRUTHA PURE GHEE - DIRECT ORDER* 🧈
--------------------------------
*Product:* ${product.name}
*Size:* ${chosenSize.size}
*Price:* ₹${chosenSize.price}
*Quantity:* 1
--------------------------------
Please confirm availability and delivery to my address in Vijayawada. Thank you!`;

    const encodedMsg = encodeURIComponent(waText);
    const waURL = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodedMsg}`;
    window.open(waURL, "_blank");
};

// Handle Size Selection Change on Product Card
window.selectProductSize = function(productIndex, sizeIndex, buttonElement, ev) {
    if (ev) {
        try { ev.preventDefault(); ev.stopPropagation(); } catch (e) {}
    }
    
    // Resolve button element safely
    const btn = buttonElement || (ev ? ev.currentTarget : null);
    if (!btn) return;
    
    // Find parent card and container
    const parentCard = btn.closest('.glass-card') || btn.closest('[data-selected-size-idx]') || btn.closest('.group') || btn.parentElement.parentElement;
    const container = btn.closest('.size-selector-container') || (parentCard ? parentCard.querySelector('.size-selector-container') : null);

    // Read size, price, and idx directly from the clicked button
    const directPrice = btn.getAttribute('data-price');
    const directSize = btn.getAttribute('data-size');
    const idx = (typeof sizeIndex === 'number') ? sizeIndex : parseInt(btn.getAttribute('data-idx') || '0', 10);

    // Resolve price & size: prioritize data attributes on button, fallback to storeProducts
    let finalPrice = directPrice;
    let finalSize = directSize;
    if (storeProducts && storeProducts[productIndex] && storeProducts[productIndex].sizes && storeProducts[productIndex].sizes[idx]) {
        const prodSize = storeProducts[productIndex].sizes[idx];
        if (!finalPrice) finalPrice = prodSize.price;
        if (!finalSize) finalSize = prodSize.size;
        storeProducts[productIndex].defaultSizeIndex = idx;
    }

    // 1. Update button visual states inside this card
    if (container) {
        const allButtons = container.querySelectorAll('button');
        allButtons.forEach(b => {
            b.className = "px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 cursor-pointer border-gray-200 hover:border-amber-500 text-gray-700 bg-white active:scale-95";
        });
    }
    btn.className = "px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 cursor-pointer bg-amber-500 border-amber-500 text-white shadow-md active:scale-95 scale-[1.03]";

    // 2. Update Price display
    if (parentCard && finalPrice) {
        const priceDisplay = parentCard.querySelector('.price-display');
        if (priceDisplay) {
            priceDisplay.textContent = finalPrice;
            // Quick bounce animation to give visual feedback that price changed
            priceDisplay.classList.remove('scale-110');
            void priceDisplay.offsetWidth; // trigger reflow
            priceDisplay.classList.add('scale-110', 'transition-transform');
            setTimeout(() => priceDisplay.classList.remove('scale-110'), 150);
        }
    }

    // 3. Update Selected Size Label
    if (parentCard && finalSize) {
        const sizeLabel = parentCard.querySelector('.selected-size-label');
        if (sizeLabel) {
            sizeLabel.textContent = finalSize;
        }
    }

    // 4. Track chosen size index directly on the HTML card
    if (parentCard) {
        parentCard.setAttribute('data-selected-size-idx', idx);
    }
};

// Add product to Cart
window.addProductToCart = function(productIndex, explicitSizeIndex) {
    const product = storeProducts[productIndex];
    if (!product) return;

    let selectedSizeIndex;
    if (typeof explicitSizeIndex === 'number') {
        selectedSizeIndex = explicitSizeIndex;
    } else {
        const productGrid = document.getElementById("product-grid");
        const card = productGrid ? productGrid.children[productIndex] : null;
        const attr = card ? card.getAttribute('data-selected-size-idx') : null;
        if (attr !== null && attr !== undefined && !isNaN(parseInt(attr))) {
            selectedSizeIndex = parseInt(attr);
        } else {
            selectedSizeIndex = (typeof product.defaultSizeIndex === 'number') ? product.defaultSizeIndex : 0;
        }
    }

    // Resolve chosen size safely
    let chosenSize = (product.sizes && product.sizes[selectedSizeIndex]) ? product.sizes[selectedSizeIndex] : null;
    if (!chosenSize) {
        const productGrid = document.getElementById("product-grid");
        const card = productGrid ? productGrid.children[productIndex] : null;
        if (card) {
            const activeBtn = card.querySelector('.size-selector-container button.bg-amber-500');
            if (activeBtn) {
                chosenSize = {
                    size: activeBtn.getAttribute('data-size'),
                    price: parseFloat(activeBtn.getAttribute('data-price'))
                };
            }
        }
    }
    if (!chosenSize && product.sizes && product.sizes[0]) {
        chosenSize = product.sizes[0];
    }
    if (!chosenSize) return;

    const cartItemId = `${product.id}-${chosenSize.size.replace(/\s+/g, '-').toLowerCase()}`;

    // Check if item already exists in cart
    const existingItem = cart.find(item => item.id === cartItemId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: cartItemId,
            productId: product.id,
            name: product.name,
            size: chosenSize.size,
            price: chosenSize.price,
            image: product.image,
            quantity: 1
        });
    }

    saveCartToLocalStorage();
    updateCartUI();
    
    // Show notification at bottom instead of sliding to cart page
    showCartNotification(product.name, chosenSize.size, chosenSize.price);

    // Trigger minor bounce effect on cart header icon
    const cartBtn = document.getElementById("cart-header-btn");
    if (cartBtn) {
        cartBtn.classList.add("scale-110");
        setTimeout(() => cartBtn.classList.remove("scale-110"), 200);
    }
};

// Bottom Toast Notification for Added to Cart
let cartToastTimer = null;

window.showCartNotification = function(productName, size, price) {
    let toast = document.getElementById("cart-toast-notification");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "cart-toast-notification";
        toast.className = "fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] sm:w-auto sm:min-w-[340px] max-w-md bg-gray-900/95 text-white backdrop-blur-md rounded-2xl shadow-2xl p-3 sm:p-3.5 border border-amber-500/30 flex items-center justify-between gap-3 transition-all duration-300 opacity-0 translate-y-8 pointer-events-none";
        document.body.appendChild(toast);
    }

    toast.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <i class="fa-solid fa-circle-check text-base"></i>
            </div>
            <div class="min-w-0 text-left">
                <p class="text-xs font-bold text-white truncate leading-tight">${productName}</p>
                <p class="text-[11px] text-amber-300/90 font-medium">Added to cart (${size}) • ₹${price}</p>
            </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
            <button type="button" onclick="openCartDrawer(); hideCartNotification();" class="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer">
                <span>View Cart</span>
                <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
            <button type="button" onclick="hideCartNotification()" class="text-gray-400 hover:text-white text-xs p-1 cursor-pointer" title="Close">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `;

    // Make visible with smooth slide-up
    requestAnimationFrame(() => {
        toast.classList.remove("opacity-0", "translate-y-8", "pointer-events-none");
        toast.classList.add("opacity-100", "translate-y-0", "pointer-events-auto");
    });

    if (cartToastTimer) {
        clearTimeout(cartToastTimer);
    }

    cartToastTimer = setTimeout(() => {
        hideCartNotification();
    }, 3500);
};

window.hideCartNotification = function() {
    const toast = document.getElementById("cart-toast-notification");
    if (toast) {
        toast.classList.add("opacity-0", "translate-y-8", "pointer-events-none");
        toast.classList.remove("opacity-100", "translate-y-0", "pointer-events-auto");
    }
    if (cartToastTimer) {
        clearTimeout(cartToastTimer);
        cartToastTimer = null;
    }
};

// Cart drawer functions
function setupCartDrawerEventListeners() {
    const openCartBtn = document.getElementById("cart-header-btn");
    const openCartHeroBtn = document.getElementById("cart-hero-btn");
    const closeCartBtn = document.getElementById("cart-close-btn");
    const cartOverlay = document.getElementById("cart-overlay");
    const continueShoppingBtn = document.getElementById("continue-shopping-btn");

    if (openCartBtn) openCartBtn.addEventListener("click", openCartDrawer);
    if (openCartHeroBtn) openCartHeroBtn.addEventListener("click", openCartDrawer);
    if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);
    if (cartOverlay) cartOverlay.addEventListener("click", closeCartDrawer);
    if (continueShoppingBtn) continueShoppingBtn.addEventListener("click", closeCartDrawer);
}

function openCartDrawer() {
    hideCartNotification();
    const cartSidebar = document.getElementById("cart-sidebar");
    const cartOverlay = document.getElementById("cart-overlay");

    cartSidebar.classList.remove("translate-x-full");
    cartOverlay.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
}

function closeCartDrawer() {
    const cartSidebar = document.getElementById("cart-sidebar");
    const cartOverlay = document.getElementById("cart-overlay");

    cartSidebar.classList.add("translate-x-full");
    cartOverlay.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
}

// Update Cart View and Counts
function updateCartUI() {
    const cartItemsList = document.getElementById("cart-items-list");
    const cartCountBadges = document.querySelectorAll(".cart-count-badge");
    const cartSubtotal = document.getElementById("cart-subtotal");
    const cartEmptyState = document.getElementById("cart-empty-state");
    const cartFilledState = document.getElementById("cart-filled-state");

    let totalItems = 0;
    let subtotalAmount = 0;

    cart.forEach(item => {
        totalItems += item.quantity;
        subtotalAmount += (item.price * item.quantity);
    });

    // Update cart item count badges in Header
    cartCountBadges.forEach(badge => {
        badge.textContent = totalItems;
        if (totalItems > 0) {
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }
    });

    if (cart.length === 0) {
        cartEmptyState.classList.remove("hidden");
        cartFilledState.classList.add("hidden");
    } else {
        cartEmptyState.classList.add("hidden");
        cartFilledState.classList.remove("hidden");

        cartItemsList.innerHTML = "";
        cart.forEach((item, index) => {
            const itemElement = document.createElement("div");
            itemElement.className = "flex gap-4 items-center border-b border-gray-100 py-4";
            itemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-lg border border-gray-100" />
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-gray-800 text-sm truncate">${item.name}</h4>
                    <span class="inline-block bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-100 mt-1">${item.size}</span>
                    <div class="text-sm font-extrabold text-gray-900 mt-1">₹${item.price}</div>
                </div>
                <div class="flex flex-col items-end gap-2">
                    <button onclick="removeCartItem(${index})" class="text-gray-400 hover:text-red-500 text-xs transition-colors">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                    <div class="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                        <button onclick="updateQuantity(${index}, -1)" class="px-2 py-1 text-gray-500 hover:text-amber-600 transition-colors font-bold text-xs">-</button>
                        <span class="px-2 text-xs font-bold text-gray-700">${item.quantity}</span>
                        <button onclick="updateQuantity(${index}, 1)" class="px-2 py-1 text-gray-500 hover:text-amber-600 transition-colors font-bold text-xs">+</button>
                    </div>
                </div>
            `;
            cartItemsList.appendChild(itemElement);
        });

        cartSubtotal.textContent = `₹${subtotalAmount}`;
    }
}

// Modify Quantities
window.updateQuantity = function(index, change) {
    cart[index].quantity += change;
    
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }

    saveCartToLocalStorage();
    updateCartUI();
};

// Delete Cart Item Completely
window.removeCartItem = function(index) {
    cart.splice(index, 1);
    saveCartToLocalStorage();
    updateCartUI();
};

// Save Cart
function saveCartToLocalStorage() {
    localStorage.setItem("vijayawada_ghee_cart", JSON.stringify(cart));
}

// Load Cart
function loadCartFromLocalStorage() {
    const savedCart = localStorage.getItem("vijayawada_ghee_cart");
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (e) {
            cart = [];
        }
    }
}

// Checkout Modal management
window.openCheckoutModal = function() {
    const checkoutModal = document.getElementById("checkout-modal");
    checkoutModal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
};

window.closeCheckoutModal = function() {
    const checkoutModal = document.getElementById("checkout-modal");
    if (checkoutModal) checkoutModal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
};

// State for active pending online payment
let activePendingPaymentOrder = null;
let activePendingModalBackup = null;

// Setup checkout form submit action
function setupCheckoutForm() {
    const checkoutForm = document.getElementById("checkout-form");
    if (!checkoutForm) return;

    // Cache initial form markup for restoration
    const checkoutModalContent = document.querySelector("#checkout-modal .modal-container");
    if (checkoutModalContent && !activePendingModalBackup) {
        activePendingModalBackup = checkoutModalContent.innerHTML;
    }

    checkoutForm.addEventListener("submit", (e) => {
        e.preventDefault();
        // Default submit triggers online UPI payment modal with dynamic QR and app links
        submitCheckoutWithApp('upi');
    });
}

// Form validation helper
function validateCheckoutFormData() {
    const form = document.getElementById("checkout-form");
    if (!form) return null;
    if (!form.checkValidity()) {
        form.reportValidity();
        return null;
    }

    const customerName = document.getElementById("cust-name").value.trim();
    const customerPhone = document.getElementById("cust-phone").value.trim();
    const customerAddress = document.getElementById("cust-address").value.trim();
    const landmarkEl = document.getElementById("cust-landmark");
    const customerLandmark = landmarkEl ? landmarkEl.value.trim() : "";

    return { customerName, customerPhone, customerAddress, customerLandmark };
}

// 1-Tap App Checkout helper (PhonePe / GPay / Paytm / Universal UPI)
window.submitCheckoutWithApp = function(app = 'upi') {
    const data = validateCheckoutFormData();
    if (!data) return;
    triggerOnlineUPIPayment(data.customerName, data.customerPhone, data.customerAddress, data.customerLandmark, app);
};

// WhatsApp Checkout button helper
window.submitCheckoutWithWhatsApp = function() {
    const data = validateCheckoutFormData();
    if (!data) return;
    triggerWhatsAppCheckout(data.customerName, data.customerPhone, data.customerAddress, data.customerLandmark);
};

// Backward-compatible button helpers
window.submitCheckoutWithPhonePe = function() { submitCheckoutWithApp('phonepe'); };
window.submitCheckoutWithGPay = function() { submitCheckoutWithApp('gpay'); };
window.submitCheckoutWithPaytm = function() { submitCheckoutWithApp('paytm'); };
window.submitCheckoutWithBHIM = function() { submitCheckoutWithApp('bhim'); };
window.submitCheckoutWithOtherUPI = function() { submitCheckoutWithApp('upi'); };

// Restore original checkout form view
window.restoreCheckoutModalForm = function() {
    const checkoutModalContent = document.querySelector("#checkout-modal .modal-container");
    if (activePendingModalBackup && checkoutModalContent) {
        checkoutModalContent.innerHTML = activePendingModalBackup;
    }
    setupCheckoutForm();
    closeCheckoutModal();
};

// Retry active online payment
window.retryActiveOnlinePayment = function() {
    if (!activePendingPaymentOrder) {
        restoreCheckoutModalForm();
        return;
    }
    const order = activePendingPaymentOrder;
    restoreCheckoutModalForm();
    openCheckoutModal();
    triggerOnlineUPIPayment(order.customer.name, order.customer.phone, order.customer.address, order.customer.landmark, order.preferredApp);
};

// Launch UPI App deep link
window.launchUPIApp = function(uri) {
    if (!uri) return;
    window.location.href = uri;
};

// Copy Store UPI ID utility
window.copyUPIId = function(upiId) {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId).then(() => {
        alert(`UPI ID copied: ${upiId}\nYou can paste it in PhonePe, Google Pay, Paytm, or BHIM.`);
    }).catch(() => {
        prompt("Copy UPI ID:", upiId);
    });
};

// ==========================================
// ONLINE UPI PAYMENT WORKFLOW (ORIGINAL DYNAMIC QR)
// ==========================================
window.triggerOnlineUPIPayment = function(name, phone, address, landmark = "", preferredApp = 'upi') {
    if (!cart || cart.length === 0) {
        alert("Your cart is empty! Please add products before placing an order.");
        return;
    }

    let subtotalAmount = 0;
    const itemsArray = [];
    cart.forEach(item => {
        subtotalAmount += (item.price * item.quantity);
        itemsArray.push({
            name: item.name,
            size: item.size,
            price: item.price,
            quantity: item.quantity
        });
    });

    const orderId = "AMR-" + Math.floor(100000 + Math.random() * 900000);
    const storeUpi = getActiveStoreUPI();
    const merchantName = STORE_CONFIG.merchantName || "AMRUTHA PURE GHEE";

    const orderData = {
        id: orderId,
        timestamp: Date.now(),
        customer: {
            name: name,
            phone: phone,
            address: address,
            landmark: landmark
        },
        items: itemsArray,
        subtotal: subtotalAmount,
        status: "Pending",
        paymentStatus: "Pending",
        checkoutMethod: "Online UPI (" + (preferredApp ? preferredApp.toUpperCase() : "UPI") + ")",
        preferredApp: preferredApp || "upi",
        upiId: storeUpi
    };

    activePendingPaymentOrder = orderData;
    try { sessionStorage.setItem("amrutha_pending_order", JSON.stringify(orderData)); } catch (e) {}

    // Backup current checkout modal HTML for smooth back navigation
    const checkoutModalContent = document.querySelector("#checkout-modal .modal-container");
    if (checkoutModalContent && !activePendingModalBackup) {
        activePendingModalBackup = checkoutModalContent.innerHTML;
    }

    // Build standard UPI URL parameters
    const queryParams = new URLSearchParams({
        pa: storeUpi,
        pn: merchantName,
        am: subtotalAmount.toString(),
        cu: "INR",
        tn: `Order ${orderId}`,
        tr: orderId
    });

    const queryString = queryParams.toString();
    const universalUpiUri = `upi://pay?${queryString}`;
    const phonePeUri = `phonepe://pay?${queryString}`;
    const gpayUri = `tez://upi/pay?${queryString}`;
    const paytmUri = `paytmmp://pay?${queryString}`;
    const bhimUri = `bhim://pay?${queryString}`;

    // Select target URI based on customer choice
    let targetUri = universalUpiUri;
    if (preferredApp === 'phonepe') targetUri = phonePeUri;
    else if (preferredApp === 'gpay') targetUri = gpayUri;
    else if (preferredApp === 'paytm') targetUri = paytmUri;
    else if (preferredApp === 'bhim') targetUri = bhimUri;

    // Trigger deep-link on mobile if an app was clicked
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && preferredApp && preferredApp !== 'upi') {
        try {
            window.location.href = targetUri;
        } catch (e) {
            console.warn("Direct UPI app launch:", e);
        }
    }

    // Render interactive payment screen & QR view
    renderPaymentProcessingView(orderData, {
        universalUpiUri,
        phonePeUri,
        gpayUri,
        paytmUri,
        bhimUri,
        targetUri,
        storeUpi,
        preferredApp
    });
};

// Render interactive Payment Screen (Original QR Code + 1-Tap App Links + Direct Confirmation)
function renderPaymentProcessingView(order, upiLinks) {
    const checkoutModalContent = document.querySelector("#checkout-modal .modal-container");
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(upiLinks.universalUpiUri)}`;

    checkoutModalContent.innerHTML = `
        <div class="p-5 sm:p-7 text-center animate-fadeIn">
            <!-- Modal Header -->
            <div class="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <div class="text-left">
                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Online UPI Payment</span>
                    <h3 class="text-lg sm:text-xl font-black text-gray-900 leading-tight">Pay ₹${order.subtotal}</h3>
                </div>
                <div class="text-right">
                    <span class="text-[10px] text-gray-400 font-bold block uppercase">Order ID</span>
                    <span class="font-mono font-bold text-xs bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">${order.id}</span>
                </div>
            </div>

            <!-- Instant Payment App Links -->
            <div class="space-y-2 mb-4">
                <div class="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                    <span><i class="fa-solid fa-arrow-pointer text-amber-500"></i> Tap to Open Your App:</span>
                    <span class="text-[10px] text-amber-600 font-bold">1-Click Pay</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="launchUPIApp('${upiLinks.phonePeUri}')" class="btn-phonepe py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all text-center cursor-pointer">
                        <i class="fa-solid fa-mobile-screen-button text-sm"></i>
                        <span>PhonePe</span>
                    </button>
                    <button type="button" onclick="launchUPIApp('${upiLinks.gpayUri}')" class="btn-gpay py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all text-center cursor-pointer">
                        <i class="fa-brands fa-google text-blue-500 text-sm"></i>
                        <span>Google Pay</span>
                    </button>
                    <button type="button" onclick="launchUPIApp('${upiLinks.paytmUri}')" class="btn-paytm py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all text-center cursor-pointer">
                        <i class="fa-solid fa-wallet text-sm text-cyan-400"></i>
                        <span>Paytm</span>
                    </button>
                    <button type="button" onclick="launchUPIApp('${upiLinks.bhimUri}')" class="btn-bhim py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all text-center cursor-pointer">
                        <i class="fa-solid fa-building-columns text-sm text-emerald-200"></i>
                        <span>BHIM</span>
                    </button>
                </div>
                <button type="button" onclick="launchUPIApp('${upiLinks.universalUpiUri}')" class="w-full btn-upi-any py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all text-center cursor-pointer">
                    <i class="fa-solid fa-qrcode text-sm"></i>
                    <span>Other UPI App</span>
                </button>
            </div>

            <!-- Dynamic UPI QR Code Card (From original first file) -->
            <div class="bg-gray-50/80 rounded-2xl p-4 border border-gray-200 mb-5 space-y-3">
                <div class="flex items-center justify-between text-xs text-gray-500">
                    <span class="font-bold text-gray-700">Or Scan UPI QR Code:</span>
                    <span class="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Instant UPI</span>
                </div>
                
                <div class="flex justify-center my-2">
                    <div class="p-2.5 bg-white rounded-2xl shadow-md border border-gray-100 inline-block qr-pulse">
                        <img 
                            src="${qrImageUrl}" 
                            alt="Scan QR Code to Pay ₹${order.subtotal}" 
                            class="w-44 h-44 object-contain mx-auto rounded-xl" 
                            onerror="this.onerror=null; this.src='https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLinks.universalUpiUri)}';" 
                        />
                    </div>
                </div>

                <div class="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-gray-200 text-xs">
                    <span class="text-gray-500 font-medium truncate mr-2">UPI ID: <strong class="text-gray-800 font-mono">${upiLinks.storeUpi}</strong></span>
                    <button type="button" onclick="copyUPIId('${upiLinks.storeUpi}')" class="shrink-0 bg-amber-100 hover:bg-amber-200 text-amber-900 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1">
                        <i class="fa-regular fa-copy"></i> Copy
                    </button>
                </div>
            </div>

            <!-- Customer Payment Action Button -->
            <div class="space-y-2.5 pt-1">
                <!-- Send Proof on WhatsApp -->
                <button 
                    type="button" 
                    id="btn-confirm-submit" 
                    onclick="confirmPaymentAndCompleteOrder()" 
                    class="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 active:scale-[0.98] text-white font-black rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-500"
                >
                    <i class="fa-brands fa-whatsapp text-lg"></i>
                    <span>Send Proof on WhatsApp</span>
                </button>

                <!-- Change Payment Method / Back to Delivery Form -->
                <button 
                    type="button" 
                    onclick="restoreCheckoutModalForm()" 
                    class="w-full py-1.5 text-xs text-gray-500 hover:text-gray-800 cursor-pointer flex items-center justify-center gap-1 transition-colors"
                >
                    <i class="fa-solid fa-arrow-left text-[10px]"></i>
                    <span>Change Payment Method or Address</span>
                </button>
            </div>
        </div>
    `;
}

// Direct Confirmation Action without UTR friction
window.confirmPaymentAndCompleteOrder = function() {
    if (!activePendingPaymentOrder) {
        const saved = sessionStorage.getItem("amrutha_pending_order");
        if (saved) {
            try { activePendingPaymentOrder = JSON.parse(saved); } catch (e) {}
        }
    }
    if (!activePendingPaymentOrder) return;

    const btn = document.getElementById("btn-confirm-submit");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1.5"></i> Opening WhatsApp...`;
    }

    const appName = activePendingPaymentOrder.preferredApp ? activePendingPaymentOrder.preferredApp.toUpperCase() : "UPI / QR";
    setTimeout(() => {
        completePaymentSuccess("UPI_" + Date.now(), `Online UPI (${appName})`);
    }, 400);
};

// Aliases for compatibility
window.verifyAndCheckPayment = window.confirmPaymentAndCompleteOrder;
window.triggerCashfreePayment = window.triggerOnlineUPIPayment;

// Payment Success Handler ("Order Placed Successfully!")
window.completePaymentSuccess = function(paymentRef = null, method = "Online UPI") {
    if (!activePendingPaymentOrder) {
        const saved = sessionStorage.getItem("amrutha_pending_order");
        if (saved) {
            try { activePendingPaymentOrder = JSON.parse(saved); } catch (e) {}
        }
    }
    if (!activePendingPaymentOrder) return;
    const orderData = activePendingPaymentOrder;

    orderData.status = "Pending";
    orderData.paymentStatus = "Paid";
    orderData.transactionId = paymentRef || orderData.transactionId || ("TXN_" + Date.now());
    orderData.checkoutMethod = method || orderData.checkoutMethod || "PhonePe / GPay";
    orderData.statusTimestamps = {
        Placed: Date.now()
    };

    localStorage.setItem("amrutha_last_order_id", orderData.id);
    try { sessionStorage.removeItem("amrutha_pending_order"); } catch (e) {}

    // Build items summary for WhatsApp message
    let itemsSummary = "";
    orderData.items.forEach((item, idx) => {
        itemsSummary += `${idx + 1}. *${item.name}* (${item.size}) × ${item.quantity} = ₹${item.price * item.quantity}\n`;
    });

    // Auto-formatted WhatsApp confirmation message including Order ID
    const waText = 
`🧈 *AMRUTHA PURE GHEE - NEW ORDER RECEIVED* 🧈
--------------------------------
✅ *Payment Status:* PAID ONLINE (${orderData.checkoutMethod})
*Order ID:* ${orderData.id}
*Payment Method:* ${orderData.checkoutMethod}
*Payment Ref:* ${orderData.transactionId}
*Total Paid:* ₹${orderData.subtotal}
*Status:* Pending Store Confirmation
--------------------------------
*Customer Details:*
• *Name:* ${orderData.customer.name}
• *Phone:* ${orderData.customer.phone}
• *Address:* ${orderData.customer.address}
--------------------------------
*Items Ordered:*
${itemsSummary}
--------------------------------
🎉 *Order Placed Successfully!*
Thank you for ordering with Amrutha Pure Ghee. Our team is verifying your order and will confirm it shortly.`;

    const encodedMsg = encodeURIComponent(waText);
    const waURL = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodedMsg}`;

    // Send message to WhatsApp automatically
    try {
        window.open(waURL, "_blank");
    } catch (e) {
        console.warn("Could not auto-open WhatsApp:", e);
    }

    saveOrderToDatabase(orderData, () => {
        const checkoutModalContent = document.querySelector("#checkout-modal .modal-container");
        checkoutModalContent.innerHTML = `
            <div class="p-6 sm:p-8 text-center animate-fadeIn">
                <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
                <h3 class="text-xl sm:text-2xl font-bold text-gray-800 mb-1 serif-font">Order Placed Successfully!</h3>
                <p class="text-xs sm:text-sm text-green-700 font-bold mb-1 flex items-center justify-center gap-1">
                    <i class="fa-solid fa-shield-check"></i> Payment Received (Pending Store Confirmation)
                </p>
                <p class="text-xs sm:text-sm text-gray-500 mb-5">
                    Thank you, <strong class="text-gray-700">${orderData.customer.name}</strong>! Your payment of <strong>₹${orderData.subtotal}</strong> is received. Our admin will confirm your order shortly.
                </p>
                
                <div class="bg-amber-50/70 rounded-2xl p-4 text-left border border-amber-200/70 mb-5 text-xs sm:text-sm space-y-2">
                    <div class="flex justify-between items-center py-0.5">
                        <span class="text-gray-500 font-semibold">Order ID:</span>
                        <div class="flex items-center gap-1.5">
                            <span class="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">${orderData.id}</span>
                            <button onclick="copyOrderId('${orderData.id}')" class="text-gray-400 hover:text-amber-700 text-xs p-1 cursor-pointer" title="Copy Order ID">
                                <i class="fa-regular fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex justify-between py-0.5"><span class="text-gray-500 font-semibold">Payment Method:</span> <span class="font-bold text-gray-800">${orderData.checkoutMethod}</span></div>
                    ${orderData.transactionId && orderData.transactionId !== 'Paid Online' ? `
                    <div class="flex justify-between py-0.5"><span class="text-gray-500 font-semibold">Payment Ref:</span> <span class="font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">${orderData.transactionId}</span></div>` : ''}
                    <div class="flex justify-between py-0.5"><span class="text-gray-500 font-semibold">Amount Paid:</span> <span class="font-extrabold text-green-700">₹${orderData.subtotal}</span></div>
                    <div class="flex justify-between py-0.5"><span class="text-gray-500 font-semibold">Order Status:</span> <span class="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1"><i class="fa-solid fa-clock text-xs"></i> Pending Admin Confirmation</span></div>
                    <div class="flex justify-between py-0.5"><span class="text-gray-500 font-semibold">Payment Status:</span> <span class="font-bold text-green-600 flex items-center gap-1"><i class="fa-solid fa-circle-check text-xs"></i> Complete (Paid Online)</span></div>
                    <div class="flex justify-between py-0.5"><span class="text-gray-500 font-semibold">Delivery Address:</span> <span class="font-medium text-gray-700 text-right truncate max-w-[190px]">${orderData.customer.address}</span></div>
                </div>

                <div class="space-y-2.5">
                    <button onclick="closeCheckoutModal(); openTrackOrderModal('${orderData.id}');" class="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-black py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer">
                        <i class="fa-solid fa-truck-fast"></i>
                        <span>Track This Order Now</span>
                    </button>

                    <button onclick="restoreCheckoutModalForm()" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer">
                        Continue Ghee Shopping
                    </button>
                </div>
            </div>
        `;

        // Clear cart
        cart = [];
        saveCartToLocalStorage();
        updateCartUI();
        closeCartDrawer();
        activePendingPaymentOrder = null;
    });
};

// Payment Failure Handler ("Payment Failed")
window.completePaymentFailure = function(reason = "Payment unsuccessful or transaction could not be verified") {
    if (!activePendingPaymentOrder) return;
    const orderData = activePendingPaymentOrder;

    orderData.status = "Failed";
    orderData.paymentStatus = "Failed";

    const checkoutModalContent = document.querySelector("#checkout-modal .modal-container");
    checkoutModalContent.innerHTML = `
        <div class="p-6 sm:p-8 text-center animate-fadeIn">
            <div class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
                <i class="fa-solid fa-circle-xmark"></i>
            </div>
            <h3 class="text-xl sm:text-2xl font-bold text-gray-800 mb-1 serif-font">Payment Failed</h3>
            <p class="text-xs sm:text-sm text-red-600 font-bold mb-1">
                ${reason}
            </p>
            <p class="text-xs text-gray-500 mb-5">
                We could not verify your online transaction. If money was not deducted from your account, please retry the payment below.
            </p>

            <div class="bg-red-50/70 rounded-2xl p-4 text-left border border-red-200/70 mb-5 text-xs sm:text-sm space-y-2">
                <div class="flex justify-between items-center py-0.5">
                    <span class="text-gray-500 font-semibold">Order Reference:</span>
                    <span class="font-mono font-bold text-red-900 bg-red-100 px-2 py-0.5 rounded border border-red-200">${orderData.id}</span>
                </div>
                <div class="flex justify-between py-0.5"><span class="text-gray-500 font-semibold">Bill Amount:</span> <span class="font-extrabold text-gray-900">₹${orderData.subtotal}</span></div>
                <div class="flex justify-between py-0.5"><span class="text-gray-500 font-semibold">Payment Status:</span> <span class="font-bold text-red-600 flex items-center gap-1"><i class="fa-solid fa-circle-xmark text-xs"></i> Failed / Not Completed</span></div>
            </div>

            <div class="space-y-2.5">
                <button onclick="retryActiveOnlinePayment()" class="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-black py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer">
                    <i class="fa-solid fa-rotate-right"></i>
                    <span>Retry Online Payment Now</span>
                </button>

                <a href="https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Hello Amrutha Ghee, my online payment for order ' + orderData.id + ' failed. Could you please check?')}" target="_blank" class="w-full py-2.5 text-xs font-bold text-green-700 hover:text-green-800 flex items-center justify-center gap-1.5">
                    <i class="fa-brands fa-whatsapp text-sm text-green-600"></i>
                    <span>Need Help? Chat with Store Manager</span>
                </a>

                <button onclick="restoreCheckoutModalForm()" class="w-full text-xs text-gray-400 hover:text-gray-600 py-1 cursor-pointer">
                    ← Back to Delivery Address
                </button>
            </div>
        </div>
    `;
};

// WhatsApp ordering API trigger
function triggerWhatsAppCheckout(name, phone, address, landmark) {
    let subtotalAmount = 0;
    let itemsText = "";
    const itemsArray = [];

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        subtotalAmount += itemTotal;
        itemsText += `${index + 1}. *${item.name}* (${item.size}) - Qty: ${item.quantity} [₹${item.price} each] \n`;
        itemsArray.push({
            name: item.name,
            size: item.size,
            price: item.price,
            quantity: item.quantity
        });
    });

    const landmarkText = landmark ? `\n*Landmark*: ${landmark}` : "";

    const orderId = "AMR-" + Math.floor(100000 + Math.random() * 900000);
    const orderData = {
        id: orderId,
        timestamp: Date.now(),
        customer: {
            name: name,
            phone: phone,
            address: address,
            landmark: landmark
        },
        items: itemsArray,
        subtotal: subtotalAmount,
        status: "Pending",
        checkoutMethod: "WhatsApp"
    };

    // Formatted WhatsApp Message
    const textMsg = 
`*NEW ORDER RECEIVED - ${STORE_CONFIG.storeName}*
---------------------------------------
*Order ID*: ${orderId}
*Order Details:*
${itemsText}
*Total Bill Amount:* ₹${subtotalAmount}
---------------------------------------
*Delivery Details:*
*Name*: ${name}
*Phone Number*: ${phone}
*Address*: ${address}${landmarkText}
*Location*: Vijayawada Area
---------------------------------------
Please confirm the order & approximate delivery time. Thank you!`;

    // Encode message for URL
    const encodedMsg = encodeURIComponent(textMsg);
    
    // Redirect URL
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${STORE_CONFIG.whatsappNumber}&text=${encodedMsg}`;
    
    localStorage.setItem("amrutha_last_order_id", orderId);

    saveOrderToDatabase(orderData, () => {
        // Clear cart and redirect
        cart = [];
        saveCartToLocalStorage();
        updateCartUI();
        closeCheckoutModal();
        closeCartDrawer();
        
        // Open in new tab
        window.open(whatsappUrl, "_blank");
    });
}

// Mock Cash on Delivery placement
function triggerCODCheckout(name, phone, address, landmark) {
    // Show success state
    const checkoutModalContent = document.querySelector("#checkout-modal .modal-container");
    const originalContent = checkoutModalContent.innerHTML;

    let subtotalAmount = 0;
    const itemsArray = [];
    cart.forEach(item => {
        subtotalAmount += (item.price * item.quantity);
        itemsArray.push({
            name: item.name,
            size: item.size,
            price: item.price,
            quantity: item.quantity
        });
    });

    const orderId = "AMR-" + Math.floor(100000 + Math.random() * 900000);
    const orderData = {
        id: orderId,
        timestamp: Date.now(),
        customer: {
            name: name,
            phone: phone,
            address: address,
            landmark: landmark
        },
        items: itemsArray,
        subtotal: subtotalAmount,
        status: "Pending",
        checkoutMethod: "COD"
    };

    localStorage.setItem("amrutha_last_order_id", orderId);

    saveOrderToDatabase(orderData, () => {
        checkoutModalContent.innerHTML = `
            <div class="p-6 sm:p-8 text-center">
                <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
                <h3 class="text-xl sm:text-2xl font-bold text-gray-800 mb-1 serif-font">Order Placed Successfully!</h3>
                <p class="text-xs sm:text-sm text-gray-500 mb-5">Thank you, <strong class="text-gray-700">${name}</strong>! Your Cash on Delivery order is registered.</p>
                
                <div class="bg-amber-50/70 rounded-2xl p-4 text-left border border-amber-200/70 mb-5 text-xs sm:text-sm space-y-2">
                    <div class="flex justify-between items-center py-0.5">
                        <span class="text-gray-500 font-semibold">Order ID:</span>
                        <div class="flex items-center gap-1.5">
                            <span class="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">${orderId}</span>
                            <button onclick="copyOrderId('${orderId}')" class="text-gray-400 hover:text-amber-700 text-xs p-1" title="Copy Order ID">
                                <i class="fa-regular fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex justify-between py-0.5"><span class="text-gray-500 font-semibold">Amount to Pay:</span> <span class="font-extrabold text-gray-900">₹${subtotalAmount}</span></div>
                    <div class="flex justify-between py-0.5"><span class="text-gray-500 font-semibold">Delivery Location:</span> <span class="font-medium text-gray-700 text-right truncate max-w-[190px]">${address}</span></div>
                </div>

                <p class="text-xs text-amber-700 font-semibold mb-5 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/60 flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-truck-fast text-amber-600"></i> Fast Delivery across Vijayawada within 1-2 hours.
                </p>
                
                <button onclick="closeCheckoutModal(); openTrackOrderModal('${orderId}');" class="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-black py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer mb-2.5">
                    <i class="fa-solid fa-truck-fast"></i>
                    <span>Track This Order Now</span>
                </button>

                <button onclick="restoreCheckoutModal('${encodeURIComponent(originalContent)}')" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer">
                    Continue Ghee Shopping
                </button>
            </div>
        `;

        // Clear cart
        cart = [];
        saveCartToLocalStorage();
        updateCartUI();
        closeCartDrawer();
    });
}

// Restore checkout modal design after cod completes
window.restoreCheckoutModal = function(escapedOriginalContent) {
    const checkoutModalContent = document.querySelector("#checkout-modal .modal-container");
    checkoutModalContent.innerHTML = decodeURIComponent(escapedOriginalContent);
    closeCheckoutModal();
    setupCheckoutForm(); // Rebind event listeners
};


// Interactive FAQs Accordion
function setupAccordion() {
    const faqItems = document.querySelectorAll(".faq-item");
    faqItems.forEach(item => {
        const header = item.querySelector(".faq-header");
        header.addEventListener("click", () => {
            // Check if active
            const isActive = item.classList.contains("accordion-active");
            
            // Close all items
            faqItems.forEach(faq => {
                faq.classList.remove("accordion-active");
            });

            // Toggle selected item
            if (!isActive) {
                item.classList.add("accordion-active");
            }
        });
    });
}


// Database & Server API Integration for Order & Product Logging
let appDbRef = null;
let appDbRefProducts = null;
let isAppDemoMode = true;

function initializeAppDatabase() {
    // 0. Connect Live Google Firebase Database
    if (typeof firebase !== 'undefined' && window.firebaseConfig) {
        const config = window.firebaseConfig;
        const isPlaceholder = config.apiKey === "PLACEHOLDER_API_KEY" || config.projectId === "PLACEHOLDER_PROJECT_ID";
        if (!isPlaceholder) {
            isAppDemoMode = false;
            try {
                if (!firebase.apps.length) firebase.initializeApp(config);
                appDbRef = firebase.database().ref("orders");
                appDbRefProducts = firebase.database().ref("products");
                console.log("Storefront: Google Firebase Realtime Database connected successfully!");
            } catch (e) {
                console.error("Firebase init failed:", e);
            }
        }
    }

    // 1. Fetch store configuration (e.g. live UPI ID) from Server API
    fetch('/api/config?_t=' + Date.now(), { cache: 'no-store' })
        .then(res => res.json())
        .then(cfg => {
            if (cfg && cfg.upiId) {
                STORE_CONFIG.upiId = cfg.upiId;
                localStorage.setItem("amrutha_store_upi_id", cfg.upiId);
            }
        })
        .catch(() => {});

    // 2. Fetch fresh products from Server API (Persistent backend on Render / Local Server)
    fetch('/api/products?_t=' + Date.now(), { cache: 'no-store' })
        .then(res => {
            if (!res.ok) throw new Error("API returned status " + res.status);
            return res.json();
        })
        .then(serverProducts => {
            if (Array.isArray(serverProducts) && serverProducts.length > 0) {
                storeProducts = serverProducts;
                console.log("Storefront: Loaded", storeProducts.length, "fresh products from server API.");
                // Update local storage cache to match server
                const cacheMap = {};
                storeProducts.forEach(p => { cacheMap[p.id] = p; });
                localStorage.setItem("amrutha_ghee_cloud_products", JSON.stringify(cacheMap));
                renderProducts();
            } else {
                loadDemoProducts();
            }
        })
        .catch(err => {
            console.log("Storefront: Server API not reachable, loading fallback:", err.message);
            loadDemoProducts();
        });
}

function loadDemoProducts() {
    syncDemoProductsInStore();
    // Listen to local storage updates (e.g. from admin tab)
    window.addEventListener("storage", syncDemoProductsInStore);
}

function syncDemoProductsInStore() {
    const rawProducts = localStorage.getItem("amrutha_ghee_cloud_products");
    const stored = rawProducts ? JSON.parse(rawProducts) : {};
    const deletedIds = JSON.parse(localStorage.getItem("amrutha_deleted_products") || "[]");
    
    // Purge old deleted placeholders and permanently deleted products
    deletedIds.push("a2-cow-ghee", "premium-buffalo-ghee", "golden-cow-ghee");
    deletedIds.forEach(id => {
        delete stored[id];
    });
    
    // Always sync latest sizes, prices, and defaultSizeIndex from products.js so code changes reflect immediately
    if (window.gheeProducts && Array.isArray(window.gheeProducts)) {
        window.gheeProducts.forEach(p => {
            if (!deletedIds.includes(p.id)) {
                if (stored[p.id]) {
                    // Update prices, sizes, and config from products.js to prevent stale cache mismatch
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
    storeProducts = Object.keys(stored).map(key => stored[key]);
    renderProducts();
}

function seedInitialProductsInCloud() {
    const initialProducts = {};
    window.gheeProducts.forEach(p => {
        initialProducts[p.id] = p;
    });
    if (appDbRefProducts) {
        appDbRefProducts.set(initialProducts)
            .then(() => {
                console.log("Storefront: Seeding products in cloud completed.");
            })
            .catch(err => console.error("Storefront: Failed to seed products:", err));
    }
}

function saveOrderToDatabase(orderData, callback) {
    // 1. Save to local storage as client backup
    const rawOrders = localStorage.getItem("amrutha_ghee_cloud_orders");
    const orders = rawOrders ? JSON.parse(rawOrders) : {};
    orders[orderData.id] = orderData;
    localStorage.setItem("amrutha_ghee_cloud_orders", JSON.stringify(orders));
    window.dispatchEvent(new Event('storage'));

    // 2. Save permanently to Node.js Server API (Render / Local Server)
    fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    })
    .then(res => res.json())
    .then(data => {
        console.log("Storefront: Order recorded on server successfully:", orderData.id);
    })
    .catch(err => {
        console.warn("Storefront: Could not record order on server (saved locally):", err.message);
    });

    // 3. Save to Firebase if configured
    if (!isAppDemoMode && appDbRef) {
        appDbRef.child(orderData.id).set(orderData)
            .then(() => {
                console.log("Storefront: Order synced to Firebase database successfully.", orderData.id);
            })
            .catch(err => console.error("Failed to sync order to Firebase:", err));
    }

    if (callback) callback();
}

// ----------------------------------------------------
// CUSTOMER ORDER TRACKING MODULE
// ----------------------------------------------------

let currentTrackedOrderId = null;
let firebaseTrackListener = null;

function setupTrackOrder() {
    // Listen for localStorage changes from admin dashboard (cross-tab reactive sync)
    window.addEventListener("storage", (e) => {
        if (!e.key || e.key === "amrutha_ghee_cloud_orders") {
            const modal = document.getElementById("track-order-modal");
            if (modal && !modal.classList.contains("hidden") && currentTrackedOrderId) {
                console.log("Storefront: Syncing order update from storage event...");
                fetchAndDisplayOrder(currentTrackedOrderId, true);
            }
        }
    });

    // Close on escape key
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const logoModal = document.getElementById("logo-modal");
            if (logoModal && !logoModal.classList.contains("hidden")) {
                closeLogoModal();
                return;
            }
            const imgModal = document.getElementById("image-lightbox-modal");
            if (imgModal && !imgModal.classList.contains("hidden")) {
                closeProductImageModal();
                return;
            }
            const modal = document.getElementById("track-order-modal");
            if (modal && !modal.classList.contains("hidden")) {
                closeTrackOrderModal();
            }
        }
    });
}

// Open Product Image Lightbox Modal
window.openProductImageModal = function(imageSrc, title, subtitle) {
    const modal = document.getElementById("image-lightbox-modal");
    const imgEl = document.getElementById("lightbox-img");
    const titleEl = document.getElementById("lightbox-title");
    const subtitleEl = document.getElementById("lightbox-subtitle");
    const waBtn = document.getElementById("lightbox-wa-btn");
    if (!modal || !imgEl) return;

    imgEl.src = imageSrc;
    if (titleEl) titleEl.textContent = title || "AMRUTHA PURE GHEE";
    if (subtitleEl) {
        subtitleEl.textContent = subtitle || "100% Pure Traditional Bilona Ghee • Full View";
    }
    if (waBtn) {
        waBtn.href = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(`Hello Amrutha Ghee, I am interested in ordering ${title || 'Amrutha Ghee'}.`)}`;
    }

    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
};

// Open Logo Modal (Shows Clean Logo Only)
window.openLogoModal = function() {
    const modal = document.getElementById("logo-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
};

// Close Logo Modal
window.closeLogoModal = function() {
    const modal = document.getElementById("logo-modal");
    if (modal) modal.classList.add("hidden");

    const trackModal = document.getElementById("track-order-modal");
    const checkoutModal = document.getElementById("checkout-modal");
    const imgModal = document.getElementById("image-lightbox-modal");
    const isOtherModalOpen = (trackModal && !trackModal.classList.contains("hidden")) || 
                             (checkoutModal && !checkoutModal.classList.contains("hidden")) ||
                             (imgModal && !imgModal.classList.contains("hidden"));
    if (!isOtherModalOpen) {
        document.body.classList.remove("overflow-hidden");
    }
};

// Close Product Image Lightbox Modal
window.closeProductImageModal = function() {
    const modal = document.getElementById("image-lightbox-modal");
    if (modal) modal.classList.add("hidden");

    const trackModal = document.getElementById("track-order-modal");
    const checkoutModal = document.getElementById("checkout-modal");
    const isOtherModalOpen = (trackModal && !trackModal.classList.contains("hidden")) || 
                             (checkoutModal && !checkoutModal.classList.contains("hidden"));
    if (!isOtherModalOpen) {
        document.body.classList.remove("overflow-hidden");
    }
};

// Open Order Tracking Modal
window.openTrackOrderModal = function(orderIdOpt) {
    const modal = document.getElementById("track-order-modal");
    if (!modal) return;

    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");

    const input = document.getElementById("track-order-input");
    const resultContainer = document.getElementById("track-result-container");
    const notFoundEl = document.getElementById("track-not-found");
    const initialEl = document.getElementById("track-initial-state");
    const recentPillContainer = document.getElementById("track-recent-pill-container");

    if (recentPillContainer) {
        recentPillContainer.classList.add("hidden");
    }

    // Clean up any existing Firebase listener
    if (firebaseTrackListener && appDbRef && currentTrackedOrderId) {
        appDbRef.child(currentTrackedOrderId).off("value", firebaseTrackListener);
        firebaseTrackListener = null;
    }

    if (orderIdOpt && typeof orderIdOpt === "string" && orderIdOpt.trim()) {
        const cleanId = orderIdOpt.trim();
        if (input) input.value = cleanId;
        fetchAndDisplayOrder(cleanId);
    } else {
        // Reset to initial clean prompt - user must enter mobile number or Order ID
        if (input) input.value = "";
        currentTrackedOrderId = null;
        if (resultContainer) {
            resultContainer.innerHTML = "";
            resultContainer.classList.add("hidden");
        }
        if (notFoundEl) notFoundEl.classList.add("hidden");
        if (initialEl) initialEl.classList.remove("hidden");

        if (input) {
            setTimeout(() => {
                input.focus();
            }, 100);
        }
    }
};

// Reset Track Order modal back to search prompt
window.resetTrackOrderModal = function() {
    if (firebaseTrackListener && appDbRef && currentTrackedOrderId) {
        appDbRef.child(currentTrackedOrderId).off("value", firebaseTrackListener);
        firebaseTrackListener = null;
    }
    currentTrackedOrderId = null;
    const input = document.getElementById("track-order-input");
    if (input) {
        input.value = "";
        input.focus();
    }
    const resultContainer = document.getElementById("track-result-container");
    if (resultContainer) {
        resultContainer.innerHTML = "";
        resultContainer.classList.add("hidden");
    }
    const notFoundEl = document.getElementById("track-not-found");
    if (notFoundEl) notFoundEl.classList.add("hidden");
    const initialEl = document.getElementById("track-initial-state");
    if (initialEl) initialEl.classList.remove("hidden");
};

// Close Order Tracking Modal
window.closeTrackOrderModal = function() {
    const modal = document.getElementById("track-order-modal");
    if (modal) modal.classList.add("hidden");

    // Clean up Firebase active listener if any
    if (firebaseTrackListener && appDbRef && currentTrackedOrderId) {
        appDbRef.child(currentTrackedOrderId).off("value", firebaseTrackListener);
        firebaseTrackListener = null;
    }

    currentTrackedOrderId = null;

    // Reset tracking modal state back to initial state
    const input = document.getElementById("track-order-input");
    if (input) input.value = "";
    const resultContainer = document.getElementById("track-result-container");
    if (resultContainer) {
        resultContainer.innerHTML = "";
        resultContainer.classList.add("hidden");
    }
    const notFoundEl = document.getElementById("track-not-found");
    if (notFoundEl) notFoundEl.classList.add("hidden");
    const initialEl = document.getElementById("track-initial-state");
    if (initialEl) initialEl.classList.remove("hidden");

    // Restore body overflow if checkout modal is not open
    const checkoutModal = document.getElementById("checkout-modal");
    const isOtherModalOpen = checkoutModal && !checkoutModal.classList.contains("hidden");
    
    if (!isOtherModalOpen) {
        document.body.classList.remove("overflow-hidden");
    }
};

// Quick Track Recent Order
window.quickTrackRecentOrder = function() {
    const recentId = localStorage.getItem("amrutha_last_order_id");
    if (recentId) {
        const input = document.getElementById("track-order-input");
        if (input) input.value = recentId;
        fetchAndDisplayOrder(recentId);
    }
};

// Form search submit handler
window.handleTrackOrderSearch = function(event) {
    if (event) event.preventDefault();
    const input = document.getElementById("track-order-input");
    if (!input) return;
    const query = input.value.trim();
    if (!query) {
        input.focus();
        return;
    }
    fetchAndDisplayOrder(query);
};

// Fetch order by ID or Phone and display
function fetchAndDisplayOrder(rawQuery, isBackgroundRefresh = false) {
    if (!rawQuery) return;
    const query = rawQuery.trim();
    const notFoundEl = document.getElementById("track-not-found");
    const initialEl = document.getElementById("track-initial-state");
    const resultContainer = document.getElementById("track-result-container");

    if (!isBackgroundRefresh) {
        if (notFoundEl) notFoundEl.classList.add("hidden");
        if (initialEl) initialEl.classList.add("hidden");
    }

    // Clean search token
    const queryClean = query.toUpperCase();
    const queryDigits = query.replace(/\D/g, '');
    const queryAlphanumeric = queryClean.replace(/[^A-Z0-9]/g, '');

    function findInOrdersObject(orders) {
        if (!orders) return null;

        // 1. Direct ID match
        if (orders[queryClean]) return orders[queryClean];
        if (orders[query]) return orders[query];

        // 2. Search all orders
        const ordersArray = Object.values(orders).filter(Boolean);
        
        // Exact ID match, alphanumeric match, or digits match
        const idMatch = ordersArray.find(o => {
            if (!o || !o.id) return false;
            const oId = String(o.id).toUpperCase();
            const oIdAlphanumeric = oId.replace(/[^A-Z0-9]/g, '');
            if (oId === queryClean) return true;
            if (queryAlphanumeric && oIdAlphanumeric === queryAlphanumeric) return true;
            if (queryDigits.length >= 4 && String(o.id).replace(/\D/g, '') === queryDigits) return true;
            return false;
        });
        if (idMatch) return idMatch;

        // 3. Phone number match (matches 10 digits or with prefix/suffix)
        if (queryDigits.length >= 8) {
            const phoneMatches = ordersArray.filter(o => {
                if (!o || !o.customer || !o.customer.phone) return false;
                const custPhoneDigits = String(o.customer.phone).replace(/\D/g, '');
                return custPhoneDigits.endsWith(queryDigits) || queryDigits.endsWith(custPhoneDigits) || custPhoneDigits.includes(queryDigits);
            });
            if (phoneMatches.length > 0) {
                // Sort by newest order first
                phoneMatches.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                return phoneMatches[0];
            }
        }

        return null;
    }

    // Search LocalStorage first
    const rawStored = localStorage.getItem("amrutha_ghee_cloud_orders");
    let localOrders = {};
    try {
        localOrders = rawStored ? JSON.parse(rawStored) : {};
    } catch (e) {
        localOrders = {};
    }

    const localFound = findInOrdersObject(localOrders);

    if (localFound) {
        renderTrackOrderDetails(localFound);
        // If Firebase is also enabled, attach live listener for real-time updates
        attachFirebaseListenerIfAvailable(localFound.id);
        return;
    }

    // Search Server API (Real-time persistent orders on Render / Local Server)
    fetch('/api/orders?_t=' + Date.now(), { cache: 'no-store' })
        .then(res => res.json())
        .then(cloudOrders => {
            const serverFound = findInOrdersObject(cloudOrders);
            if (serverFound) {
                renderTrackOrderDetails(serverFound);
            } else if (!isAppDemoMode && appDbRef) {
                // If not found on server, check Firebase if active
                appDbRef.once("value").then(snapshot => {
                    const fbOrders = snapshot.val() || {};
                    const fbFound = findInOrdersObject(fbOrders);
                    if (fbFound) {
                        renderTrackOrderDetails(fbFound);
                        attachFirebaseListenerIfAvailable(fbFound.id);
                    } else {
                        showOrderNotFound();
                    }
                }).catch(() => showOrderNotFound());
            } else {
                showOrderNotFound();
            }
        })
        .catch(err => {
            // If offline, check Firebase if active
            if (!isAppDemoMode && appDbRef) {
                appDbRef.once("value").then(snapshot => {
                    const fbOrders = snapshot.val() || {};
                    const fbFound = findInOrdersObject(fbOrders);
                    if (fbFound) {
                        renderTrackOrderDetails(fbFound);
                        attachFirebaseListenerIfAvailable(fbFound.id);
                    } else {
                        showOrderNotFound();
                    }
                }).catch(() => showOrderNotFound());
            } else {
                showOrderNotFound();
            }
        });
}

function showOrderNotFound() {
    const notFoundEl = document.getElementById("track-not-found");
    const initialEl = document.getElementById("track-initial-state");
    const resultContainer = document.getElementById("track-result-container");

    if (initialEl) initialEl.classList.add("hidden");
    if (resultContainer) resultContainer.classList.add("hidden");
    if (notFoundEl) notFoundEl.classList.remove("hidden");
}

function attachFirebaseListenerIfAvailable(orderId) {
    if (isAppDemoMode || !appDbRef || !orderId) return;

    if (firebaseTrackListener && currentTrackedOrderId) {
        appDbRef.child(currentTrackedOrderId).off("value", firebaseTrackListener);
    }

    firebaseTrackListener = (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log("Firebase real-time update received for tracked order:", data.id, data.status);
            renderTrackOrderDetails(data);
        }
    };

    appDbRef.child(orderId).on("value", firebaseTrackListener);
}

// Refresh currently tracked order
window.refreshCurrentTrackedOrder = function() {
    if (currentTrackedOrderId) {
        fetchAndDisplayOrder(currentTrackedOrderId, true);
    }
};

// Render full order tracking details into resultContainer
function renderTrackOrderDetails(order) {
    currentTrackedOrderId = order.id;
    const notFoundEl = document.getElementById("track-not-found");
    const initialEl = document.getElementById("track-initial-state");
    const resultContainer = document.getElementById("track-result-container");

    if (notFoundEl) notFoundEl.classList.add("hidden");
    if (initialEl) initialEl.classList.add("hidden");
    if (!resultContainer) return;

    resultContainer.classList.remove("hidden");

    // Format dates
    const orderDate = new Date(order.timestamp).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    });

    const isCancelled = order.status === "Cancelled";
    const status = order.status || "Pending";
    const timestamps = order.statusTimestamps || {};

    // Helper to format timestamps
    function formatTime(ts) {
        if (!ts) return "";
        const d = new Date(ts);
        return d.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString("en-IN", { month: 'short', day: 'numeric' });
    }

    // Determine status badge colors and descriptions
    let statusBadgeColor = "bg-amber-100 text-amber-900 border-amber-300";
    let statusBadgeText = "Pending Store Confirmation";
    let statusSubtext = "Our store manager is verifying your order and preparing fresh ghee.";
    let progressPercent = 12;

    if (status === "Confirmed") {
        statusBadgeColor = "bg-blue-100 text-blue-900 border-blue-300";
        statusBadgeText = "Order Confirmed & Packing";
        statusSubtext = "Your order is confirmed! Fresh bilona ghee jar is packaged with care.";
        progressPercent = 40;
    } else if (status === "Shipped") {
        statusBadgeColor = "bg-indigo-100 text-indigo-900 border-indigo-300";
        statusBadgeText = "Out for Delivery (Vijayawada)";
        statusSubtext = "Our delivery partner has picked up your order and is on the way to your address.";
        progressPercent = 75;
    } else if (status === "Delivered") {
        statusBadgeColor = "bg-green-100 text-green-900 border-green-300";
        statusBadgeText = "Delivered to Doorstep";
        statusSubtext = "Order delivered! Thank you for choosing Amrutha Pure Ghee.";
        progressPercent = 100;
    } else if (isCancelled) {
        statusBadgeColor = "bg-red-100 text-red-900 border-red-300";
        statusBadgeText = "Order Cancelled";
        statusSubtext = "This order has been cancelled. Please contact us on WhatsApp if you have questions.";
        progressPercent = 0;
    }

    // Calculate Step States: 'done', 'active', 'pending'
    const stepOrder = ["Pending", "Confirmed", "Shipped", "Delivered"];
    const currentStepIdx = stepOrder.indexOf(status);

    function getStepClass(stepIndex) {
        if (isCancelled) return "track-step-pending opacity-40";
        if (status === "Delivered") return "track-step-done";
        if (stepIndex < currentStepIdx) return "track-step-done";
        if (stepIndex === currentStepIdx) return "track-step-active";
        return "track-step-pending";
    }

    function getStepIcon(stepIndex) {
        if (!isCancelled && (stepIndex < currentStepIdx || (status === "Delivered" && stepIndex === 3))) {
            return `<i class="fa-solid fa-check text-xs"></i>`;
        }
        if (stepIndex === 0) return `<i class="fa-solid fa-receipt text-xs"></i>`;
        if (stepIndex === 1) return `<i class="fa-solid fa-circle-check text-xs"></i>`;
        if (stepIndex === 2) return `<i class="fa-solid fa-truck-fast text-xs"></i>`;
        if (stepIndex === 3) return `<i class="fa-solid fa-house-chimney-check text-xs"></i>`;
        return `<i class="fa-solid fa-circle text-[8px]"></i>`;
    }

    // Stepper HTML
    const stepperHTML = isCancelled ? `
        <div class="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
            <span class="text-red-500 text-2xl mt-0.5"><i class="fa-solid fa-ban"></i></span>
            <div class="space-y-1">
                <h4 class="font-bold text-sm text-red-900">Order Was Cancelled</h4>
                <p class="text-xs text-red-700 leading-relaxed">
                    This order record was marked as cancelled by store management. If this was unexpected, please reach out to us directly on WhatsApp with Order ID <strong class="font-mono">${order.id}</strong>.
                </p>
                <div class="pt-2">
                    <a href="https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Hello Amrutha Ghee, my order ' + order.id + ' is showing as cancelled. Could you please help?')}" target="_blank" class="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg shadow-xs">
                        <i class="fa-brands fa-whatsapp"></i> Chat with Support
                    </a>
                </div>
            </div>
        </div>
    ` : `
        <div class="relative py-2">
            <!-- Connecting Progress Line Background -->
            <div class="absolute top-5 left-6 right-6 h-1 bg-gray-200 -z-0 rounded-full"></div>
            <!-- Connecting Progress Line Active -->
            <div class="absolute top-5 left-6 h-1 bg-gradient-to-r from-amber-500 to-green-500 -z-0 rounded-full transition-all duration-700" style="width: calc(${progressPercent}% - 30px); max-width: calc(100% - 48px);"></div>

            <!-- Stepper Items -->
            <div class="grid grid-cols-4 gap-1 relative z-10 text-center">
                
                <!-- Step 1: Placed -->
                <div class="flex flex-col items-center space-y-1.5 ${getStepClass(0)}">
                    <div class="step-icon-box w-9 h-9 rounded-full flex items-center justify-center border-2 bg-white transition-all">
                        ${getStepIcon(0)}
                    </div>
                    <div>
                        <span class="block text-[11px] font-extrabold text-gray-800 leading-tight">Order Placed</span>
                        <span class="block text-[10px] text-gray-500 mt-0.5">${formatTime(order.timestamp) || 'Received'}</span>
                    </div>
                </div>

                <!-- Step 2: Confirmed -->
                <div class="flex flex-col items-center space-y-1.5 ${getStepClass(1)}">
                    <div class="step-icon-box w-9 h-9 rounded-full flex items-center justify-center border-2 bg-white transition-all">
                        ${getStepIcon(1)}
                    </div>
                    <div>
                        <span class="block text-[11px] font-extrabold text-gray-800 leading-tight">Confirmed</span>
                        <span class="block text-[10px] text-gray-500 mt-0.5">${timestamps.Confirmed ? formatTime(timestamps.Confirmed) : (currentStepIdx > 1 ? 'Done' : 'Verified')}</span>
                    </div>
                </div>

                <!-- Step 3: Shipped -->
                <div class="flex flex-col items-center space-y-1.5 ${getStepClass(2)}">
                    <div class="step-icon-box w-9 h-9 rounded-full flex items-center justify-center border-2 bg-white transition-all">
                        ${getStepIcon(2)}
                    </div>
                    <div>
                        <span class="block text-[11px] font-extrabold text-gray-800 leading-tight">Shipped</span>
                        <span class="block text-[10px] text-gray-500 mt-0.5">${timestamps.Shipped ? formatTime(timestamps.Shipped) : (currentStepIdx > 2 ? 'Dispatched' : '1-2 hrs')}</span>
                    </div>
                </div>

                <!-- Step 4: Delivered -->
                <div class="flex flex-col items-center space-y-1.5 ${getStepClass(3)}">
                    <div class="step-icon-box w-9 h-9 rounded-full flex items-center justify-center border-2 bg-white transition-all">
                        ${getStepIcon(3)}
                    </div>
                    <div>
                        <span class="block text-[11px] font-extrabold text-gray-800 leading-tight">Delivered</span>
                        <span class="block text-[10px] text-gray-500 mt-0.5">${timestamps.Delivered ? formatTime(timestamps.Delivered) : 'Doorstep'}</span>
                    </div>
                </div>

            </div>
        </div>
    `;

    // Itemized table HTML
    let itemsHTML = '';
    order.items.forEach(it => {
        itemsHTML += `
            <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-xs">
                <div class="space-y-0.5">
                    <div class="font-bold text-gray-800">${it.name}</div>
                    <div class="text-[11px] text-gray-500">Size: <span class="font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">${it.size}</span> × Qty: <strong>${it.quantity}</strong></div>
                </div>
                <div class="font-bold text-gray-900 text-sm">
                    ₹${it.price * it.quantity}
                </div>
            </div>
        `;
    });

    // Landmark display
    const landmarkHTML = order.customer.landmark ? `
        <div class="text-xs text-gray-500 mt-0.5"><strong class="text-gray-700">Landmark:</strong> ${order.customer.landmark}</div>
    ` : '';

    const whatsappSupportUrl = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(`Hello Amrutha Ghee Store, I am inquiring about my order ${order.id} (Status: ${order.status}).`)}`;

    resultContainer.innerHTML = `
        <!-- Top Status Card -->
        <div class="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID:</span>
                    <span class="font-mono font-black text-sm sm:text-base text-amber-950 bg-amber-100/90 px-2.5 py-0.5 rounded-lg border border-amber-300 flex items-center gap-1.5">
                        ${order.id}
                        <button onclick="copyOrderId('${order.id}')" class="text-amber-800 hover:text-amber-950 text-xs cursor-pointer p-0.5" title="Copy Order ID">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                    </span>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="refreshCurrentTrackedOrder()" class="text-xs text-gray-500 hover:text-amber-700 font-semibold flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs transition-colors cursor-pointer" title="Refresh Live Status">
                        <i class="fa-solid fa-rotate text-[11px] text-amber-600"></i>
                        <span>Refresh</span>
                    </button>
                    <button onclick="resetTrackOrderModal()" class="text-xs text-amber-900 hover:text-amber-950 font-semibold flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs transition-colors cursor-pointer" title="Search Another Order">
                        <i class="fa-solid fa-magnifying-glass text-[11px] text-amber-700"></i>
                        <span>Track Another</span>
                    </button>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-1">
                <span class="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full border shadow-2xs ${statusBadgeColor}">
                    <span class="w-2 h-2 rounded-full ${isCancelled ? 'bg-red-500' : 'bg-green-500 animate-ping'}"></span>
                    ${statusBadgeText}
                </span>
                <span class="text-xs text-gray-500 flex items-center gap-1">
                    <i class="fa-regular fa-clock text-gray-400 text-xs"></i> Placed: ${orderDate}
                </span>
            </div>

            <p class="text-xs text-amber-900/80 font-medium leading-relaxed bg-white/70 p-2.5 rounded-xl border border-amber-200/50">
                <i class="fa-solid fa-circle-info text-amber-600 mr-1"></i> ${statusSubtext}
            </p>
        </div>

        <!-- Stepper Component -->
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <i class="fa-solid fa-timeline text-amber-500"></i> Delivery Timeline
            </h4>
            ${stepperHTML}
        </div>

        <!-- Order Items & Bill Details -->
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2">
                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <i class="fa-solid fa-basket-shopping text-amber-500"></i> Ordered Items (${order.items.length})
                </h4>
                ${(order.paymentStatus === 'Paid' || (order.checkoutMethod && order.checkoutMethod.includes('Online UPI')))
                    ? `<span class="text-[11px] font-bold text-green-800 bg-green-50 px-2 py-0.5 rounded border border-green-200 uppercase flex items-center gap-1"><i class="fa-solid fa-circle-check text-green-600 text-[10px]"></i> ${order.checkoutMethod || 'Online UPI'} (Paid)</span>`
                    : `<span class="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase">${order.checkoutMethod || 'COD'}</span>`
                }
            </div>

            <div class="divide-y divide-gray-50">
                ${itemsHTML}
            </div>

            <div class="pt-2 border-t border-gray-100 flex justify-between items-center text-sm font-bold">
                <span class="text-gray-700">Total Amount:</span>
                <span class="text-lg font-black text-amber-950">₹${order.subtotal}</span>
            </div>
        </div>

        <!-- Customer & Delivery Address Card -->
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <i class="fa-solid fa-location-dot text-amber-500"></i> Delivery Address
            </h4>
            <div class="text-xs text-gray-700 space-y-1 leading-relaxed">
                <div class="font-bold text-gray-900 text-sm">${order.customer.name}</div>
                <div class="text-amber-700 font-semibold flex items-center gap-1.5">
                    <i class="fa-solid fa-phone text-[10px]"></i> ${order.customer.phone}
                </div>
                <div class="text-gray-600">${order.customer.address}</div>
                ${landmarkHTML}
            </div>
        </div>

        <!-- Help Action Buttons -->
        <div class="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button onclick="resetTrackOrderModal()" class="flex-1 py-3 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer text-center">
                <i class="fa-solid fa-magnifying-glass text-xs"></i>
                <span>Track Another Order</span>
            </button>
            <a href="${whatsappSupportUrl}" target="_blank" class="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 text-center">
                <i class="fa-brands fa-whatsapp text-base"></i>
                <span>Ask Store on WhatsApp</span>
            </a>
            <button onclick="closeTrackOrderModal()" class="py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center">
                Close
            </button>
        </div>
    `;
}

// Copy Order ID utility
window.copyOrderId = function(orderId) {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId).then(() => {
        alert(`Order ID copied: ${orderId}`);
    }).catch(() => {
        prompt("Copy your Order ID:", orderId);
    });
};

