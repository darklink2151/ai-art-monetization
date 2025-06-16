// Enhanced server-side features for monetization
const express = require('express');

// Discount Code Management Routes
function setupDiscountRoutes(app) {
    // Validate discount code
    app.post('/api/validate-discount', async (req, res) => {
        try {
            const { code, amount } = req.body;
            
            // In production, this would query a database
            const discountCodes = {
                'WELCOME10': {
                    type: 'percentage',
                    value: 10,
                    minAmount: 0,
                    maxUses: 100,
                    currentUses: 0,
                    expiryDate: new Date('2025-12-31'),
                    description: '10% off for new customers'
                },
                'SAVE20': {
                    type: 'percentage',
                    value: 20,
                    minAmount: 50,
                    maxUses: 50,
                    currentUses: 0,
                    expiryDate: new Date('2025-12-31'),
                    description: '20% off orders over $50'
                },
                'FLAT15': {
                    type: 'fixed',
                    value: 15,
                    minAmount: 30,
                    maxUses: 200,
                    currentUses: 0,
                    expiryDate: new Date('2025-12-31'),
                    description: '$15 off orders over $30'
                }
            };

            const discount = discountCodes[code.toUpperCase()];
            
            if (!discount) {
                return res.status(400).json({ error: 'Invalid discount code' });
            }

            if (discount.currentUses >= discount.maxUses) {
                return res.status(400).json({ error: 'Discount code has expired' });
            }

            if (new Date() > discount.expiryDate) {
                return res.status(400).json({ error: 'Discount code has expired' });
            }

            if (amount < discount.minAmount) {
                return res.status(400).json({ 
                    error: `Minimum order amount of $${discount.minAmount.toFixed(2)} required` 
                });
            }

            let discountAmount = 0;
            if (discount.type === 'percentage') {
                discountAmount = (amount * discount.value) / 100;
            } else if (discount.type === 'fixed') {
                discountAmount = Math.min(discount.value, amount);
            }

            res.json({
                valid: true,
                discountAmount,
                finalAmount: amount - discountAmount,
                description: discount.description
            });

        } catch (error) {
            console.error('Discount validation error:', error);
            res.status(500).json({ error: 'Failed to validate discount code' });
        }
    });

    // Apply discount code (increment usage)
    app.post('/api/apply-discount', async (req, res) => {
        try {
            const { code } = req.body;
            
            // In production, this would update the database
            // For now, we'll just return success
            res.json({ success: true });

        } catch (error) {
            console.error('Discount application error:', error);
            res.status(500).json({ error: 'Failed to apply discount code' });
        }
    });
}

// Enhanced Product Routes
function setupEnhancedProductRoutes(app) {
    // Get related products for upselling
    app.get('/api/products/:id/related', async (req, res) => {
        try {
            const { id } = req.params;
            
            // In production, this would be based on database relationships
            const productRelations = {
                'software-basic': {
                    upgrades: ['software-pro', 'software-enterprise'],
                    related: ['plugin-pack', 'support-package'],
                    bundles: ['complete-suite']
                },
                'ebook-beginner': {
                    upgrades: ['ebook-advanced', 'video-course'],
                    related: ['workbook', 'templates'],
                    bundles: ['learning-bundle']
                }
            };

            const relations = productRelations[id] || { upgrades: [], related: [], bundles: [] };
            
            // Get all products and filter by relations
            let products;
            if (mongoose.connection.readyState === 1) {
                products = await Product.find({ isActive: true });
            } else {
                products = readData(PRODUCTS_FILE);
            }

            const relatedProducts = {
                upgrades: products.filter(p => relations.upgrades.includes(p.id)),
                related: products.filter(p => relations.related.includes(p.id)),
                bundles: products.filter(p => relations.bundles.includes(p.id))
            };

            res.json(relatedProducts);

        } catch (error) {
            console.error('Error fetching related products:', error);
            res.status(500).json({ error: 'Failed to fetch related products' });
        }
    });

    // Enhanced product search with filters
    app.get('/api/products/search', async (req, res) => {
        try {
            const { 
                q, 
                category, 
                minPrice, 
                maxPrice, 
                type, 
                featured,
                sortBy = 'name',
                sortOrder = 'asc'
            } = req.query;

            let products;
            if (mongoose.connection.readyState === 1) {
                products = await Product.find({ isActive: true });
            } else {
                products = readData(PRODUCTS_FILE);
            }

            // Apply filters
            let filteredProducts = products;

            if (q) {
                const searchTerm = q.toLowerCase();
                filteredProducts = filteredProducts.filter(product => 
                    product.name.toLowerCase().includes(searchTerm) ||
                    product.description.toLowerCase().includes(searchTerm)
                );
            }

            if (category && category !== 'all') {
                filteredProducts = filteredProducts.filter(product => 
                    product.category === category
                );
            }

            if (minPrice) {
                filteredProducts = filteredProducts.filter(product => 
                    product.price >= parseFloat(minPrice)
                );
            }

            if (maxPrice) {
                filteredProducts = filteredProducts.filter(product => 
                    product.price <= parseFloat(maxPrice)
                );
            }

            if (type) {
                filteredProducts = filteredProducts.filter(product => 
                    product.type === type
                );
            }

            if (featured === 'true') {
                filteredProducts = filteredProducts.filter(product => 
                    product.featured === true
                );
            }

            // Apply sorting
            filteredProducts.sort((a, b) => {
                let aValue = a[sortBy];
                let bValue = b[sortBy];

                if (sortBy === 'price') {
                    aValue = parseFloat(aValue);
                    bValue = parseFloat(bValue);
                }

                if (sortOrder === 'desc') {
                    return bValue > aValue ? 1 : -1;
                } else {
                    return aValue > bValue ? 1 : -1;
                }
            });

            res.json({
                products: filteredProducts,
                total: filteredProducts.length,
                filters: {
                    categories: [...new Set(products.map(p => p.category))],
                    types: [...new Set(products.map(p => p.type))],
                    priceRange: {
                        min: Math.min(...products.map(p => p.price)),
                        max: Math.max(...products.map(p => p.price))
                    }
                }
            });

        } catch (error) {
            console.error('Error searching products:', error);
            res.status(500).json({ error: 'Failed to search products' });
        }
    });
}

// Enhanced Checkout with Cart Support
function setupEnhancedCheckoutRoutes(app) {
    // Create checkout session for multiple items (cart)
    app.post('/api/create-cart-checkout-session', async (req, res) => {
        try {
            const {
                items,
                discountCode,
                customerEmail,
                successUrl,
                cancelUrl
            } = req.body;

            if (!items || items.length === 0) {
                return res.status(400).json({ error: 'Cart is empty' });
            }

            // Calculate totals
            let subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
            let discountAmount = 0;

            // Apply discount if provided
            if (discountCode) {
                const discountResponse = await fetch(`${req.headers.origin}/api/validate-discount`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: discountCode, amount: subtotal })
                });

                if (discountResponse.ok) {
                    const discountData = await discountResponse.json();
                    discountAmount = discountData.discountAmount;
                }
            }

            const total = subtotal - discountAmount;

            // Create line items for Stripe
            const lineItems = items.map(item => ({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name,
                        images: item.image ? [item.image] : [],
                        metadata: {
                            productId: item.id,
                            type: item.type || 'digital'
                        }
                    },
                    unit_amount: Math.round(item.price * 100)
                },
                quantity: item.quantity
            }));

            // Add discount as a negative line item if applicable
            if (discountAmount > 0) {
                lineItems.push({
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Discount (${discountCode})`,
                            metadata: {
                                type: 'discount'
                            }
                        },
                        unit_amount: -Math.round(discountAmount * 100)
                    },
                    quantity: 1
                });
            }

            const sessionConfig = {
                payment_method_types: ['card'],
                line_items: lineItems,
                mode: 'payment',
                success_url: successUrl || `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: cancelUrl || `${req.headers.origin}/cancel`,
                metadata: {
                    cartItems: JSON.stringify(items.map(item => ({ id: item.id, quantity: item.quantity }))),
                    discountCode: discountCode || '',
                    customerEmail: customerEmail || 'guest'
                }
            };

            if (customerEmail) {
                sessionConfig.customer_email = customerEmail;
            }

            const session = await stripe.checkout.sessions.create(sessionConfig);

            res.json({
                sessionId: session.id,
                url: session.url
            });

        } catch (error) {
            console.error('Cart checkout session creation error:', error);
            res.status(400).json({ error: error.message });
        }
    });
}

// Analytics and Reporting Routes
function setupAnalyticsRoutes(app) {
    // Enhanced dashboard statistics
    app.get('/api/stats/enhanced', async (req, res) => {
        try {
            let orders;
            if (mongoose.connection.readyState === 1) {
                orders = await Order.find();
            } else {
                orders = readData(DATA_FILE);
            }

            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

            const recentOrders = orders.filter(order => 
                new Date(order.createdAt || order.timestamp) >= thirtyDaysAgo
            );

            const weeklyOrders = orders.filter(order => 
                new Date(order.createdAt || order.timestamp) >= sevenDaysAgo
            );

            const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
            const monthlyRevenue = recentOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
            const weeklyRevenue = weeklyOrders.reduce((sum, order) => sum + (order.amount || 0), 0);

            // Calculate conversion metrics
            const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
            const monthlyGrowth = orders.length > 30 ? 
                ((recentOrders.length - (orders.length - recentOrders.length)) / (orders.length - recentOrders.length)) * 100 : 0;

            // Product performance
            const productSales = {};
            orders.forEach(order => {
                if (order.productId) {
                    productSales[order.productId] = (productSales[order.productId] || 0) + 1;
                }
            });

            const topProducts = Object.entries(productSales)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([productId, sales]) => ({ productId, sales }));

            res.json({
                overview: {
                    totalOrders: orders.length,
                    totalRevenue,
                    averageOrderValue,
                    monthlyGrowth
                },
                recent: {
                    monthlyOrders: recentOrders.length,
                    monthlyRevenue,
                    weeklyOrders: weeklyOrders.length,
                    weeklyRevenue
                },
                products: {
                    topSelling: topProducts
                },
                trends: {
                    dailySales: this.calculateDailySales(orders),
                    monthlySales: this.calculateMonthlySales(orders)
                }
            });

        } catch (error) {
            console.error('Error fetching enhanced stats:', error);
            res.status(500).json({ error: 'Failed to fetch statistics' });
        }
    });

    // Helper methods for analytics
    this.calculateDailySales = (orders) => {
        const dailySales = {};
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0];
        }).reverse();

        last30Days.forEach(date => {
            dailySales[date] = 0;
        });

        orders.forEach(order => {
            const orderDate = new Date(order.createdAt || order.timestamp).toISOString().split('T')[0];
            if (dailySales.hasOwnProperty(orderDate)) {
                dailySales[orderDate] += order.amount || 0;
            }
        });

        return Object.entries(dailySales).map(([date, amount]) => ({ date, amount }));
    };

    this.calculateMonthlySales = (orders) => {
        const monthlySales = {};
        
        orders.forEach(order => {
            const orderDate = new Date(order.createdAt || order.timestamp);
            const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlySales[monthKey]) {
                monthlySales[monthKey] = 0;
            }
            monthlySales[monthKey] += order.amount || 0;
        });

        return Object.entries(monthlySales)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, amount]) => ({ month, amount }));
    };
}

// Export setup functions
module.exports = {
    setupDiscountRoutes,
    setupEnhancedProductRoutes,
    setupEnhancedCheckoutRoutes,
    setupAnalyticsRoutes
};

