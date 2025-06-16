// Store functionality
class Store {
    constructor() {
        this.products = [];
        this.categories = [];
        this.stripe = null;
        this.init();
    }

    async init() {
        await this.loadProducts();
        this.setupEventListeners();
        this.initializeStripe();
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            this.products = await response.json();
            
            // Extract unique categories
            this.categories = [...new Set(this.products.map(product => product.category || 'Uncategorized'))];
            
            this.renderProducts();
            this.renderFeaturedProducts();
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Failed to load products. Please refresh the page.');
        }
    }

    renderFeaturedProducts() {
        const featuredSlider = document.getElementById('featured-slider');
        if (!featuredSlider) return;
        
        // Get random products to feature (up to 5)
        const featuredProducts = [...this.products]
            .sort(() => 0.5 - Math.random())
            .slice(0, 5);
        
        featuredSlider.innerHTML = featuredProducts.map(product => `
            <div class="featured-item">
                <img src="${product.image}" alt="${product.name}" class="featured-image">
                <div class="featured-info">
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <div class="featured-price">$${product.price.toFixed(2)}</div>
                    <div class="featured-actions">
                        <button class="btn btn-primary" onclick="store.buyProduct('${product.id}')">
                            Buy Now
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderProducts() {
        const productsSection = document.getElementById('products');
        if (!productsSection) return;
        
        // Create container for categories
        productsSection.innerHTML = `
            <div class="container">
                <h2>Our Products</h2>
                <div class="category-tabs">
                    <button class="category-tab active" data-category="all">All</button>
                    ${this.categories.map(category => `
                        <button class="category-tab" data-category="${category}">${category}</button>
                    `).join('')}
                </div>
                <div id="products-grid" class="products-grid">
                    ${this.renderProductCards(this.products)}
                </div>
            </div>
        `;
        
        // Add event listeners to category tabs
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const category = tab.dataset.category;
                const filteredProducts = category === 'all' 
                    ? this.products 
                    : this.products.filter(p => p.category === category);
                
                const productsGrid = document.getElementById('products-grid');
                productsGrid.innerHTML = this.renderProductCards(filteredProducts);
                
                // Re-observe product cards for animation
                this.observeProductCards();
            });
        });
        
        // Observe product cards for animation
        this.observeProductCards();
    }
    
    renderProductCards(products) {
        if (products.length === 0) {
            return '<div class="no-products">No products found in this category</div>';
        }
        
        return products.map(product => `
            <div class="product-card ${product.type === 'digital' ? 'digital-product' : ''} ${product.featured ? 'featured-product' : ''}">
                <div class="product-header">
                    ${product.type === 'digital' ? '<span class="digital-badge">📱 Digital Product</span>' : ''}
                    ${product.featured ? '<span class="featured-badge">⭐ Featured</span>' : ''}
                </div>
                <img src="${product.image}" alt="${product.name}" class="product-image" onclick="store.showProductPreview('${product.id}')">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    
                    ${product.digitalMeta ? this.renderDigitalFeatures(product.digitalMeta) : ''}
                    ${product.subscriptionMeta ? this.renderSubscriptionFeatures(product.subscriptionMeta) : ''}
                    
                    <div class="product-price">
                        $${product.price.toFixed(2)}
                        ${product.type === 'subscription' ? '/month' : ''}
                        ${product.type === 'digital' ? ' <span class="instant-delivery">⚡ Instant Delivery</span>' : ''}
                    </div>
                    
                    <div class="product-actions">
                        ${product.digitalMeta?.preview ? `<button class="btn btn-secondary" onclick="store.showProductPreview('${product.id}')">👁️ Preview</button>` : ''}
                        <button class="btn btn-primary" onclick="store.buyProduct('${product.id}')">
                            ${product.type === 'subscription' ? '🔑 Subscribe' : '🛒 Buy Now'}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    renderDigitalFeatures(digitalMeta) {
        if (!digitalMeta.features || digitalMeta.features.length === 0) return '';
        
        const topFeatures = digitalMeta.features.slice(0, 3);
        return `
            <div class="digital-features">
                <h4>📋 What's Included:</h4>
                <ul>
                    ${topFeatures.map(feature => `<li>✅ ${feature}</li>`).join('')}
                    ${digitalMeta.features.length > 3 ? `<li class="more-features">+ ${digitalMeta.features.length - 3} more features</li>` : ''}
                </ul>
                ${digitalMeta.version ? `<div class="version-info">📦 Version: ${digitalMeta.version}</div>` : ''}
            </div>
        `;
    }
    
    renderSubscriptionFeatures(subscriptionMeta) {
        return `
            <div class="subscription-features">
                <div class="subscription-info">
                    ${subscriptionMeta.trialDays ? `<span class="trial-badge">🆓 ${subscriptionMeta.trialDays}-day free trial</span>` : ''}
                    <span class="billing-info">Billed ${subscriptionMeta.interval}ly</span>
                </div>
                ${subscriptionMeta.features ? `
                    <ul class="features-list">
                        ${subscriptionMeta.features.slice(0, 4).map(feature => `<li>✅ ${feature}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
    }

    observeProductCards() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe product cards
        setTimeout(() => {
            document.querySelectorAll('.product-card').forEach(card => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(card);
            });
        }, 100);
    }

    initializeStripe() {
        // Initialize Stripe (you'll need to add your publishable key)
        if (window.Stripe) {
            this.stripe = Stripe('pk_test_51OzMZVPxRyNrSgLBMVEpzXQNOeAqQXGq1Hn8Tn9fUbNYwkQJdVyYdTGDtSLzwrLnmSMKBCcNPQrBk5ZQfcbBxvJq00HCcjYBLJ');
        }
    }

    async buyProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        try {
            // Create payment intent
            const response = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: product.price,
                    currency: 'usd'
                })
            });

            const { clientSecret } = await response.json();
            
            // For now, we'll just show the quick pay modal
            // In a real implementation, you'd use Stripe Elements here
            this.openQuickPay();

        } catch (error) {
            console.error('Error creating payment:', error);
            this.showError('Payment processing failed. Please try again.');
        }
    }

    openQuickPay() {
        const modal = document.getElementById('quickPayModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    setupEventListeners() {
        // Modal close buttons
        document.querySelectorAll('.close').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            };
        });

        // Close modal when clicking outside
        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        };

        // Add some interactive features
        this.addScrollEffects();
    }

    addScrollEffects() {
        // Smooth scroll for internal links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    showError(message) {
        // Simple error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fee2e2;
            color: #991b1b;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            z-index: 1001;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(errorDiv);

        // Remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showSuccess(message) {
        // Simple success notification
        const successDiv = document.createElement('div');
        successDiv.className = 'success-notification';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #d1fae5;
            color: #065f46;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            z-index: 1001;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(successDiv);

        // Remove after 3 seconds
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
    showProductPreview(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product || !product.digitalMeta?.preview) {
            this.showError('Preview not available for this product.');
            return;
        }

        const modal = this.createPreviewModal(product);
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    createPreviewModal(product) {
        const modal = document.createElement('div');
        modal.className = 'modal preview-modal';
        modal.innerHTML = `
            <div class="modal-content preview-modal-content">
                <span class="close preview-close">&times;</span>
                <h2>${product.name} - Preview</h2>
                
                <div class="preview-tabs">
                    ${product.digitalMeta.preview.screenshots ? '<button class="preview-tab active" data-tab="screenshots">Screenshots</button>' : ''}
                    ${product.digitalMeta.preview.demoVideo ? '<button class="preview-tab" data-tab="video">Demo Video</button>' : ''}
                    ${product.digitalMeta.preview.samplePages ? '<button class="preview-tab" data-tab="samples">Sample Content</button>' : ''}
                </div>
                
                <div class="preview-content">
                    ${this.renderPreviewContent(product)}
                </div>
                
                <div class="preview-actions">
                    <button class="btn btn-primary" onclick="store.buyProduct('${product.id}'); this.closest('.modal').remove();">
                        ${product.type === 'subscription' ? '🔑 Subscribe Now' : '🛒 Buy Now'} - $${product.price.toFixed(2)}
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove();">Close Preview</button>
                </div>
            </div>
        `;

        // Add event listeners for tabs
        modal.querySelectorAll('.preview-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                modal.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const tabType = tab.dataset.tab;
                const content = modal.querySelector('.preview-content');
                content.innerHTML = this.renderPreviewTabContent(product, tabType);
            });
        });

        // Close modal functionality
        modal.querySelector('.preview-close').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        return modal;
    }

    renderPreviewContent(product) {
        const preview = product.digitalMeta.preview;
        if (preview.screenshots && preview.screenshots.length > 0) {
            return this.renderPreviewTabContent(product, 'screenshots');
        } else if (preview.demoVideo) {
            return this.renderPreviewTabContent(product, 'video');
        } else if (preview.samplePages) {
            return this.renderPreviewTabContent(product, 'samples');
        }
        return '<p>No preview content available.</p>';
    }

    renderPreviewTabContent(product, tabType) {
        const preview = product.digitalMeta.preview;
        
        switch (tabType) {
            case 'screenshots':
                return `
                    <div class="screenshots-grid">
                        ${preview.screenshots.map((screenshot, index) => `
                            <div class="screenshot-item">
                                <img src="${screenshot}" alt="Screenshot ${index + 1}" onclick="this.style.transform = this.style.transform ? '' : 'scale(1.5)'">
                            </div>
                        `).join('')}
                    </div>
                `;
            
            case 'video':
                return `
                    <div class="video-preview">
                        <video controls width="100%" style="max-width: 800px;">
                            <source src="${preview.demoVideo}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                `;
            
            case 'samples':
                return `
                    <div class="sample-pages">
                        <h4>Sample Content Included:</h4>
                        <ul class="sample-list">
                            ${preview.samplePages.map(page => `<li>📄 ${page}</li>`).join('')}
                        </ul>
                        <p class="sample-note">This is just a preview of what you'll get with the full version.</p>
                    </div>
                `;
            
            default:
                return '<p>Content not available.</p>';
        }
    }

    async buyProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        try {
            // Show loading state
            const loadingModal = this.createLoadingModal();
            document.body.appendChild(loadingModal);
            loadingModal.style.display = 'block';

            // Create Stripe checkout session for digital products
            if (product.type === 'digital' || product.type === 'subscription') {
                const response = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        productId: product.id,
                        productName: product.name,
                        amount: product.price,
                        currency: 'usd',
                        paymentType: product.type === 'subscription' ? 'subscription' : 'one_time',
                        successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
                        cancelUrl: `${window.location.origin}/cancel`
                    })
                });

                const { sessionId, url } = await response.json();
                
                if (url) {
                    // Redirect to Stripe Checkout
                    window.location.href = url;
                } else {
                    throw new Error('Failed to create checkout session');
                }
            } else {
                // Fallback for other product types
                this.openQuickPay();
            }

            loadingModal.remove();

        } catch (error) {
            console.error('Error creating payment:', error);
            document.querySelector('.modal')?.remove();
            this.showError('Payment processing failed. Please try again.');
        }
    }

    createLoadingModal() {
        const modal = document.createElement('div');
        modal.className = 'modal loading-modal';
        modal.innerHTML = `
            <div class="modal-content loading-content">
                <div class="loading-spinner"></div>
                <h3>Processing your order...</h3>
                <p>Please wait while we prepare your secure checkout.</p>
            </div>
        `;
        return modal;
    }
}

// Add CSS for notifications and category tabs
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .product-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    }
    
    .product-actions .btn {
        flex: 1;
        min-width: 120px;
    }
    
    .category-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 30px;
        justify-content: center;
    }
    
    .category-tab {
        padding: 10px 20px;
        background: #f1f5f9;
        border: none;
        border-radius: 30px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s;
    }
    
    .category-tab:hover {
        background: #e2e8f0;
    }
    
    .category-tab.active {
        background: #3b82f6;
        color: white;
    }
    
    .no-products {
        grid-column: 1 / -1;
        text-align: center;
        padding: 40px;
        color: #64748b;
        font-size: 1.2rem;
    }
`;
document.head.appendChild(style);

// Initialize store when DOM is loaded
let store;
document.addEventListener('DOMContentLoaded', () => {
    store = new Store();
});

// Global functions for button clicks
window.store = null;
document.addEventListener('DOMContentLoaded', () => {
    window.store = new Store();
}); 