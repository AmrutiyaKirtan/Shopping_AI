// Global variables
let socket;
let isRecording = false;
let recognition;
let currentUser = null;
let cart = [];

// --- Product Grid and Shopping Logic ---
let products = [];

function renderProductGrid() {
    fetch('/api/products')
        .then(res => res.json())
        .then(data => {
            products = data;
            const grid = document.getElementById('productGrid');
            grid.innerHTML = '';
            data.forEach(product => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <div class="product-name">${product.name}</div>
                    <div class="product-category">${product.category}</div>
                    <div class="product-price">$${product.price.toFixed(2)}</div>
                    <button class="btn-glass add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
                `;
                grid.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error fetching products:', error);
        });
}


function openProductModal(product) {
    const modal = document.getElementById('productModal');
    const content = document.getElementById('productModalContent');
    content.innerHTML = `
        <div class="product-icon"><i class="fas fa-cube"></i></div>
        <div class="product-name">${product.name}</div>
        <div class="product-price">$${product.price.toFixed(2)}</div>
        <div class="product-category">${product.category}</div>
        <button class="add-to-cart-btn">Add to Cart</button>
    `;
    content.querySelector('.add-to-cart-btn').onclick = function() {
        addToCart(product.id);
        closeModal(modal);
        showNotification('Added to cart!', 'success');
        updateCartDisplay();
    };
    modal.style.display = 'flex';
}

function closeModal(modal) {
    modal.style.display = 'none';
}

// --- Cart Logic ---
function updateCartDisplay() {
    if (!currentUser) return;
    fetch('/api/cart', {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
    .then(res => res.json())
    .then(data => {
        renderCartModal(data.items, data.total);
        updateCartBadge(data.items);
    });
}

function renderCartModal(items, total) {
    const list = document.getElementById('cartItemsList');
    const totalElem = document.getElementById('cartTotalAmount');
    list.innerHTML = '';
    if (!items || items.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:#b2fefa;">Your cart is empty</div>';
    } else {
        items.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'cart-item-row';
            row.innerHTML = `
                <span class="cart-item-name">${item.product.name}</span>
                <span class="cart-item-qty">x${item.quantity}</span>
                <span>$${item.total.toFixed(2)}</span>
                <button class="cart-item-remove" title="Remove">&times;</button>
            `;
            row.querySelector('.cart-item-remove').onclick = () => removeFromCart(item.product.id);
            list.appendChild(row);
        });
    }
    totalElem.textContent = `$${(total || 0).toFixed(2)}`;
}

function updateCartBadge(items) {
    const badge = document.getElementById('cartCountBadge');
    let count = 0;
    if (items && items.length) {
        count = items.reduce((sum, item) => sum + item.quantity, 0);
    }
    badge.textContent = count;
}

function removeFromCart(productId) {
    if (!currentUser) return;
    // Remove by setting quantity to 0
    fetch('/api/user/data', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    })
    .then(res => res.json())
    .then(userData => {
        let cart = userData.cart || [];
        cart = cart.filter(item => item.product_id !== productId);
        fetch('/api/user/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ cart })
        }).then(() => {
            updateCartDisplay();
            showNotification('Item removed from cart', 'success');
        });
    });
}

// --- Modal and Button Logic ---
function setupShoppingModals() {
    // Product modal close
    document.querySelectorAll('#productModal .close').forEach(btn => {
        btn.onclick = () => closeModal(document.getElementById('productModal'));
    });
    // Cart modal close
    document.querySelectorAll('#cartModal .close').forEach(btn => {
        btn.onclick = () => closeModal(document.getElementById('cartModal'));
    });
    // History modal close
    document.querySelectorAll('#historyModal .close').forEach(btn => {
        btn.onclick = () => closeModal(document.getElementById('historyModal'));
    });
    // Floating cart button
    document.getElementById('floatingCartBtn').onclick = function() {
        document.getElementById('cartModal').style.display = 'flex';
        updateCartDisplay();
    };
    // Cart quick action
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.onclick = function() {
            document.getElementById('cartModal').style.display = 'flex';
            updateCartDisplay();
        };
    }
    // History quick action
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.onclick = function() {
            document.getElementById('historyModal').style.display = 'flex';
            loadPurchaseHistory();
        };
    }
    // Checkout button
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.onclick = function() {
            initiateCheckout();
        };
    }
    // VR Tour quick action
    const vrTourBtn = document.getElementById('vrTourBtn');
    if (vrTourBtn) {
        vrTourBtn.onclick = function() {
            window.location.href = '/vr';
        };
    }
}

// --- Purchase History Logic ---
function loadPurchaseHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '<div style="color:#b2fefa;text-align:center;">Loading...</div>';
    fetch('/api/orders', {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
    .then(res => res.json())
    .then(data => {
        if (!data.orders || data.orders.length === 0) {
            historyList.innerHTML = '<div class="history-empty">No purchase history yet.</div>';
            return;
        }
        historyList.innerHTML = '';
        data.orders.forEach(order => {
            const orderDiv = document.createElement('div');
            orderDiv.className = 'history-item';
            orderDiv.innerHTML = `
                <div class="history-item-header">
                    <span class="history-order-id">Order #${order.id}</span>
                    <span class="history-total">$${order.total.toFixed(2)}</span>
                </div>
                <div class="history-items">
                    ${order.items.map(item => `
                        <div class="history-item-row">
                            <span class="history-item-name">${item.product.name}</span>
                            <span class="history-item-qty">x${item.quantity}</span>
                            <span class="history-item-price">$${item.total.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            historyList.appendChild(orderDiv);
        });
    })
    .catch(err => {
        historyList.innerHTML = '<div class="history-empty">Failed to load history.</div>';
    });
}

// --- Voice Shopping Logic ---
let isListening = false;

function setupVoiceShopping() {
    const voiceModal = document.getElementById('voiceModal');
    const voiceBtn = document.getElementById('voiceShopBtn');
    const micBtn = document.getElementById('startVoiceBtn');
    const statusElem = document.getElementById('voiceStatus');
    const resultElem = document.getElementById('voiceResult');
    // Open modal
    if (voiceBtn) {
        voiceBtn.onclick = () => {
            voiceModal.style.display = 'flex';
            statusElem.textContent = 'Click the mic and speak a command';
            resultElem.textContent = '';
        };
    }
    // Close modal
    voiceModal.querySelector('.close').onclick = () => closeModal(voiceModal);
    // Voice recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.onstart = function() {
            isListening = true;
            micBtn.classList.add('listening');
            statusElem.textContent = 'Listening...';
        };
        recognition.onresult = function(event) {
            isListening = false;
            micBtn.classList.remove('listening');
            const transcript = event.results[0][0].transcript;
            resultElem.textContent = transcript;
            statusElem.textContent = 'Processing...';
            handleVoiceCommand(transcript, statusElem, resultElem);
        };
        recognition.onerror = function(event) {
            isListening = false;
            micBtn.classList.remove('listening');
            statusElem.textContent = 'Error: ' + event.error;
        };
        recognition.onend = function() {
            isListening = false;
            micBtn.classList.remove('listening');
            if (!resultElem.textContent) statusElem.textContent = 'Click the mic and speak a command';
        };
        micBtn.onclick = function() {
            if (!isListening) recognition.start();
        };
    } else {
        micBtn.disabled = true;
        statusElem.textContent = 'Voice recognition not supported in this browser.';
    }
}

// --- Login Modal Setup ---
function setupLoginModal() {
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeBtn = loginModal.querySelector('.close');
    const loginForm = document.getElementById('loginForm');
    const signUpForm = document.getElementById('signUpForm');
    const showSignUp = document.getElementById('showSignUp');
    const showLogin = document.getElementById('showLogin');

    // Login button click
    if (loginBtn) {
        loginBtn.onclick = function() {
            loginModal.style.display = 'flex';
        };
    }

    // Close button click
    if (closeBtn) {
        closeBtn.onclick = function() {
            loginModal.style.display = 'none';
        };
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === loginModal) {
            loginModal.style.display = 'none';
        }
    };

    // Toggle between login and signup forms
    if (showSignUp) {
        showSignUp.onclick = function(e) {
            e.preventDefault();
            loginForm.style.display = 'none';
            signUpForm.style.display = 'flex';
        };
    }

    if (showLogin) {
        showLogin.onclick = function(e) {
            e.preventDefault();
            signUpForm.style.display = 'none';
            loginForm.style.display = 'flex';
        };
    }

    // Form submissions
    if (loginForm) {
        loginForm.onsubmit = function(e) {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;
            handleLogin({ preventDefault: () => {}, target: loginForm });
        };
    }

    if (signUpForm) {
        signUpForm.onsubmit = function(e) {
            e.preventDefault();
            const email = signUpForm.querySelector('input[type="email"]').value;
            const password = signUpForm.querySelector('input[type="password"]').value;
            handleSignUp({ preventDefault: () => {}, target: signUpForm });
        };
    }
}

function handleVoiceCommand(command, statusElem, resultElem) {
    if (!command) return;
    const cmd = command.toLowerCase();
    // Add to cart: "add [product] to cart"
    if (cmd.startsWith('add ')) {
        const match = cmd.match(/add (.+) to cart/);
        if (match && match[1]) {
            const productName = match[1].trim();
            const product = products.find(p => p.name.toLowerCase().includes(productName));
            if (product) {
                addToCart(product.id);
                statusElem.textContent = `Added ${product.name} to cart!`;
                updateCartDisplay();
            } else {
                statusElem.textContent = `Product not found: ${productName}`;
            }
            return;
        }
    }
    // Show cart
    if (cmd.includes('show cart')) {
        document.getElementById('cartModal').style.display = 'flex';
        updateCartDisplay();
        statusElem.textContent = 'Showing your cart.';
        return;
    }
    // Checkout
    if (cmd.includes('checkout')) {
        document.getElementById('cartModal').style.display = 'flex';
        statusElem.textContent = 'Ready to checkout!';
        return;
    }
    // Remove from cart: "remove [product] from cart"
    if (cmd.startsWith('remove ')) {
        const match = cmd.match(/remove (.+) from cart/);
        if (match && match[1]) {
            const productName = match[1].trim();
            const product = products.find(p => p.name.toLowerCase().includes(productName));
            if (product) {
                removeFromCart(product.id);
                statusElem.textContent = `Removed ${product.name} from cart.`;
                updateCartDisplay();
            } else {
                statusElem.textContent = `Product not found: ${productName}`;
            }
            return;
        }
    }
    statusElem.textContent = 'Sorry, command not recognized.';
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    renderProductGrid();
    setupShoppingModals();
    setupVoiceShopping();
    setupLoginModal(); // Add this line
    updateCartDisplay();
});

function initializeApp() {
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Initialize voice recognition
    initializeVoiceRecognition();
    
    // Load products
    loadProducts();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check if user is logged in
    checkAuthStatus();
}

// WebSocket initialization
function initializeWebSocket() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('Connected to server');
    });
    
    socket.on('voice_response', function(data) {
        console.log('Voice response:', data);
        updateVoiceStatus(data.message);
    });
    
    socket.on('cart_updated', function(data) {
        console.log('Cart updated:', data);
        updateCartDisplay();
    });
}

// Voice recognition setup
function initializeVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = function() {
            isRecording = true;
            document.getElementById('voiceBtn').classList.add('recording');
            updateVoiceStatus('Listening...');
        };
        
        recognition.onresult = function(event) {
            const command = event.results[0][0].transcript;
            processVoiceCommand(command);
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            updateVoiceStatus('Error: ' + event.error);
            isRecording = false;
            document.getElementById('voiceBtn').classList.remove('recording');
        };
        
        recognition.onend = function() {
            isRecording = false;
            document.getElementById('voiceBtn').classList.remove('recording');
            updateVoiceStatus('Try saying: "Add milk to cart" or "Search for bread"');
        };
    } else {
        console.log('Speech recognition not supported');
        document.getElementById('voiceBtn').style.display = 'none';
    }
}

// Event listeners setup
function setupEventListeners() {
    // Voice button
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
        voiceBtn.addEventListener('mousedown', startRecording);
        voiceBtn.addEventListener('mouseup', stopRecording);
        voiceBtn.addEventListener('mouseleave', stopRecording);
        voiceBtn.addEventListener('touchstart', startRecording);
        voiceBtn.addEventListener('touchend', stopRecording);
    }
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }
    
    // Category filters
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            categoryBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadProducts(this.dataset.category);
        });
    });
    
    // Auth tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Smart cart
    const scanBtn = document.getElementById('scanBtn');
    const barcodeInput = document.getElementById('barcodeInput');
    
    if (scanBtn) {
        scanBtn.addEventListener('click', handleScan);
    }
    
    if (barcodeInput) {
        barcodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleScan();
            }
        });
    }
    
    // AI Assistant
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    // VR controls
    const vrBtns = document.querySelectorAll('.vr-btn');
    vrBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const aisle = this.dataset.aisle;
            navigateToAisle(aisle);
        });
    });
    
    // Floating action button
    const fab = document.getElementById('fab');
    if (fab) {
        fab.addEventListener('click', toggleQuickActions);
    }
}

// Voice recording functions
function startRecording() {
    if (recognition && !isRecording) {
        recognition.start();
    }
}

function stopRecording() {
    if (recognition && isRecording) {
        recognition.stop();
    }
}

function processVoiceCommand(command) {
    console.log('Processing voice command:', command);
    updateVoiceStatus('Processing: ' + command);
    
    // Send to server for processing
    if (currentUser) {
        fetch('/api/voice/command', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ command: command })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Voice command response:', data);
            updateVoiceStatus('Action: ' + data.action);
            
            // Handle specific commands
            if (command.toLowerCase().includes('add') && command.toLowerCase().includes('cart')) {
                handleVoiceAddToCart(command);
            } else if (command.toLowerCase().includes('search')) {
                handleVoiceSearch(command);
            } else if (command.toLowerCase().includes('checkout')) {
                handleVoiceCheckout();
            }
        })
        .catch(error => {
            console.error('Error processing voice command:', error);
            updateVoiceStatus('Error processing command');
        });
    } else {
        updateVoiceStatus('Please login to use voice commands');
    }
}

function handleVoiceAddToCart(command) {
    // Extract product name from command
    const productName = extractProductName(command);
    if (productName) {
        addProductToCartByName(productName);
    }
}

function handleVoiceSearch(command) {
    const searchTerm = extractSearchTerm(command);
    if (searchTerm) {
        document.getElementById('searchInput').value = searchTerm;
        handleSearch();
    }
}

function handleVoiceCheckout() {
    if (cart.length > 0) {
        initiateCheckout();
    } else {
        updateVoiceStatus('Your cart is empty');
    }
}

function extractProductName(command) {
    // Simple extraction - in a real app, use NLP
    const words = command.toLowerCase().split(' ');
    const addIndex = words.indexOf('add');
    const toIndex = words.indexOf('to');
    
    if (addIndex !== -1 && toIndex !== -1) {
        return words.slice(addIndex + 1, toIndex).join(' ');
    }
    return null;
}

function extractSearchTerm(command) {
    const words = command.toLowerCase().split(' ');
    const searchIndex = words.indexOf('search');
    const forIndex = words.indexOf('for');
    
    if (searchIndex !== -1 && forIndex !== -1) {
        return words.slice(forIndex + 1).join(' ');
    }
    return null;
}

function updateVoiceStatus(message) {
    const statusElement = document.getElementById('voiceStatus');
    if (statusElement) {
        statusElement.querySelector('p').textContent = message;
    }
}

// Product loading and search
function loadProducts(category = 'all') {
    let url = '/api/products';
    if (category && category !== 'all') {
        url += `?category=${category}`;
    }
    
    fetch(url)
        .then(response => response.json())
        .then(products => {
            displayProducts(products);
        })
        .catch(error => {
            console.error('Error loading products:', error);
        });
}

function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value;
    if (searchTerm.trim()) {
        fetch(`/api/products?search=${encodeURIComponent(searchTerm)}`)
            .then(response => response.json())
            .then(products => {
                displayProducts(products);
            })
            .catch(error => {
                console.error('Error searching products:', error);
            });
    } else {
        loadProducts();
    }
}

function displayProducts(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    products.forEach(product => {
        const productCard = createProductCard(product);
        grid.appendChild(productCard);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    card.innerHTML = `
        <div class="product-image">
            <i class="fas fa-shopping-bag"></i>
        </div>
        <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <button class="add-to-cart" onclick="addToCart(${product.id})">
                Add to Cart
            </button>
        </div>
    `;
    
    return card;
}

// Cart management
function addToCart(productId, quantity = 1) {
    if (!currentUser) {
        showNotification('Please login to add items to cart', 'error');
        return;
    }
    
    fetch('/api/cart/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({
            product_id: productId,
            quantity: quantity
        })
    })
    .then(response => response.json())
    .then(data => {
        showNotification('Item added to cart!', 'success');
        updateCartDisplay();
        
        // Emit cart update via WebSocket
        socket.emit('cart_update', { action: 'add', product_id: productId });
    })
    .catch(error => {
        console.error('Error adding to cart:', error);
        showNotification('Error adding item to cart', 'error');
    });
}

function addProductToCartByName(productName) {
    // Find product by name and add to cart
    fetch('/api/products')
        .then(response => response.json())
        .then(products => {
            const product = products.find(p => 
                p.name.toLowerCase().includes(productName.toLowerCase())
            );
            if (product) {
                addToCart(product.id);
            } else {
                updateVoiceStatus(`Product "${productName}" not found`);
            }
        })
        .catch(error => {
            console.error('Error finding product:', error);
        });
}

// --- Modal and Button Logic ---
function setupShoppingModals() {
    // Product modal close
    document.querySelectorAll('#productModal .close').forEach(btn => {
        btn.onclick = () => closeModal(document.getElementById('productModal'));
    });
    // Cart modal close
    document.querySelectorAll('#cartModal .close').forEach(btn => {
        btn.onclick = () => closeModal(document.getElementById('cartModal'));
    });
    // History modal close
    document.querySelectorAll('#historyModal .close').forEach(btn => {
        btn.onclick = () => closeModal(document.getElementById('historyModal'));
    });
    // Floating cart button
    document.getElementById('floatingCartBtn').onclick = function() {
        document.getElementById('cartModal').style.display = 'flex';
        updateCartDisplay();
    };
    // Cart quick action
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.onclick = function() {
            document.getElementById('cartModal').style.display = 'flex';
            updateCartDisplay();
        };
    }
    // History quick action
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.onclick = function() {
            document.getElementById('historyModal').style.display = 'flex';
            loadPurchaseHistory();
        };
    }
    // Checkout button
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.onclick = function() {
            initiateCheckout();
        };
    }
    // VR Tour quick action
    const vrTourBtn = document.getElementById('vrTourBtn');
    if (vrTourBtn) {
        vrTourBtn.onclick = function() {
            window.location.href = '/vr';
        };
    }
}

// AI Assistant
function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat('user', message);
    input.value = '';
    
    // Get AI response
    getAIResponse(message);
}

function addMessageToChat(sender, message) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const icon = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
    const color = sender === 'user' ? '#667eea' : '#a8e6cf';
    
    messageDiv.innerHTML = `
        <i class="${icon}" style="color: ${color}"></i>
        <p>${message}</p>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getAIResponse(message) {
    // In a real implementation, this would call the AI service
    // For now, we'll simulate responses
    setTimeout(() => {
        const responses = [
            "I can help you find products and make shopping recommendations!",
            "Based on your shopping history, you might like our organic produce section.",
            "I can help you add items to your cart or search for specific products.",
            "Would you like me to show you today's deals?"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addMessageToChat('assistant', randomResponse);
    }, 1000);
}

// Load shopping insights
function loadShoppingInsights() {
    if (!currentUser) return;
    
    fetch('/api/assistant/insights', {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
    .then(response => response.json())
    .then(insights => {
        displayInsights(insights);
    })
    .catch(error => {
        console.error('Error loading insights:', error);
    });
}

function displayInsights(insights) {
    const insightsContent = document.querySelector('.insights-content');
    if (!insightsContent) return;
    
    insightsContent.innerHTML = '';
    
    if (insights.message) {
        insightsContent.innerHTML = `<p>${insights.message}</p>`;
        return;
    }
    
    if (insights.suggestions) {
        insights.suggestions.forEach(suggestion => {
            const insightItem = document.createElement('div');
            insightItem.className = 'insight-item';
            insightItem.innerHTML = `
                <strong>${suggestion.type}:</strong> ${suggestion.item}
                <br><small>${suggestion.reason}</small>
            `;
            insightsContent.appendChild(insightItem);
        });
    }
}

// VR Navigation
function navigateToAisle(aisle) {
    console.log(`Navigating to ${aisle} aisle`);
    // In a real implementation, this would load VR models and navigation
    showNotification(`Navigating to ${aisle} aisle in VR`, 'success');
}

// Authentication
function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const email = formData.get('email') || event.target.querySelector('input[type="email"]').value;
    const password = formData.get('password') || event.target.querySelector('input[type="password"]').value;
    
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.token) {
            localStorage.setItem('token', data.token);
            currentUser = { id: data.user_id };
            document.getElementById('loginModal').style.display = 'none';
            showNotification('Login successful!', 'success');
            updateAuthUI();
            loadShoppingInsights();
            updateCartDisplay();
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showNotification('Login failed', 'error');
    });
}

function handleSignUp(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const email = formData.get('email') || event.target.querySelector('input[type="email"]').value;
    const password = formData.get('password') || event.target.querySelector('input[type="password"]').value;
    fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.token) {
            localStorage.setItem('token', data.token);
            currentUser = { id: data.user_id };
            document.getElementById('loginModal').style.display = 'none';
            showNotification('Registration successful!', 'success');
            updateAuthUI();
            loadShoppingInsights && loadShoppingInsights();
            updateCartDisplay && updateCartDisplay();
        } else {
            showNotification(data.error || 'Registration failed', 'error');
        }
    })
    .catch(error => {
        console.error('Registration error:', error);
        showNotification('Registration failed', 'error');
    });
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        currentUser = { id: 'user' }; // In a real app, decode JWT to get user info
        updateAuthUI();
        loadShoppingInsights();
        updateCartDisplay();
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.textContent = 'Logout';
        loginBtn.onclick = logout;
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    cart = [];
    updateAuthUI();
    updateCartDisplay();
    
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.textContent = 'Login';
        loginBtn.onclick = () => {
            document.getElementById('loginModal').style.display = 'flex';
        };
    }
    
    showNotification('Logged out successfully', 'success');
}

function switchTab(tab) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    
    if (tab === 'login') {
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
    }
}

// Checkout
function initiateCheckout() {
    if (!currentUser) {
        showNotification('Please login to checkout', 'error');
        return;
    }
    
    // Get current cart data
    fetch('/api/cart', {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
    .then(res => res.json())
    .then(cartData => {
        if (!cartData.items || cartData.items.length === 0) {
            showNotification('Your cart is empty', 'error');
            return;
        }
        
        // Create order
        fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({})
        })
        .then(res => res.json())
        .then(data => {
            if (data.message) {
                showNotification('Order placed successfully!', 'success');
                // Close cart modal
                document.getElementById('cartModal').style.display = 'none';
                // Small delay to ensure database update is complete
                setTimeout(() => {
                    // Update cart display (should be empty now)
                    updateCartDisplay();
                    // Update cart badge
                    updateCartBadge([]);
                }, 500);
            } else {
                showNotification(data.error || 'Checkout failed', 'error');
            }
        })
        .catch(error => {
            console.error('Checkout error:', error);
            showNotification('Checkout failed', 'error');
        });
    })
    .catch(error => {
        console.error('Error getting cart:', error);
        showNotification('Error loading cart', 'error');
    });
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#56ab2f' : type === 'error' ? '#ff6b6b' : '#667eea'};
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function toggleQuickActions() {
    // Implementation for floating action button
    showNotification('Quick actions coming soon!', 'info');
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style); 

document.addEventListener('DOMContentLoaded', () => {
    renderProductGrid();
});
