# Market Data Routes

from flask import Blueprint, request, jsonify
import json
import random
from datetime import datetime, timedelta

market_data_bp = Blueprint('market_data', __name__)

@market_data_bp.route('/prices', methods=['GET'])
def get_market_prices():
    """Get current market prices for major cryptocurrencies"""
    
    # Mock real-time price data
    prices = [
        {
            'symbol': 'BTC/USDT',
            'name': 'Bitcoin',
            'price': 45123.45,
            'change_24h': 2.34,
            'change_percentage_24h': 5.47,
            'volume_24h': 28500000000,
            'market_cap': 885000000000,
            'last_updated': datetime.now().isoformat()
        },
        {
            'symbol': 'ETH/USDT',
            'name': 'Ethereum',
            'price': 3187.92,
            'change_24h': 45.67,
            'change_percentage_24h': 1.45,
            'volume_24h': 15200000000,
            'market_cap': 383000000000,
            'last_updated': datetime.now().isoformat()
        },
        {
            'symbol': 'ADA/USDT',
            'name': 'Cardano',
            'price': 0.8456,
            'change_24h': -0.0234,
            'change_percentage_24h': -2.69,
            'volume_24h': 890000000,
            'market_cap': 28500000000,
            'last_updated': datetime.now().isoformat()
        },
        {
            'symbol': 'DOT/USDT',
            'name': 'Polkadot',
            'price': 25.67,
            'change_24h': 0.89,
            'change_percentage_24h': 3.59,
            'volume_24h': 1200000000,
            'market_cap': 25600000000,
            'last_updated': datetime.now().isoformat()
        }
    ]
    
    return jsonify(prices)

@market_data_bp.route('/chart/<symbol>', methods=['GET'])
def get_chart_data(symbol):
    """Get historical chart data for a symbol"""
    
    interval = request.args.get('interval', '1h')  # 1m, 5m, 15m, 1h, 4h, 1d
    limit = int(request.args.get('limit', 100))
    
    # Generate mock OHLCV data
    chart_data = []
    base_price = 45000 if 'BTC' in symbol else 3200 if 'ETH' in symbol else 100
    
    for i in range(limit):
        timestamp = datetime.now() - timedelta(hours=limit-i)
        
        # Simulate price movement
        change = random.uniform(-0.02, 0.02)  # ±2% change
        base_price *= (1 + change)
        
        # Generate OHLCV
        open_price = base_price
        high_price = open_price * (1 + random.uniform(0, 0.01))
        low_price = open_price * (1 - random.uniform(0, 0.01))
        close_price = open_price + random.uniform(-0.005, 0.005) * open_price
        volume = random.uniform(1000000, 10000000)
        
        chart_data.append({
            'timestamp': int(timestamp.timestamp() * 1000),
            'open': round(open_price, 2),
            'high': round(high_price, 2),
            'low': round(low_price, 2),
            'close': round(close_price, 2),
            'volume': round(volume, 2)
        })
        
        base_price = close_price
    
    return jsonify(chart_data)

@market_data_bp.route('/orderbook/<symbol>', methods=['GET'])
def get_orderbook(symbol):
    """Get order book data for a symbol"""
    
    base_price = 45000 if 'BTC' in symbol else 3200 if 'ETH' in symbol else 100
    
    # Generate mock order book
    bids = []
    asks = []
    
    for i in range(20):
        bid_price = base_price * (1 - (i + 1) * 0.0001)
        ask_price = base_price * (1 + (i + 1) * 0.0001)
        
        bid_amount = random.uniform(0.1, 5.0)
        ask_amount = random.uniform(0.1, 5.0)
        
        bids.append([round(bid_price, 2), round(bid_amount, 4)])
        asks.append([round(ask_price, 2), round(ask_amount, 4)])
    
    orderbook = {
        'symbol': symbol,
        'bids': bids,
        'asks': asks,
        'timestamp': int(datetime.now().timestamp() * 1000)
    }
    
    return jsonify(orderbook)

@market_data_bp.route('/trades/<symbol>', methods=['GET'])
def get_recent_trades(symbol):
    """Get recent trades for a symbol"""
    
    base_price = 45000 if 'BTC' in symbol else 3200 if 'ETH' in symbol else 100
    
    # Generate mock recent trades
    trades = []
    
    for i in range(50):
        timestamp = datetime.now() - timedelta(minutes=i)
        price = base_price * (1 + random.uniform(-0.001, 0.001))
        amount = random.uniform(0.01, 2.0)
        side = random.choice(['buy', 'sell'])
        
        trades.append({
            'id': f'trade_{i}',
            'timestamp': int(timestamp.timestamp() * 1000),
            'price': round(price, 2),
            'amount': round(amount, 4),
            'side': side,
            'cost': round(price * amount, 2)
        })
    
    return jsonify(trades)

@market_data_bp.route('/market-overview', methods=['GET'])
def get_market_overview():
    """Get overall market overview and statistics"""
    
    market_overview = {
        'total_market_cap': 1850000000000,
        'total_volume_24h': 89500000000,
        'btc_dominance': 47.8,
        'eth_dominance': 20.7,
        'active_cryptocurrencies': 2847,
        'market_cap_change_24h': 2.34,
        'fear_greed_index': 72,  # 0-100 scale
        'trending_coins': [
            {'symbol': 'SOL', 'name': 'Solana', 'change': '+15.67%'},
            {'symbol': 'AVAX', 'name': 'Avalanche', 'change': '+12.34%'},
            {'symbol': 'MATIC', 'name': 'Polygon', 'change': '+8.91%'}
        ],
        'top_gainers': [
            {'symbol': 'LUNA', 'change': '+25.67%'},
            {'symbol': 'ATOM', 'change': '+18.45%'},
            {'symbol': 'FTM', 'change': '+16.23%'}
        ],
        'top_losers': [
            {'symbol': 'DOGE', 'change': '-8.91%'},
            {'symbol': 'SHIB', 'change': '-6.78%'},
            {'symbol': 'LTC', 'change': '-5.45%'}
        ]
    }
    
    return jsonify(market_overview)

@market_data_bp.route('/news', methods=['GET'])
def get_market_news():
    """Get latest market news and updates"""
    
    news = [
        {
            'id': 'news_1',
            'title': 'Bitcoin Reaches New All-Time High Amid Institutional Adoption',
            'summary': 'Major corporations continue to add Bitcoin to their treasury reserves...',
            'source': 'CryptoNews',
            'published_at': '2024-01-20T10:30:00Z',
            'url': 'https://example.com/news/1',
            'sentiment': 'positive'
        },
        {
            'id': 'news_2',
            'title': 'Ethereum 2.0 Upgrade Shows Promising Results',
            'summary': 'The latest Ethereum upgrade has reduced gas fees significantly...',
            'source': 'BlockchainToday',
            'published_at': '2024-01-20T08:15:00Z',
            'url': 'https://example.com/news/2',
            'sentiment': 'positive'
        },
        {
            'id': 'news_3',
            'title': 'Regulatory Clarity Brings Stability to Crypto Markets',
            'summary': 'New regulations provide clearer guidelines for cryptocurrency trading...',
            'source': 'FinanceDaily',
            'published_at': '2024-01-19T16:45:00Z',
            'url': 'https://example.com/news/3',
            'sentiment': 'neutral'
        }
    ]
    
    return jsonify(news)

