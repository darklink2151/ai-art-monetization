# AI Art Generator Pro - Setup and Deployment Guide

## Quick Start

### 1. Install Dependencies
```bash
cd ai-art-generator
pip install -r requirements.txt
```

### 2. Configure Environment
Create a `.env` file in the project root:
```env
# Flask Configuration
FLASK_SECRET_KEY=your-secret-key-here
FLASK_ENV=development

# Stripe Configuration (get from https://stripe.com)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# AI Model Backend Configuration
AI_BACKEND=mock  # Options: mock, ollama, huggingface, local

# Ollama Configuration (if using Ollama)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llava

# Hugging Face Configuration (if using HF)
HF_TOKEN=your_huggingface_token
HF_MODEL_ID=runwayml/stable-diffusion-v1-5

# Local Model Configuration (if using local)
LOCAL_MODEL_ID=runwayml/stable-diffusion-v1-5
```

### 3. Run the Application
```bash
cd src
python enhanced_app.py
```

The application will be available at `http://localhost:5000`

## AI Model Integration Options

### Option 1: Ollama (Recommended for Local Development)
1. Install Ollama: https://ollama.ai/
2. Pull a vision model: `ollama pull llava`
3. Set `AI_BACKEND=ollama` in your `.env` file

### Option 2: Hugging Face Inference API
1. Get a Hugging Face token: https://huggingface.co/settings/tokens
2. Set `AI_BACKEND=huggingface` and add your token to `.env`

### Option 3: Local Stable Diffusion
1. Install additional dependencies:
   ```bash
   pip install torch diffusers transformers accelerate
   ```
2. Set `AI_BACKEND=local` in your `.env` file

### Option 4: Mock Backend (Default)
- No additional setup required
- Generates placeholder images for testing
- Perfect for development and UI testing

## Monetization Features

### Subscription Tiers
- **Free**: 5 daily generations, 512x512 max, watermarked
- **Basic Creator ($9.99/month)**: 50 daily generations, 1024x1024 max, no watermark
- **Pro Artist ($29.99/month)**: Unlimited generations, 2048x2048 max, priority queue

### Credit System
- Pay-per-generation option
- Credit packages: 100 ($5), 500 ($20), 1200 ($40)
- Credits never expire

### Payment Processing
- Stripe integration for subscriptions and one-time purchases
- Secure checkout with SCA compliance
- Automatic subscription management

## Deployment Options

### Option 1: DigitalOcean App Platform
1. Connect your GitHub repository
2. Set environment variables in the dashboard
3. Deploy with automatic scaling

### Option 2: Traditional VPS
1. Set up Ubuntu server
2. Install Python, pip, and dependencies
3. Use gunicorn + nginx for production
4. Set up SSL with Let's Encrypt

### Option 3: Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "enhanced_app:app"]
```

## Revenue Optimization Tips

### 1. Conversion Optimization
- A/B test pricing tiers
- Offer limited-time promotions
- Implement referral bonuses

### 2. User Retention
- Email marketing for inactive users
- Regular feature updates
- Community building

### 3. Upselling Strategies
- Show upgrade prompts at generation limits
- Highlight premium features
- Offer bulk credit discounts

### 4. Market Positioning
- Target digital artists and content creators
- Emphasize security and commercial licensing
- Showcase high-quality generation examples

## Technical Scaling

### Database Migration
Replace JSON file storage with PostgreSQL:
```python
from flask_sqlalchemy import SQLAlchemy

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:pass@localhost/aiart'
db = SQLAlchemy(app)
```

### Caching Layer
Add Redis for session and generation caching:
```python
from flask_caching import Cache

cache = Cache(app, config={'CACHE_TYPE': 'redis'})
```

### API Rate Limiting
Implement rate limiting for fair usage:
```python
from flask_limiter import Limiter

limiter = Limiter(app, key_func=get_remote_address)
```

## Security Considerations

### 1. Environment Variables
- Never commit API keys to version control
- Use strong secret keys
- Rotate keys regularly

### 2. Input Validation
- Sanitize user prompts
- Validate file uploads
- Implement CSRF protection

### 3. Payment Security
- Use Stripe's secure checkout
- Implement webhook verification
- Log all payment events

## Monitoring and Analytics

### Key Metrics to Track
- Daily/Monthly Active Users
- Conversion rates by tier
- Average revenue per user
- Generation success rates
- Customer acquisition cost

### Recommended Tools
- Google Analytics for web traffic
- Stripe Dashboard for revenue
- Sentry for error monitoring
- Custom dashboard for business metrics

## Support and Maintenance

### Regular Tasks
- Monitor generation queue performance
- Update AI models for better quality
- Analyze user feedback and feature requests
- Security updates and patches

### Customer Support
- Implement help desk system
- Create comprehensive FAQ
- Offer email and chat support
- Build user community forum

This setup provides a solid foundation for a profitable AI art generation business with room for growth and scaling.

