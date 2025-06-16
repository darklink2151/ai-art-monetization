const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config();

// Initialize Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_your_key_here');

// Import models
const Product = require('./models/Product');
const Order = require('./models/Order');
const License = require('./models/License');
const DownloadLog = require('./models/DownloadLog');
const DownloadToken = require('./models/DownloadToken');

// Import services
const DigitalDeliveryService = require('./services/DigitalDeliveryService');
const EmailDeliveryService = require('./services/EmailDeliveryService');

// Import security middleware
const {
  downloadRateLimit,
  licenseRateLimit,
  ipLogger,
  validateAccessToken,
  antiPiracyCheck,
  licenseSecurityCheck
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('📊 Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));
}

// Security middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Rate limiting
const limiter = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
};

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Security and logging middleware
app.use(ipLogger);

// Webhook middleware (raw body for Stripe)
app.use('/webhook', bodyParser.raw({type: 'application/json'}));

// Simple JSON file database fallback
const DATA_FILE = './data/orders.json';
const PRODUCTS_FILE = './data/products.json';

// Ensure data directory exists
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

// Helper functions
const readData = (file) => {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        return [];
    }
};

const writeData = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// Generate secure download token
const generateDownloadToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Enhanced secure file serving function
const serveSecureFile = async (tokenData, req, res) => {
  try {
    const filePath = tokenData.fileUrl;
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found on server');
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // Set security headers
    res.setHeader('Content-Disposition', `attachment; filename="${tokenData.fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Add watermark info to headers if present
    if (tokenData.watermarkData) {
      res.setHeader('X-Watermark-ID', tokenData.watermarkData.hash);
    }
    
    // Stream file with potential watermarking
    const readStream = fs.createReadStream(filePath);
    
    readStream.on('error', (error) => {
      console.error('File streaming error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'File download failed' });
      }
    });
    
    readStream.pipe(res);
    
  } catch (error) {
    console.error('Secure file serving error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'File access failed' });
    }
  }
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API Routes
app.get('/api/products', async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const products = await Product.find({ isActive: true }).select('-digitalMeta.fileUrl');
            res.json(products);
        } else {
            const products = readData(PRODUCTS_FILE);
            res.json(products);
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const orders = await Order.find().sort({ createdAt: -1 });
            res.json(orders);
        } else {
            const orders = readData(DATA_FILE);
            res.json(orders);
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Enhanced Stripe payment creation with subscription support
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { 
            amount, 
            currency = 'usd', 
            productId, 
            customerEmail,
            paymentType = 'one_time' // 'one_time' or 'subscription'
        } = req.body;
        
        let result = {};
        
        if (paymentType === 'subscription') {
            // Create subscription
            const subscription = await stripe.subscriptions.create({
                customer: await createOrGetCustomer(customerEmail),
                items: [{
                    price_data: {
                        currency,
                        product_data: {
                            name: `Product ${productId}`
                        },
                        unit_amount: Math.round(amount * 100),
                        recurring: {
                            interval: 'month' // This should come from product metadata
                        }
                    }
                }],
                payment_behavior: 'default_incomplete',
                expand: ['latest_invoice.payment_intent']
            });
            
            result = {
                subscriptionId: subscription.id,
                clientSecret: subscription.latest_invoice.payment_intent.client_secret
            };
        } else {
            // Create one-time payment
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100),
                currency,
                metadata: {
                    productId,
                    customerEmail: customerEmail || 'guest'
                }
            });
            
            result = {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            };
        }
        
        res.json(result);
    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Create Stripe Checkout Session for digital products
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const {
            productId,
            productName,
            amount,
            currency = 'usd',
            paymentType = 'one_time',
            successUrl,
            cancelUrl
        } = req.body;

        // Get product details
        let product;
        if (mongoose.connection.readyState === 1) {
            product = await Product.findById(productId);
        } else {
            const products = readData(PRODUCTS_FILE);
            product = products.find(p => p.id === productId);
        }

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const sessionConfig = {
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency,
                        product_data: {
                            name: productName,
                            description: product.description,
                            images: product.image ? [product.image] : [],
                            metadata: {
                                type: product.type || 'digital',
                                productId: productId
                            }
                        },
                        unit_amount: Math.round(amount * 100),
                        ...(paymentType === 'subscription' && {
                            recurring: {
                                interval: product.subscriptionMeta?.interval || 'month',
                                interval_count: product.subscriptionMeta?.intervalCount || 1
                            }
                        })
                    },
                    quantity: 1,
                },
            ],
            mode: paymentType === 'subscription' ? 'subscription' : 'payment',
            success_url: successUrl || `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${req.headers.origin}/cancel`,
            metadata: {
                productId,
                productType: product.type || 'digital',
                customerEmail: req.body.customerEmail || 'guest'
            }
        };

        // Add subscription-specific features
        if (paymentType === 'subscription' && product.subscriptionMeta?.trialDays) {
            sessionConfig.subscription_data = {
                trial_period_days: product.subscriptionMeta.trialDays
            };
        }

        // Add customer email if provided
        if (req.body.customerEmail) {
            sessionConfig.customer_email = req.body.customerEmail;
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        res.json({
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Checkout session creation error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Success page handler
app.get('/success', async (req, res) => {
    const { session_id } = req.query;
    
    if (session_id) {
        try {
            const session = await stripe.checkout.sessions.retrieve(session_id);
            
            // Send success page with download instructions
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Purchase Successful!</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                        .success-container { background: #d1fae5; padding: 30px; border-radius: 10px; text-align: center; }
                        .download-info { background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; }
                        .btn { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px; }
                    </style>
                </head>
                <body>
                    <div class="success-container">
                        <h1>🎉 Purchase Successful!</h1>
                        <p>Thank you for your purchase! Your payment has been processed.</p>
                        
                        <div class="download-info">
                            <h3>📧 Check Your Email</h3>
                            <p>We've sent download instructions and license information to your email address.</p>
                            <p>If you don't see the email within a few minutes, please check your spam folder.</p>
                        </div>
                        
                        <a href="/" class="btn">Return to Store</a>
                        <a href="/dashboard" class="btn">View Dashboard</a>
                    </div>
                </body>
                </html>
            `);
        } catch (error) {
            console.error('Error retrieving session:', error);
            res.redirect('/?error=session_retrieval_failed');
        }
    } else {
        res.redirect('/?error=no_session_id');
    }
});

// Cancel page handler
app.get('/cancel', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Cancelled</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                .cancel-container { background: #fee2e2; padding: 30px; border-radius: 10px; text-align: center; }
                .btn { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px; }
            </style>
        </head>
        <body>
            <div class="cancel-container">
                <h1>❌ Payment Cancelled</h1>
                <p>Your payment was cancelled. No charges have been made to your account.</p>
                <p>Feel free to return to the store and try again when you're ready.</p>
                
                <a href="/" class="btn">Return to Store</a>
            </div>
        </body>
        </html>
    `);
});

// Helper function to create or get Stripe customer
async function createOrGetCustomer(email) {
    if (!email) throw new Error('Customer email is required');
    
    const customers = await stripe.customers.list({ email, limit: 1 });
    
    if (customers.data.length > 0) {
        return customers.data[0].id;
    }
    
    const customer = await stripe.customers.create({ email });
    return customer.id;
}

// Stripe webhook handler
app.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    try {
        await handleStripeWebhook(event);
        res.json({ received: true });
    } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Webhook event handler
async function handleStripeWebhook(event) {
    switch (event.type) {
        case 'payment_intent.succeeded':
            await handlePaymentSuccess(event.data.object);
            break;
        case 'invoice.payment_succeeded':
            await handleSubscriptionPayment(event.data.object);
            break;
        case 'customer.subscription.deleted':
            await handleSubscriptionCancelled(event.data.object);
            break;
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }
}

// Handle successful payment and trigger digital delivery
async function handlePaymentSuccess(paymentIntent) {
    try {
        const { productId, customerEmail } = paymentIntent.metadata;
        
        // Get product information
        let product;
        if (mongoose.connection.readyState === 1) {
            product = await Product.findById(productId);
        } else {
            const products = readData(PRODUCTS_FILE);
            product = products.find(p => p.id === productId);
        }
        
        if (!product) {
            console.error('Product not found for payment:', productId);
            return;
        }
        
        // Create order record
        let order;
        if (mongoose.connection.readyState === 1) {
            order = new Order({
                productId,
                productName: product.name,
                productType: product.type || 'physical',
                amount: paymentIntent.amount / 100,
                customerEmail,
                status: 'completed',
                paymentIntentId: paymentIntent.id
            });
            await order.save();
        } else {
            // Fallback to JSON storage
            const orders = readData(DATA_FILE);
            order = {
                id: uuidv4(),
                productId,
                productName: product.name,
                amount: paymentIntent.amount / 100,
                customerEmail,
                status: 'completed',
                paymentIntentId: paymentIntent.id,
                createdAt: new Date().toISOString()
            };
            orders.push(order);
            writeData(DATA_FILE, orders);
        }
        
        // Process digital delivery with enhanced security
        if (product.type === 'digital') {
            const delivery = await DigitalDeliveryService.processDigitalDelivery(order, product, {
                forceWatermark: product.price > 50,
                accessType: product.digitalMeta?.licenseType === 'enterprise' ? 'enterprise' : 'standard'
            });
            
            if (delivery.success) {
                console.log(`✅ Enhanced digital delivery processed for order ${order._id || order.id}`);
                
                // Store secure download token in database
                if (mongoose.connection.readyState === 1) {
                    try {
                        const downloadToken = new DownloadToken({
                            token: delivery.downloadLink.token,
                            orderId: order._id,
                            productId: product._id || product.id,
                            customerEmail: order.customerEmail,
                            fileName: product.digitalMeta?.fileName || `${product.name}.zip`,
                            fileUrl: product.digitalMeta?.fileUrl || '/path/to/default/file.zip',
                            fileSize: product.digitalMeta?.fileSize || 0,
                            accessCode: DownloadToken.generateAccessCode(),
                            maxDownloads: product.digitalMeta?.downloadLimit || 5,
                            expiresAt: delivery.downloadLink.expiresAt,
                            watermarkData: delivery.watermark,
                            accessType: delivery.accessType || 'standard',
                            deliveryMetadata: {
                                deliveryId: delivery.deliveryId,
                                licenseKey: delivery.license?.licenseKey
                            }
                        });
                        
                        await downloadToken.save();
                        console.log(`🔐 Secure download token stored: ${downloadToken.token.substring(0, 8)}...`);
                    } catch (error) {
                        console.error('Error storing download token:', error);
                    }
                }
                
                // Send enhanced delivery email with access code
                const emailResult = await EmailDeliveryService.sendDigitalDeliveryEmail(order, product, delivery);
                if (emailResult.success) {
                    console.log(`📧 Digital delivery email sent with access code: ${emailResult.accessCode}`);
                } else {
                    console.warn(`⚠️ Email delivery failed: ${emailResult.error || emailResult.message}`);
                }
            }
        }
        
    } catch (error) {
        console.error('Error processing payment success:', error);
    }
}

// Handle subscription payments
async function handleSubscriptionPayment(invoice) {
    console.log('Subscription payment received:', invoice.id);
    // Implement subscription logic here
}

// Handle subscription cancellation
async function handleSubscriptionCancelled(subscription) {
    console.log('Subscription cancelled:', subscription.id);
    // Implement subscription cancellation logic here
}

// Email delivery is now handled by EmailDeliveryService
// This function is kept for backward compatibility
async function sendDigitalDeliveryEmail(order, product, delivery) {
    return await EmailDeliveryService.sendDigitalDeliveryEmail(order, product, delivery);
}

// Enhanced secure download endpoint with comprehensive security
// Features:
// - Rate limiting (max 10 downloads per IP per 15 minutes)
// - Access token validation (64-character hex format)
// - Anti-piracy detection (bot detection, VPN detection, concurrent downloads)
// - Access code verification (required for first download)
// - Comprehensive logging (success/failure, client info, security flags)
// - Watermark integration (for high-value products)
// - Secure file serving (proper headers, streaming, error handling)
app.get('/api/download/:token', 
    downloadRateLimit,
    validateAccessToken,
    antiPiracyCheck,
    async (req, res) => {
        let downloadToken = null;
        let downloadAttemptLogged = false;
        
        try {
            const { token } = req.params;
            const providedAccessCode = req.query.code || req.headers['x-access-code'];
            const { clientInfo, securityFlags } = req;
            
            // Try to get token from database first, then fallback to service
            if (mongoose.connection.readyState === 1) {
                downloadToken = await DownloadToken.findOne({ token, isActive: true });
                
                if (!downloadToken) {
                    console.warn(`🚫 Download token not found in database: ${token.substring(0, 8)}...`);
                    return res.status(404).json({ 
                        error: 'Invalid or expired download link',
                        code: 'TOKEN_NOT_FOUND'
                    });
                }
                
                // Validate token is still valid
                if (!downloadToken.isValidForDownload()) {
                    const reason = downloadToken.downloadCount >= downloadToken.maxDownloads 
                        ? 'Download limit exceeded'
                        : downloadToken.expiresAt < new Date()
                        ? 'Token expired'
                        : 'Token deactivated';
                    
                    console.warn(`🚫 Invalid download attempt: ${reason} for token ${token.substring(0, 8)}...`);
                    return res.status(410).json({ 
                        error: reason,
                        code: 'TOKEN_INVALID'
                    });
                }
                
                // Verify access code if required and not already used
                if (!downloadToken.accessCodeUsed && providedAccessCode) {
                    if (!downloadToken.verifyAccessCode(providedAccessCode)) {
                        console.warn(`🔐 Invalid access code provided for token ${token.substring(0, 8)}...`);
                        return res.status(403).json({ 
                            error: 'Invalid access code',
                            code: 'INVALID_ACCESS_CODE'
                        });
                    }
                } else if (!downloadToken.accessCodeUsed && !providedAccessCode) {
                    return res.status(403).json({ 
                        error: 'Access code required for download',
                        code: 'ACCESS_CODE_REQUIRED',
                        hint: 'Check your email for the access code'
                    });
                }
                
                // Check for security flags and suspicious activity
                if (securityFlags?.suspicious) {
                    downloadToken.flagSecurity(securityFlags.reason, 'suspiciousActivity');
                    await downloadToken.save();
                    
                    return res.status(403).json({ 
                        error: 'Access denied due to security concerns',
                        code: 'SECURITY_BLOCK'
                    });
                }
                
                // Record download attempt
                downloadToken.recordDownload(clientInfo, true);
                await downloadToken.save();
                
                // Log download in DownloadLog as well
                const downloadLog = new DownloadLog({
                    orderId: downloadToken.orderId,
                    productId: downloadToken.productId,
                    customerEmail: downloadToken.customerEmail,
                    downloadToken: token,
                    fileName: downloadToken.fileName,
                    fileSize: downloadToken.fileSize,
                    downloadedAt: new Date(),
                    success: true,
                    clientInfo: {
                        ...clientInfo,
                        platform: clientInfo.platform,
                        browser: clientInfo.browser,
                        accessCode: providedAccessCode ? 'PROVIDED' : 'NOT_REQUIRED',
                        watermarkId: downloadToken.watermarkData?.id,
                        securityFlags: securityFlags || {}
                    }
                });
                await downloadLog.save();
                downloadAttemptLogged = true;
                
                console.log(`✅ Authorized download: ${downloadToken.customerEmail} - ${downloadToken.fileName}`);
                console.log(`📊 Download count: ${downloadToken.downloadCount}/${downloadToken.maxDownloads}`);
                
                // Serve the actual file
                await serveSecureFile(downloadToken, req, res);
                
            } else {
                // Fallback to in-memory service when database is not available
                console.warn('📄 Using fallback in-memory token validation (database unavailable)');
                
                const tokenData = await DigitalDeliveryService.validateDownloadToken(token, clientInfo);
                
                if (!tokenData) {
                    return res.status(404).json({ error: 'Invalid or expired download link' });
                }
                
                // Increment download count
                DigitalDeliveryService.incrementDownloadCount(token);
                
                // Simple file response for fallback
                res.json({
                    message: 'Download ready (fallback mode)',
                    fileName: tokenData.fileName,
                    fileSize: tokenData.fileSize,
                    downloadCount: tokenData.downloadCount + 1,
                    maxDownloads: tokenData.maxDownloads
                });
            }
            
        } catch (error) {
            console.error('💥 Download error:', error);
            
            // Log failed download attempt if we have token info
            if (downloadToken && mongoose.connection.readyState === 1 && !downloadAttemptLogged) {
                try {
                    const failedLog = new DownloadLog({
                        orderId: downloadToken.orderId,
                        productId: downloadToken.productId,
                        customerEmail: downloadToken.customerEmail,
                        downloadToken: req.params.token,
                        fileName: downloadToken.fileName,
                        fileSize: downloadToken.fileSize,
                        downloadedAt: new Date(),
                        success: false,
                        errorMessage: error.message,
                        clientInfo: req.clientInfo
                    });
                    await failedLog.save();
                } catch (logError) {
                    console.error('Failed to log download error:', logError);
                }
            }
            
            res.status(500).json({ 
                error: 'Download failed',
                code: 'DOWNLOAD_ERROR'
            });
        }
    }
);

// Download token validation is now handled by DownloadToken model and DigitalDeliveryService
// This function is kept for backward compatibility
async function validateDownloadToken(token) {
    try {
        return await DigitalDeliveryService.validateDownloadToken(token);
    } catch (error) {
        console.error('Token validation error:', error);
        return null;
    }
}

// Enhanced license validation endpoint with security measures
app.post('/api/validate-license',
    licenseRateLimit,
    licenseSecurityCheck,
    async (req, res) => {
        try {
            const { licenseKey, deviceId, deviceInfo } = req.body;
            const { clientInfo } = req;
            
            if (!licenseKey) {
                return res.status(400).json({ 
                    error: 'License key is required',
                    code: 'MISSING_LICENSE_KEY'
                });
            }
            
            if (mongoose.connection.readyState === 1) {
                const license = await License.findOne({ licenseKey });
                
                if (!license) {
                    console.warn(`🔑 License validation failed - not found: ${licenseKey}`);
                    return res.status(404).json({ 
                        error: 'License not found',
                        code: 'LICENSE_NOT_FOUND'
                    });
                }
                
                if (!license.isValid()) {
                    const reason = license.status !== 'active' ? 'License is not active' :
                                  license.expiresAt <= new Date() ? 'License has expired' :
                                  'License activation limit reached';
                    
                    console.warn(`🔑 License validation failed - invalid: ${licenseKey} - ${reason}`);
                    return res.status(400).json({ 
                        error: reason,
                        code: 'LICENSE_INVALID',
                        status: license.status,
                        expiresAt: license.expiresAt,
                        activationCount: license.activationCount,
                        maxActivations: license.maxActivations
                    });
                }
                
                // Handle device activation if deviceId is provided
                if (deviceId) {
                    try {
                        const activationResult = license.activate(deviceId, {
                            ...deviceInfo,
                            ip: clientInfo.ip,
                            platform: clientInfo.platform,
                            browser: clientInfo.browser,
                            userAgent: clientInfo.userAgent
                        });
                        
                        if (activationResult.success) {
                            await license.save();
                            console.log(`✅ License activated: ${licenseKey} on device ${deviceId}`);
                            
                            // Send activation notification email
                            await EmailDeliveryService.sendLicenseActivationEmail(
                                license.customerEmail,
                                license,
                                { ...deviceInfo, ...clientInfo }
                            );
                        }
                        
                    } catch (activationError) {
                        console.warn(`🔑 License activation failed: ${activationError.message}`);
                        return res.status(400).json({ 
                            error: activationError.message,
                            code: 'ACTIVATION_FAILED'
                        });
                    }
                }
                
                // Return successful validation
                res.json({
                    valid: true,
                    licenseKey: license.licenseKey,
                    licenseType: license.licenseType,
                    status: license.status,
                    expiresAt: license.expiresAt,
                    features: license.features,
                    activationCount: license.activationCount,
                    maxActivations: license.maxActivations,
                    metadata: license.metadata,
                    validatedAt: new Date().toISOString()
                });
                
                console.log(`✅ License validated successfully: ${licenseKey}`);
                
            } else {
                console.warn('📄 License validation using fallback (database unavailable)');
                res.json({ 
                    valid: true, 
                    message: 'License validation (fallback mode)',
                    licenseKey,
                    validatedAt: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error('💥 License validation error:', error);
            res.status(500).json({ 
                error: 'License validation failed',
                code: 'VALIDATION_ERROR'
            });
        }
    }
);

// Dashboard API - Enhanced statistics
app.get('/api/stats', async (req, res) => {
    try {
        let stats;
        
        if (mongoose.connection.readyState === 1) {
            const orders = await Order.find();
            const licenses = await License.find();
            
            stats = {
                totalOrders: orders.length,
                totalRevenue: orders.reduce((sum, order) => sum + order.amount, 0),
                pendingOrders: orders.filter(order => order.status === 'pending').length,
                completedOrders: orders.filter(order => order.status === 'completed').length,
                digitalOrders: orders.filter(order => order.productType === 'digital').length,
                activeLicenses: licenses.filter(license => license.status === 'active').length
            };
        } else {
            const orders = readData(DATA_FILE);
            stats = {
                totalOrders: orders.length,
                totalRevenue: orders.reduce((sum, order) => sum + (order.amount || 0), 0),
                pendingOrders: orders.filter(order => order.status === 'pending').length,
                completedOrders: orders.filter(order => order.status === 'completed').length,
                digitalOrders: 0,
                activeLicenses: 0
            };
        }
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Security monitoring endpoints

// Get download logs and security information
app.get('/api/security/downloads', async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const logs = await DownloadLog.find()
                .sort({ downloadedAt: -1 })
                .limit(100)
                .populate('orderId', 'customerEmail productName');
            
            res.json({
                downloads: logs,
                summary: {
                    total: logs.length,
                    successful: logs.filter(log => log.success).length,
                    failed: logs.filter(log => !log.success).length,
                    uniqueIPs: [...new Set(logs.map(log => log.clientInfo?.ip))].length
                }
            });
        } else {
            res.json({ downloads: [], summary: { total: 0, successful: 0, failed: 0, uniqueIPs: 0 } });
        }
    } catch (error) {
        console.error('Error fetching security logs:', error);
        res.status(500).json({ error: 'Failed to fetch security information' });
    }
});

// Get active download tokens
app.get('/api/security/tokens', async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const tokens = await DownloadToken.find({ isActive: true })
                .sort({ createdAt: -1 })
                .select('-token') // Don't expose actual tokens
                .populate('orderId', 'customerEmail productName');
            
            res.json({
                activeTokens: tokens,
                summary: {
                    total: tokens.length,
                    expired: tokens.filter(token => token.expiresAt < new Date()).length,
                    maxDownloadsReached: tokens.filter(token => token.downloadCount >= token.maxDownloads).length,
                    suspicious: tokens.filter(token => token.securityFlags.suspiciousActivity).length
                }
            });
        } else {
            res.json({ activeTokens: [], summary: { total: 0, expired: 0, maxDownloadsReached: 0, suspicious: 0 } });
        }
    } catch (error) {
        console.error('Error fetching token information:', error);
        res.status(500).json({ error: 'Failed to fetch token information' });
    }
});

// Revoke a download token (security action)
app.post('/api/security/revoke-token', async (req, res) => {
    try {
        const { tokenId, reason } = req.body;
        
        if (mongoose.connection.readyState === 1) {
            const token = await DownloadToken.findById(tokenId);
            
            if (!token) {
                return res.status(404).json({ error: 'Token not found' });
            }
            
            token.flagSecurity(reason || 'Manually revoked', 'unauthorizedAccess');
            await token.save();
            
            console.log(`🚫 Token revoked: ${token.token.substring(0, 8)}... - Reason: ${reason}`);
            
            res.json({ 
                success: true, 
                message: 'Token revoked successfully',
                tokenId: token._id
            });
        } else {
            res.status(503).json({ error: 'Database not available' });
        }
    } catch (error) {
        console.error('Error revoking token:', error);
        res.status(500).json({ error: 'Failed to revoke token' });
    }
});

// Get license information and activations
app.get('/api/security/licenses', async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const licenses = await License.find()
                .sort({ createdAt: -1 })
                .limit(100);
            
            res.json({
                licenses,
                summary: {
                    total: licenses.length,
                    active: licenses.filter(license => license.status === 'active').length,
                    expired: licenses.filter(license => license.expiresAt < new Date()).length,
                    suspended: licenses.filter(license => license.status === 'suspended').length,
                    totalActivations: licenses.reduce((sum, license) => sum + license.activationCount, 0)
                }
            });
        } else {
            res.json({ licenses: [], summary: { total: 0, active: 0, expired: 0, suspended: 0, totalActivations: 0 } });
        }
    } catch (error) {
        console.error('Error fetching license information:', error);
        res.status(500).json({ error: 'Failed to fetch license information' });
    }
});

// Deactivate license on specific device
app.post('/api/license/deactivate', async (req, res) => {
    try {
        const { licenseKey, deviceId } = req.body;
        
        if (!licenseKey || !deviceId) {
            return res.status(400).json({ error: 'License key and device ID are required' });
        }
        
        if (mongoose.connection.readyState === 1) {
            const license = await License.findOne({ licenseKey });
            
            if (!license) {
                return res.status(404).json({ error: 'License not found' });
            }
            
            try {
                const result = license.deactivate(deviceId);
                await license.save();
                
                console.log(`🔓 License deactivated: ${licenseKey} from device ${deviceId}`);
                
                res.json({
                    success: true,
                    message: result.message,
                    remainingActivations: license.maxActivations - license.activationCount
                });
            } catch (deactivationError) {
                return res.status(400).json({ error: deactivationError.message });
            }
        } else {
            res.status(503).json({ error: 'Database not available' });
        }
    } catch (error) {
        console.error('Error deactivating license:', error);
        res.status(500).json({ error: 'License deactivation failed' });
    }
});

// Get download statistics for a specific order
app.get('/api/downloads/stats/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        if (mongoose.connection.readyState === 1) {
            const downloadLogs = await DownloadLog.find({ orderId });
            const downloadTokens = await DownloadToken.find({ orderId });
            
            const stats = {
                totalDownloads: downloadLogs.length,
                successfulDownloads: downloadLogs.filter(log => log.success).length,
                failedDownloads: downloadLogs.filter(log => !log.success).length,
                uniqueIPs: [...new Set(downloadLogs.map(log => log.clientInfo?.ip))].length,
                activeTokens: downloadTokens.filter(token => token.isActive).length,
                expiredTokens: downloadTokens.filter(token => token.expiresAt < new Date()).length,
                downloadHistory: downloadLogs.map(log => ({
                    timestamp: log.downloadedAt,
                    success: log.success,
                    ip: log.clientInfo?.ip,
                    userAgent: log.clientInfo?.userAgent,
                    errorMessage: log.errorMessage
                }))
            };
            
            res.json(stats);
        } else {
            // Fallback to in-memory service stats
            const stats = DigitalDeliveryService.getDownloadStats(orderId);
            res.json(stats);
        }
    } catch (error) {
        console.error('Error fetching download stats:', error);
        res.status(500).json({ error: 'Failed to fetch download statistics' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured',
        digitalDelivery: 'enabled',
        security: {
            rateLimiting: 'enabled',
            ipLogging: 'enabled',
            antiPiracy: 'enabled',
            tokenValidation: 'enabled',
            accessCodes: 'enabled'
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Enhanced Commerce Dashboard running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🛍️  Store: http://localhost:${PORT}`);
    console.log(`\n🔐 SECURITY FEATURES ENABLED:`);
    console.log(`   ✅ Secure Digital Delivery`);
    console.log(`   ✅ Expiring Download Links`);
    console.log(`   ✅ Email Delivery with Access Codes`);
    console.log(`   ✅ License Generation & Validation`);
    console.log(`   ✅ Digital Watermarking`);
    console.log(`   ✅ Download Logging & Monitoring`);
    console.log(`   ✅ Rate Limiting & Anti-Piracy`);
    console.log(`   ✅ IP Logging & Suspicious Activity Detection`);
    console.log(`   ✅ Access Tokenization`);
    console.log(`\n🔧 SERVICE STATUS:`);
    console.log(`   💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
    console.log(`   📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'}`);
    console.log(`   📧 Email: ${process.env.EMAIL_USER ? 'CONFIGURED' : 'FALLBACK MODE'}`);
    console.log(`\n🛡️  API ENDPOINTS:`);
    console.log(`   GET  /api/download/:token?code=ACCESS_CODE`);
    console.log(`   POST /api/validate-license`);
    console.log(`   GET  /api/security/downloads`);
    console.log(`   GET  /api/security/tokens`);
    console.log(`   GET  /api/security/licenses`);
    console.log(`   POST /api/security/revoke-token`);
    console.log(`   GET  /api/downloads/stats/:orderId`);
});
