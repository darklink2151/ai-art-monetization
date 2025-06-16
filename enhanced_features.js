// Enhanced Commerce Dashboard Features for Rapid Monetization
// This file contains new features to be integrated into the existing platform

// 1. Related Products/Upselling System
class UpsellManager {
    constructor() {
        this.productRelations = new Map();
        this.init();
    }

    init() {
        // Define product relationships for upselling/cross-selling
        // In a real implementation, this would come from a database
        this.setupProductRelations();
    }

    setupProductRelations() {
        // Example relationships - in production, this would be data-driven
        this.productRelations.set('software-basic', {
            upgrades: ['software-pro', 'software-enterprise'],
            related: ['plugin-pack', 'support-package'],
            bundles: ['complete-suite']
        });
        
        this.productRelations.set('ebook-beginner', {
            upgrades: ['ebook-advanced', 'video-course'],
            related: ['workbook', 'templates'],
            bundles: ['learning-bundle']
        });
    }

    getRelatedProducts(productId, products) {
        const relations = this.productRelations.get(productId);
        if (!relations) return { upgrades: [], related: [], bundles: [] };

        return {
            upgrades: products.filter(p => relations.upgrades.includes(p.id)),
            related: products.filter(p => relations.related.includes(p.id)),
            bundles: products.filter(p => relations.bundles.includes(p.id))
        };
    }

    renderUpsellSection(productId, products) {
        const related = this.getRelatedProducts(productId, products);
        
        if (related.upgrades.length === 0 && related.related.length === 0 && related.bundles.length === 0) {
            return '';
        }

        return `
            <div class="upsell-section">
                <h3>🚀 Enhance Your Purchase</h3>
                
                ${related.upgrades.length > 0 ? `
                    <div class="upgrade-options">
                        <h4>⬆️ Upgrade Options</h4>
                        <div class="upgrade-grid">
                            ${related.upgrades.map(product => this.renderUpsellCard(product, 'upgrade')).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${related.related.length > 0 ? `
                    <div class="related-options">
                        <h4>🔗 Customers Also Bought</h4>
                        <div class="related-grid">
                            ${related.related.map(product => this.renderUpsellCard(product, 'related')).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${related.bundles.length > 0 ? `
                    <div class="bundle-options">
                        <h4>💰 Save with Bundles</h4>
                        <div class="bundle-grid">
                            ${related.bundles.map(product => this.renderUpsellCard(product, 'bundle')).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderUpsellCard(product, type) {
        const typeLabels = {
            upgrade: '⬆️ Upgrade',
            related: '🔗 Add-on',
            bundle: '💰 Bundle'
        };

        const savings = type === 'bundle' ? this.calculateBundleSavings(product) : 0;

        return `
            <div class="upsell-card ${type}-card">
                <div class="upsell-badge">${typeLabels[type]}</div>
                <img src="${product.image}" alt="${product.name}" class="upsell-image">
                <div class="upsell-info">
                    <h5>${product.name}</h5>
                    <p class="upsell-description">${product.description.substring(0, 80)}...</p>
                    <div class="upsell-price">
                        $${product.price.toFixed(2)}
                        ${savings > 0 ? `<span class="savings">Save $${savings.toFixed(2)}</span>` : ''}
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="store.addToCart('${product.id}')">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
    }

    calculateBundleSavings(bundleProduct) {
        // Calculate savings for bundle products
        // This would be based on individual product prices vs bundle price
        return bundleProduct.originalPrice ? bundleProduct.originalPrice - bundleProduct.price : 0;
    }
}

// 2. Discount Code System
class DiscountManager {
    constructor() {
        this.activeCodes = new Map();
        this.init();
    }

    init() {
        this.setupDiscountCodes();
    }

    setupDiscountCodes() {
        // Example discount codes - in production, this would be managed via admin interface
        this.activeCodes.set('WELCOME10', {
            type: 'percentage',
            value: 10,
            minAmount: 0,
            maxUses: 100,
            currentUses: 0,
            expiryDate: new Date('2025-12-31'),
            description: '10% off for new customers'
        });

        this.activeCodes.set('SAVE20', {
            type: 'percentage',
            value: 20,
            minAmount: 50,
            maxUses: 50,
            currentUses: 0,
            expiryDate: new Date('2025-12-31'),
            description: '20% off orders over $50'
        });

        this.activeCodes.set('FLAT15', {
            type: 'fixed',
            value: 15,
            minAmount: 30,
            maxUses: 200,
            currentUses: 0,
            expiryDate: new Date('2025-12-31'),
            description: '$15 off orders over $30'
        });
    }

    validateCode(code, orderAmount) {
        const discount = this.activeCodes.get(code.toUpperCase());
        
        if (!discount) {
            return { valid: false, error: 'Invalid discount code' };
        }

        if (discount.currentUses >= discount.maxUses) {
            return { valid: false, error: 'Discount code has expired' };
        }

        if (new Date() > discount.expiryDate) {
            return { valid: false, error: 'Discount code has expired' };
        }

        if (orderAmount < discount.minAmount) {
            return { 
                valid: false, 
                error: `Minimum order amount of $${discount.minAmount.toFixed(2)} required` 
            };
        }

        return { valid: true, discount };
    }

    calculateDiscount(code, orderAmount) {
        const validation = this.validateCode(code, orderAmount);
        
        if (!validation.valid) {
            return { amount: 0, error: validation.error };
        }

        const discount = validation.discount;
        let discountAmount = 0;

        if (discount.type === 'percentage') {
            discountAmount = (orderAmount * discount.value) / 100;
        } else if (discount.type === 'fixed') {
            discountAmount = Math.min(discount.value, orderAmount);
        }

        return {
            amount: discountAmount,
            finalAmount: orderAmount - discountAmount,
            description: discount.description
        };
    }

    applyDiscount(code) {
        const discount = this.activeCodes.get(code.toUpperCase());
        if (discount) {
            discount.currentUses++;
        }
    }

    renderDiscountInput() {
        return `
            <div class="discount-section">
                <div class="discount-input-group">
                    <input type="text" 
                           id="discount-code" 
                           placeholder="Enter discount code" 
                           class="discount-input">
                    <button type="button" 
                            id="apply-discount" 
                            class="btn btn-secondary">
                        Apply
                    </button>
                </div>
                <div id="discount-message" class="discount-message"></div>
                <div id="discount-applied" class="discount-applied" style="display: none;">
                    <span class="discount-info"></span>
                    <button type="button" id="remove-discount" class="remove-discount">×</button>
                </div>
            </div>
        `;
    }
}

// 3. Enhanced Shopping Cart
class ShoppingCart {
    constructor() {
        this.items = [];
        this.appliedDiscount = null;
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
    }

    addItem(productId, products) {
        const product = products.find(p => p.id === productId);
        if (!product) return false;

        const existingItem = this.items.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                id: productId,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1,
                type: product.type
            });
        }

        this.saveToStorage();
        this.updateCartDisplay();
        return true;
    }

    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveToStorage();
        this.updateCartDisplay();
    }

    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(productId);
            } else {
                item.quantity = quantity;
                this.saveToStorage();
                this.updateCartDisplay();
            }
        }
    }

    getSubtotal() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    getTotal() {
        const subtotal = this.getSubtotal();
        if (this.appliedDiscount) {
            return subtotal - this.appliedDiscount.amount;
        }
        return subtotal;
    }

    applyDiscount(discountCode, discountManager) {
        const subtotal = this.getSubtotal();
        const result = discountManager.calculateDiscount(discountCode, subtotal);
        
        if (result.error) {
            return { success: false, error: result.error };
        }

        this.appliedDiscount = {
            code: discountCode,
            amount: result.amount,
            description: result.description
        };

        this.saveToStorage();
        this.updateCartDisplay();
        return { success: true, discount: this.appliedDiscount };
    }

    removeDiscount() {
        this.appliedDiscount = null;
        this.saveToStorage();
        this.updateCartDisplay();
    }

    saveToStorage() {
        localStorage.setItem('cart', JSON.stringify({
            items: this.items,
            appliedDiscount: this.appliedDiscount
        }));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('cart');
        if (saved) {
            const data = JSON.parse(saved);
            this.items = data.items || [];
            this.appliedDiscount = data.appliedDiscount || null;
        }
    }

    updateCartDisplay() {
        const cartCount = document.getElementById('cart-count');
        const cartModal = document.getElementById('cart-modal');
        
        if (cartCount) {
            const totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'block' : 'none';
        }

        if (cartModal) {
            this.renderCartModal();
        }
    }

    renderCartModal() {
        const subtotal = this.getSubtotal();
        const total = this.getTotal();

        return `
            <div class="cart-items">
                ${this.items.length === 0 ? 
                    '<p class="empty-cart">Your cart is empty</p>' :
                    this.items.map(item => this.renderCartItem(item)).join('')
                }
            </div>
            
            ${this.items.length > 0 ? `
                <div class="cart-summary">
                    <div class="cart-subtotal">
                        <span>Subtotal:</span>
                        <span>$${subtotal.toFixed(2)}</span>
                    </div>
                    
                    ${this.appliedDiscount ? `
                        <div class="cart-discount">
                            <span>Discount (${this.appliedDiscount.code}):</span>
                            <span>-$${this.appliedDiscount.amount.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    
                    <div class="cart-total">
                        <span><strong>Total:</strong></span>
                        <span><strong>$${total.toFixed(2)}</strong></span>
                    </div>
                    
                    <div class="cart-actions">
                        <button class="btn btn-primary btn-large" onclick="cart.checkout()">
                            Proceed to Checkout
                        </button>
                    </div>
                </div>
            ` : ''}
        `;
    }

    renderCartItem(item) {
        return `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p class="cart-item-price">$${item.price.toFixed(2)}</p>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button onclick="cart.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="cart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                    </div>
                    <button class="remove-item" onclick="cart.removeItem('${item.id}')">Remove</button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Event listeners for discount code application
        document.addEventListener('click', (e) => {
            if (e.target.id === 'apply-discount') {
                this.handleDiscountApplication();
            }
            if (e.target.id === 'remove-discount') {
                this.removeDiscount();
            }
        });
    }

    handleDiscountApplication() {
        const codeInput = document.getElementById('discount-code');
        const messageDiv = document.getElementById('discount-message');
        
        if (!codeInput || !messageDiv) return;

        const code = codeInput.value.trim();
        if (!code) {
            messageDiv.textContent = 'Please enter a discount code';
            messageDiv.className = 'discount-message error';
            return;
        }

        const result = this.applyDiscount(code, window.discountManager);
        
        if (result.success) {
            messageDiv.textContent = `Discount applied: ${result.discount.description}`;
            messageDiv.className = 'discount-message success';
            codeInput.value = '';
            
            // Show applied discount section
            const appliedSection = document.getElementById('discount-applied');
            const discountInfo = appliedSection.querySelector('.discount-info');
            discountInfo.textContent = `${result.discount.code}: -$${result.discount.amount.toFixed(2)}`;
            appliedSection.style.display = 'block';
        } else {
            messageDiv.textContent = result.error;
            messageDiv.className = 'discount-message error';
        }
    }

    async checkout() {
        if (this.items.length === 0) return;

        try {
            // Create checkout session with cart items
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: this.items,
                    discountCode: this.appliedDiscount?.code,
                    total: this.getTotal()
                })
            });

            const { url } = await response.json();
            window.location.href = url;
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Checkout failed. Please try again.');
        }
    }
}

// Initialize enhanced features
window.upsellManager = new UpsellManager();
window.discountManager = new DiscountManager();
window.cart = new ShoppingCart();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UpsellManager,
        DiscountManager,
        ShoppingCart
    };
}

