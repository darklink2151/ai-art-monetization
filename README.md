# Digital Marketplace Platform

A comprehensive digital marketplace platform specializing in secure digital product delivery, with advanced features for software licensing, subscription management, and anti-piracy protection. Built for professional deployment with enterprise-grade security.

## 🎯 Digital Product Focus

This platform is specifically designed for selling:
- **Software & Applications**: With license key generation and device activation tracking
- **Digital Content**: E-books, courses, media files with secure delivery
- **Subscription Services**: Recurring billing for software access, content libraries
- **Digital Downloads**: Secure, time-limited download links with access codes
- **Hybrid Products**: Combining digital and physical product sales

## 🚀 Key Features

### 💳 Payment & Commerce
- **Stripe Integration**: Complete payment processing with webhooks
- **Multiple Product Types**: Digital, physical, and subscription products
- **Checkout Sessions**: Optimized for conversion with Stripe Checkout
- **Payment Intents**: Support for complex payment flows
- **Multi-Currency**: Global payment support

### 🔐 Digital Delivery & Security
- **Secure File Delivery**: Time-limited, encrypted download tokens
- **Access Code Protection**: Email-based verification for downloads
- **Download Monitoring**: Track and limit download attempts
- **Anti-Piracy Features**: VPN detection, bot protection, suspicious activity monitoring
- **Digital Watermarking**: Embed customer information in high-value files
- **Rate Limiting**: Prevent abuse and automated attacks

### 🔑 License Management
- **Automated License Generation**: Unique license keys for software products
- **Device Activation Tracking**: Monitor and control software installations
- **License Validation API**: Real-time license verification
- **Activation Limits**: Control how many devices can use each license
- **License Analytics**: Track usage patterns and compliance

### 📊 Analytics & Monitoring
- **Real-time Dashboard**: Live order and download analytics
- **Security Monitoring**: Track download patterns and security threats
- **Customer Analytics**: Understand purchasing behavior
- **Revenue Tracking**: Detailed financial reporting
- **Export Capabilities**: CSV exports for external analysis

### 📧 Communication
- **Automated Email Delivery**: Instant download instructions with access codes
- **License Notifications**: Activation confirmations and alerts
- **Order Confirmations**: Professional purchase receipts
- **Security Alerts**: Automated threat notifications

## 🛠️ Tech Stack

### Backend
- **Node.js with Express**: High-performance server framework
- **MongoDB with Mongoose**: Scalable document database
- **Stripe SDK**: Complete payment processing
- **Nodemailer**: Professional email delivery
- **Express Rate Limit**: DDoS and abuse protection

### Frontend
- **Vanilla JavaScript**: Lightweight, fast-loading interface
- **Responsive Design**: Mobile-first, accessible UI
- **Progressive Enhancement**: Works with JavaScript disabled
- **Real-time Updates**: WebSocket integration for live data

### Security
- **Helmet.js**: Security headers and OWASP protection
- **HTTPS Enforcement**: SSL/TLS encryption
- **Input Validation**: Comprehensive request sanitization
- **IP Logging**: Track and analyze access patterns
- **Token-based Authentication**: Secure API access

## 📦 Installation

1. **Clone or download this project**
   ```bash
   cd commerce-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
   PORT=3000
   ```

4. **Update Stripe configuration**
   - Replace the Stripe link in `public/index.html` and `public/dashboard.html` with your link:
     `https://buy.stripe.com/aFaaEP0HX3bs9yV7la5c401`
   - Add your Stripe publishable key in `public/js/store.js`

## 🚀 Local Development

```bash
# Start the server
npm start

# Or with auto-restart during development
npm run dev
```

Visit:
- **Store**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard

## 🌊 DigitalOcean Deployment

### Option 1: Manual Deployment

1. **Create a DigitalOcean Droplet**
   - Choose Ubuntu 22.04
   - Basic plan ($4-6/month is sufficient)

2. **Connect to your droplet**
   ```bash
   ssh root@your_droplet_ip
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   apt-get install -y nodejs
   ```

4. **Upload your code**
   ```bash
   # Clone your repository or upload files
   git clone your-repo-url
   cd commerce-dashboard
   npm install
   ```

5. **Set up PM2 (Process Manager)**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "commerce-dashboard"
   pm2 startup
   pm2 save
   ```

6. **Set up Nginx (Reverse Proxy)**
   ```bash
   apt-get install nginx
   ```

   Create `/etc/nginx/sites-available/commerce-dashboard`:
   ```nginx
   server {
       listen 80;
       server_name your_domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable the site:
   ```bash
   ln -s /etc/nginx/sites-available/commerce-dashboard /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

### Option 2: DigitalOcean App Platform

1. **Connect your repository** to DigitalOcean App Platform
2. **Configure build settings**:
   - Build Command: `npm install`
   - Run Command: `npm start`
3. **Add environment variables** in the app settings
4. **Deploy** - DigitalOcean handles everything else!

## 🔧 Configuration

### Environment Variables

```env
# Required
STRIPE_SECRET_KEY=sk_test_...
PORT=3000

# Optional
NODE_ENV=production
```

### Stripe Setup

1. **Get your Stripe keys** from https://stripe.com/docs/keys
2. **Update the payment link** in both HTML files
3. **Add your publishable key** in `store.js`

## 📊 Features Overview

### Store Frontend
- Product display
- Shopping cart functionality
- Stripe payment integration
- Responsive design
- Quick purchase options

### Dashboard
- Real-time analytics
- Order management
- Status updates
- Data export
- System monitoring

## 🔒 Security Notes

- Always use HTTPS in production
- Store Stripe keys in environment variables
- Regularly update dependencies
- Use strong passwords for server access
- Enable DigitalOcean firewall

## 💰 Cost Breakdown (DigitalOcean)

- **Basic Droplet**: $6/month
- **Domain** (optional): ~$12/year
- **SSL Certificate**: Free (Let's Encrypt)
- **Total**: ~$6-8/month

## 🛠️ Customization

### Adding Products
Edit `data/products.json` or modify the default products in `server.js`

### Styling
Modify `public/css/style.css` for custom branding

### Features
Add new API endpoints in `server.js` and corresponding frontend code

## 📚 API Endpoints

- `GET /` - Store homepage
- `GET /dashboard` - Dashboard page
- `GET /api/products` - Get all products
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `GET /api/stats` - Get dashboard statistics
- `POST /api/create-payment-intent` - Create Stripe payment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this for personal or commercial projects!

## 🆘 Support

- Check the console for error messages
- Ensure all environment variables are set
- Verify Stripe keys are correct
- Check DigitalOcean droplet resources

---

**Your Stripe Link**: https://buy.stripe.com/aFaaEP0HX3bs9yV7la5c401

Ready to deploy! 🚀 