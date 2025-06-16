// Enhanced Store functionality with monetization features
class EnhancedStore extends Store {
    constructor() {
        super();
        this.cart = new ShoppingCart();
        this.upsellManager = new UpsellManager();
        this.discountManager = new DiscountManager();
        this.currentFilters = {
            search: '',
            category: 'all',
            type: 'all',
            sort: 'name-asc'
        };
    }

    async init() {
        await super.init();
        this.setupEnhancedEventListeners();
        this.setupSearchAndFilters();
        this.cart.updateCartDisplay();
    }

    setupEnhancedEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        
        if (searchInput && searchBtn) {
            searchBtn.addEventListener('click', () => this.performSearch());
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch();
            });
        }

        // Filter functionality
        const categoryFilter = document.getElementById('category-filter');
        const typeFilter = document.getElementById('type-filter');
        const sortFilter = document.getElementById('sort-filter');

        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.applyFilters();
            });
        }

        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilters.type = e.target.value;
                this.applyFilters();
            });
        }

        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.currentFilters.sort = e.target.value;
                this.applyFilters();
            });
        }

        // Cart modal functionality
        window.openCartModal = () => this.openCartModal();
        window.closeCartModal = () => this.closeCartModal();
    }

    setupSearchAndFilters() {
        // Populate category filter
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter && this.categories.length > 0) {
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
        }
    }

    performSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            this.currentFilters.search = searchInput.value.trim();
            this.applyFilters();
        }
    }

    applyFilters() {
        let filteredProducts = [...this.products];

        // Apply search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            filteredProducts = filteredProducts.filter(product =>
                product.name.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm)
            );
        }

        // Apply category filter
        if (this.currentFilters.category !== 'all') {
            filteredProducts = filteredProducts.filter(product =>
                product.category === this.currentFilters.category
            );
        }

        // Apply type filter
        if (this.currentFilters.type !== 'all') {
            filteredProducts = filteredProducts.filter(product =>
                product.type === this.currentFilters.type
            );
        }

        // Apply sorting
        const [sortField, sortOrder] = this.currentFilters.sort.split('-');
        filteredProducts.sort((a, b) => {
            let aValue = a[sortField];
            let bValue = b[sortField];

            if (sortField === 'price') {
                aValue = parseFloat(aValue);
                bValue = parseFloat(bValue);
            }

            if (sortOrder === 'desc') {
                return bValue > aValue ? 1 : -1;
            } else {
                return aValue > bValue ? 1 : -1;
            }
        });

        // Update display
        const productsGrid = document.getElementById('products-grid');
        if (productsGrid) {
            productsGrid.innerHTML = this.renderProductCards(filteredProducts);
            this.observeProductCards();
        }
    }

    renderProductCards(products) {
        if (products.length === 0) {
            return '<div class="no-products">No products found matching your criteria</div>';
        }

        return products.map(product => `
            <div class="product-card ${product.type === 'digital' ? 'digital-product' : ''} ${product.featured ? 'featured-product' : ''}">
                <div class="product-header">
                    ${product.type === 'digital' ? '<span class="digital-badge">📱 Digital Product</span>' : ''}
                    ${product.featured ? '<span class="featured-badge">⭐ Featured</span>' : ''}
                </div>
                <img src="${product.image}" alt="${product.name}" class="product-image" onclick="enhancedStore.showProductDetail('${product.id}')">
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
                        <button class="btn btn-secondary" onclick="enhancedStore.showProductDetail('${product.id}')">
                            👁️ View Details
                        </button>
                        <button class="btn btn-primary" onclick="enhancedStore.addToCart('${product.id}')">
                            🛒 Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showProductDetail(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const modal = document.getElementById('productModal');
        const content = document.getElementById('product-detail-content');
        
        if (!modal || !content) return;

        // Get related products for upselling
        const relatedProducts = this.upsellManager.getRelatedProducts(productId, this.products);

        content.innerHTML = `
            <div class="product-detail">
                <div class="product-detail-header">
                    <div class="product-detail-image">
                        <img src="${product.image}" alt="${product.name}">
                    </div>
                    <div class="product-detail-info">
                        <h2>${product.name}</h2>
                        <p class="product-detail-description">${product.description}</p>
                        
                        ${product.digitalMeta ? this.renderDetailedDigitalFeatures(product.digitalMeta) : ''}
                        ${product.subscriptionMeta ? this.renderDetailedSubscriptionFeatures(product.subscriptionMeta) : ''}
                        
                        <div class="product-detail-price">
                            <span class="price">$${product.price.toFixed(2)}</span>
                            ${product.type === 'subscription' ? '<span class="billing-cycle">/month</span>' : ''}
                        </div>
                        
                        <div class="product-detail-actions">
                            <button class="btn btn-primary btn-large" onclick="enhancedStore.addToCart('${product.id}'); enhancedStore.closeProductModal();">
                                🛒 Add to Cart - $${product.price.toFixed(2)}
                            </button>
                            <button class="btn btn-secondary" onclick="enhancedStore.buyNow('${product.id}')">
                                ⚡ Buy Now
                            </button>
                        </div>
                    </div>
                </div>
                
                ${this.upsellManager.renderUpsellSection(productId, this.products)}
                
                <div class="product-detail-tabs">
                    <div class="tab-buttons">
                        <button class="tab-button active" data-tab="description">Description</button>
                        <button class="tab-button" data-tab="features">Features</button>
                        <button class="tab-button" data-tab="reviews">Reviews</button>
                    </div>
                    <div class="tab-content">
                        <div class="tab-pane active" id="description">
                            <p>${product.longDescription || product.description}</p>
                        </div>
                        <div class="tab-pane" id="features">
                            ${this.renderFeaturesList(product)}
                        </div>
                        <div class="tab-pane" id="reviews">
                            ${this.renderReviews(product)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Setup tab functionality
        content.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                
                // Update active tab button
                content.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update active tab pane
                content.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
                content.querySelector(`#${tabId}`).classList.add('active');
            });
        });

        modal.style.display = 'block';
    }

    renderDetailedDigitalFeatures(digitalMeta) {
        if (!digitalMeta.features || digitalMeta.features.length === 0) return '';
        
        return `
            <div class="digital-features-detailed">
                <h4>📋 What's Included:</h4>
                <ul class="features-list-detailed">
                    ${digitalMeta.features.map(feature => `<li>✅ ${feature}</li>`).join('')}
                </ul>
                ${digitalMeta.version ? `<div class="version-info">📦 Version: ${digitalMeta.version}</div>` : ''}
                ${digitalMeta.fileSize ? `<div class="file-size">💾 File Size: ${digitalMeta.fileSize}</div>` : ''}
                ${digitalMeta.format ? `<div class="file-format">📄 Format: ${digitalMeta.format}</div>` : ''}
            </div>
        `;
    }

    renderDetailedSubscriptionFeatures(subscriptionMeta) {
        return `
            <div class="subscription-features-detailed">
                <div class="subscription-info-detailed">
                    ${subscriptionMeta.trialDays ? `<span class="trial-badge-large">🆓 ${subscriptionMeta.trialDays}-day free trial</span>` : ''}
                    <span class="billing-info-large">Billed ${subscriptionMeta.interval}ly</span>
                </div>
                ${subscriptionMeta.features ? `
                    <h4>🔑 Subscription Benefits:</h4>
                    <ul class="features-list-detailed">
                        ${subscriptionMeta.features.map(feature => `<li>✅ ${feature}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
    }

    renderFeaturesList(product) {
        const features = [];
        
        if (product.digitalMeta?.features) {
            features.push(...product.digitalMeta.features);
        }
        
        if (product.subscriptionMeta?.features) {
            features.push(...product.subscriptionMeta.features);
        }
        
        if (features.length === 0) {
            return '<p>No detailed features available.</p>';
        }
        
        return `
            <ul class="detailed-features-list">
                ${features.map(feature => `<li>✅ ${feature}</li>`).join('')}
            </ul>
        `;
    }

    renderReviews(product) {
        // Mock reviews - in production, this would come from a database
        const mockReviews = [
            {
                name: "John D.",
                rating: 5,
                date: "2024-01-15",
                text: "Excellent product! Exactly what I was looking for. Fast delivery and great quality."
            },
            {
                name: "Sarah M.",
                rating: 4,
                date: "2024-01-10",
                text: "Very good value for money. The features are comprehensive and easy to use."
            },
            {
                name: "Mike R.",
                rating: 5,
                date: "2024-01-05",
                text: "Outstanding! This has saved me so much time. Highly recommended."
            }
        ];

        const averageRating = mockReviews.reduce((sum, review) => sum + review.rating, 0) / mockReviews.length;
        const starRating = '★'.repeat(Math.floor(averageRating)) + '☆'.repeat(5 - Math.floor(averageRating));

        return `
            <div class="reviews-section">
                <div class="reviews-summary">
                    <div class="rating-overview">
                        <span class="rating-score">${averageRating.toFixed(1)}</span>
                        <div class="rating-stars">${starRating}</div>
                        <span class="rating-count">(${mockReviews.length} reviews)</span>
                    </div>
                </div>
                
                <div class="reviews-list">
                    ${mockReviews.map(review => `
                        <div class="review-item">
                            <div class="review-header">
                                <span class="reviewer-name">${review.name}</span>
                                <span class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
                                <span class="review-date">${new Date(review.date).toLocaleDateString()}</span>
                            </div>
                            <p class="review-text">${review.text}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    closeProductModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    addToCart(productId) {
        const success = this.cart.addItem(productId, this.products);
        if (success) {
            this.showSuccess('Product added to cart!');
        } else {
            this.showError('Failed to add product to cart.');
        }
    }

    async buyNow(productId) {
        // Add to cart and immediately proceed to checkout
        const success = this.cart.addItem(productId, this.products);
        if (success) {
            await this.cart.checkout();
        }
    }

    openCartModal() {
        const modal = document.getElementById('cartModal');
        const content = document.getElementById('cart-content');
        
        if (!modal || !content) return;

        content.innerHTML = this.cart.renderCartModal();
        modal.style.display = 'block';
    }

    closeCartModal() {
        const modal = document.getElementById('cartModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Initialize enhanced store
const enhancedStore = new EnhancedStore();

// Make it globally available
window.enhancedStore = enhancedStore;

// Setup modal close functionality
document.addEventListener('DOMContentLoaded', () => {
    // Close modals when clicking outside
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // Close modals with close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        };
    });
});

