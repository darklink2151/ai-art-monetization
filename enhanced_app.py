# Enhanced AI Art Generator with Monetization Features

from flask import Flask, render_template, request, send_file, jsonify, session, redirect, url_for, flash
from flask_cors import CORS
from PIL import Image
import io
import os
import json
import uuid
from datetime import datetime, timedelta
from model import StableDiffusionModel
import stripe

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Change this in production
CORS(app)

# Stripe configuration (use test keys for development)
stripe.api_key = "sk_test_..."  # Replace with your Stripe secret key
STRIPE_PUBLISHABLE_KEY = "pk_test_..."  # Replace with your Stripe publishable key

# Initialize the AI model
model = StableDiffusionModel()

# User data storage (in production, use a proper database)
USERS_FILE = 'users.json'
GENERATIONS_FILE = 'generations.json'

def load_data(filename):
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            return json.load(f)
    return {}

def save_data(filename, data):
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)

def get_user_data(user_id):
    users = load_data(USERS_FILE)
    return users.get(user_id, {
        'id': user_id,
        'email': '',
        'subscription_tier': 'free',
        'credits': 10,  # Free tier gets 10 credits to start
        'daily_generations': 0,
        'last_generation_date': '',
        'total_generations': 0,
        'created_at': datetime.now().isoformat()
    })

def save_user_data(user_id, user_data):
    users = load_data(USERS_FILE)
    users[user_id] = user_data
    save_data(USERS_FILE, users)

def get_tier_limits(tier):
    limits = {
        'free': {
            'daily_limit': 5,
            'max_resolution': '512x512',
            'styles': ['photorealistic', 'fantasy', 'abstract'],
            'watermark': True,
            'commercial_use': False
        },
        'basic': {
            'daily_limit': 50,
            'max_resolution': '1024x1024',
            'styles': model.get_available_styles(),
            'watermark': False,
            'commercial_use': True
        },
        'pro': {
            'daily_limit': -1,  # Unlimited
            'max_resolution': '2048x2048',
            'styles': model.get_available_styles(),
            'watermark': False,
            'commercial_use': True
        }
    }
    return limits.get(tier, limits['free'])

def can_generate(user_data):
    today = datetime.now().strftime('%Y-%m-%d')
    tier_limits = get_tier_limits(user_data['subscription_tier'])
    
    # Reset daily count if it's a new day
    if user_data.get('last_generation_date') != today:
        user_data['daily_generations'] = 0
        user_data['last_generation_date'] = today
    
    # Check daily limit (unlimited for pro tier)
    if tier_limits['daily_limit'] != -1 and user_data['daily_generations'] >= tier_limits['daily_limit']:
        return False, "Daily generation limit reached"
    
    # Check credits for pay-per-use
    if user_data['credits'] <= 0:
        return False, "Insufficient credits"
    
    return True, "OK"

@app.route('/')
def index():
    user_id = session.get('user_id')
    if not user_id:
        user_id = str(uuid.uuid4())
        session['user_id'] = user_id
    
    user_data = get_user_data(user_id)
    tier_limits = get_tier_limits(user_data['subscription_tier'])
    
    return render_template('enhanced_index.html', 
                         styles=tier_limits['styles'],
                         resolutions=model.get_available_resolutions(),
                         user_data=user_data,
                         tier_limits=tier_limits,
                         stripe_key=STRIPE_PUBLISHABLE_KEY)

@app.route('/generate', methods=['POST'])
def generate_image():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'User session not found'}), 400
    
    user_data = get_user_data(user_id)
    can_gen, message = can_generate(user_data)
    
    if not can_gen:
        return jsonify({'error': message}), 403
    
    prompt = request.form['prompt']
    style = request.form.get('style', 'photorealistic')
    resolution = request.form.get('resolution', '512x512')
    
    tier_limits = get_tier_limits(user_data['subscription_tier'])
    
    # Validate style access
    if style not in tier_limits['styles']:
        return jsonify({'error': 'Style not available in your tier'}), 403
    
    # Validate resolution access
    max_res = tier_limits['max_resolution']
    max_pixels = int(max_res.split('x')[0]) * int(max_res.split('x')[1])
    req_pixels = int(resolution.split('x')[0]) * int(resolution.split('x')[1])
    
    if req_pixels > max_pixels:
        return jsonify({'error': f'Resolution not available in your tier. Max: {max_res}'}), 403
    
    try:
        # Generate the image
        img = model.generate_image(prompt, style, resolution)
        
        # Add watermark for free tier
        if tier_limits['watermark']:
            img = add_watermark(img)
        
        # Update user statistics
        user_data['daily_generations'] += 1
        user_data['total_generations'] += 1
        user_data['credits'] -= 1
        user_data['last_generation_date'] = datetime.now().strftime('%Y-%m-%d')
        save_user_data(user_id, user_data)
        
        # Save generation record
        generation_record = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'prompt': prompt,
            'style': style,
            'resolution': resolution,
            'timestamp': datetime.now().isoformat()
        }
        
        generations = load_data(GENERATIONS_FILE)
        if user_id not in generations:
            generations[user_id] = []
        generations[user_id].append(generation_record)
        save_data(GENERATIONS_FILE, generations)
        
        # Return image
        img_io = io.BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)
        
        return send_file(img_io, mimetype='image/png', as_attachment=True, 
                        download_name=f'ai_art_{generation_record["id"]}.png')
        
    except Exception as e:
        return jsonify({'error': f'Generation failed: {str(e)}'}), 500

def add_watermark(img):
    """Add watermark to free tier images"""
    from PIL import ImageDraw, ImageFont
    
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", 24)
    except IOError:
        font = ImageFont.load_default()
    
    watermark_text = "AI Art Generator - Upgrade for watermark-free images"
    
    # Calculate position (bottom right)
    bbox = draw.textbbox((0, 0), watermark_text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = img.width - text_width - 10
    y = img.height - text_height - 10
    
    # Add semi-transparent background
    draw.rectangle([x-5, y-5, x+text_width+5, y+text_height+5], fill=(0, 0, 0, 128))
    draw.text((x, y), watermark_text, fill=(255, 255, 255, 200), font=font)
    
    return img

@app.route('/api/user-status')
def user_status():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'No user session'}), 400
    
    user_data = get_user_data(user_id)
    tier_limits = get_tier_limits(user_data['subscription_tier'])
    can_gen, message = can_generate(user_data)
    
    return jsonify({
        'user_data': user_data,
        'tier_limits': tier_limits,
        'can_generate': can_gen,
        'message': message
    })

@app.route('/api/purchase-credits', methods=['POST'])
def purchase_credits():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'No user session'}), 400
    
    credit_package = request.json.get('package')
    
    packages = {
        'small': {'credits': 100, 'price': 500},  # $5.00
        'medium': {'credits': 500, 'price': 2000},  # $20.00
        'large': {'credits': 1200, 'price': 4000}  # $40.00
    }
    
    if credit_package not in packages:
        return jsonify({'error': 'Invalid package'}), 400
    
    package_info = packages[credit_package]
    
    try:
        # Create Stripe checkout session
        session_stripe = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f'{package_info["credits"]} AI Art Credits',
                        'description': f'Credits for generating AI art images'
                    },
                    'unit_amount': package_info['price']
                },
                'quantity': 1
            }],
            mode='payment',
            success_url=request.host_url + 'success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=request.host_url + 'cancel',
            metadata={
                'user_id': user_id,
                'credits': package_info['credits'],
                'type': 'credits'
            }
        )
        
        return jsonify({'checkout_url': session_stripe.url})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/subscribe', methods=['POST'])
def subscribe():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'No user session'}), 400
    
    tier = request.json.get('tier')
    
    subscription_plans = {
        'basic': {'price': 999, 'name': 'Basic Creator'},  # $9.99
        'pro': {'price': 2999, 'name': 'Pro Artist'}  # $29.99
    }
    
    if tier not in subscription_plans:
        return jsonify({'error': 'Invalid subscription tier'}), 400
    
    plan_info = subscription_plans[tier]
    
    try:
        # Create Stripe checkout session for subscription
        session_stripe = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f'{plan_info["name"]} Subscription',
                        'description': f'Monthly subscription to AI Art Generator'
                    },
                    'unit_amount': plan_info['price'],
                    'recurring': {'interval': 'month'}
                },
                'quantity': 1
            }],
            mode='subscription',
            success_url=request.host_url + 'success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=request.host_url + 'cancel',
            metadata={
                'user_id': user_id,
                'tier': tier,
                'type': 'subscription'
            }
        )
        
        return jsonify({'checkout_url': session_stripe.url})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/success')
def success():
    session_id = request.args.get('session_id')
    if session_id:
        try:
            # Retrieve the session from Stripe
            session_stripe = stripe.checkout.Session.retrieve(session_id)
            user_id = session_stripe.metadata.get('user_id')
            
            if user_id:
                user_data = get_user_data(user_id)
                
                if session_stripe.metadata.get('type') == 'credits':
                    # Add credits to user account
                    credits = int(session_stripe.metadata.get('credits', 0))
                    user_data['credits'] += credits
                    flash(f'Successfully purchased {credits} credits!', 'success')
                    
                elif session_stripe.metadata.get('type') == 'subscription':
                    # Update user subscription tier
                    tier = session_stripe.metadata.get('tier')
                    user_data['subscription_tier'] = tier
                    user_data['credits'] += 100  # Bonus credits for new subscribers
                    flash(f'Successfully subscribed to {tier} tier!', 'success')
                
                save_user_data(user_id, user_data)
                
        except Exception as e:
            flash(f'Error processing payment: {str(e)}', 'error')
    
    return redirect(url_for('index'))

@app.route('/cancel')
def cancel():
    flash('Payment was cancelled.', 'info')
    return redirect(url_for('index'))

@app.route('/api/generation-history')
def generation_history():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'No user session'}), 400
    
    generations = load_data(GENERATIONS_FILE)
    user_generations = generations.get(user_id, [])
    
    # Return last 20 generations
    return jsonify(user_generations[-20:])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

