# Trading Bot Routes

from flask import Blueprint, request, jsonify, session
import json
import uuid
from datetime import datetime
import ccxt

trading_bp = Blueprint('trading', __name__)

# Mock exchange for demonstration
class MockExchange:
    def __init__(self):
        self.balance = {
            'USDT': 10000.0,
            'BTC': 0.5,
            'ETH': 2.0
        }
        self.orders = []
        self.trades = []
    
    def fetch_ticker(self, symbol):
        # Mock price data
        prices = {
            'BTC/USDT': {'last': 45000.0, 'bid': 44995.0, 'ask': 45005.0},
            'ETH/USDT': {'last': 3200.0, 'bid': 3198.0, 'ask': 3202.0},
            'ADA/USDT': {'last': 0.85, 'bid': 0.849, 'ask': 0.851}
        }
        return prices.get(symbol, {'last': 100.0, 'bid': 99.5, 'ask': 100.5})
    
    def create_market_buy_order(self, symbol, amount):
        ticker = self.fetch_ticker(symbol)
        price = ticker['ask']
        cost = amount * price
        
        base, quote = symbol.split('/')
        
        if self.balance.get(quote, 0) >= cost:
            self.balance[quote] -= cost
            self.balance[base] = self.balance.get(base, 0) + amount
            
            order = {
                'id': str(uuid.uuid4()),
                'symbol': symbol,
                'side': 'buy',
                'amount': amount,
                'price': price,
                'cost': cost,
                'timestamp': datetime.now().isoformat(),
                'status': 'closed'
            }
            self.orders.append(order)
            self.trades.append(order)
            return order
        else:
            raise Exception("Insufficient balance")
    
    def create_market_sell_order(self, symbol, amount):
        ticker = self.fetch_ticker(symbol)
        price = ticker['bid']
        cost = amount * price
        
        base, quote = symbol.split('/')
        
        if self.balance.get(base, 0) >= amount:
            self.balance[base] -= amount
            self.balance[quote] = self.balance.get(quote, 0) + cost
            
            order = {
                'id': str(uuid.uuid4()),
                'symbol': symbol,
                'side': 'sell',
                'amount': amount,
                'price': price,
                'cost': cost,
                'timestamp': datetime.now().isoformat(),
                'status': 'closed'
            }
            self.orders.append(order)
            self.trades.append(order)
            return order
        else:
            raise Exception("Insufficient balance")
    
    def fetch_balance(self):
        return {
            'free': self.balance.copy(),
            'used': {k: 0 for k in self.balance.keys()},
            'total': self.balance.copy()
        }

# Global mock exchange instance
mock_exchange = MockExchange()

@trading_bp.route('/strategies', methods=['GET'])
def get_strategies():
    """Get available trading strategies"""
    strategies = [
        {
            'id': 'sma_crossover',
            'name': 'Simple Moving Average Crossover',
            'description': 'Buy when short MA crosses above long MA, sell when it crosses below',
            'risk_level': 'Medium',
            'parameters': {
                'short_period': 10,
                'long_period': 30,
                'stop_loss': 5,
                'take_profit': 10
            }
        },
        {
            'id': 'rsi_oversold',
            'name': 'RSI Oversold/Overbought',
            'description': 'Buy when RSI < 30 (oversold), sell when RSI > 70 (overbought)',
            'risk_level': 'Low',
            'parameters': {
                'rsi_period': 14,
                'oversold_threshold': 30,
                'overbought_threshold': 70,
                'stop_loss': 3,
                'take_profit': 8
            }
        },
        {
            'id': 'arbitrage',
            'name': 'Exchange Arbitrage',
            'description': 'Profit from price differences between exchanges',
            'risk_level': 'Low',
            'parameters': {
                'min_profit_threshold': 0.5,
                'max_position_size': 1000,
                'execution_delay': 1
            }
        },
        {
            'id': 'grid_trading',
            'name': 'Grid Trading',
            'description': 'Place buy and sell orders at regular intervals around current price',
            'risk_level': 'Medium',
            'parameters': {
                'grid_size': 10,
                'grid_spacing': 1,
                'total_investment': 1000
            }
        }
    ]
    return jsonify(strategies)

@trading_bp.route('/symbols', methods=['GET'])
def get_trading_symbols():
    """Get available trading symbols"""
    symbols = [
        {'symbol': 'BTC/USDT', 'name': 'Bitcoin', 'price': 45000.0, 'change': '+2.5%'},
        {'symbol': 'ETH/USDT', 'name': 'Ethereum', 'price': 3200.0, 'change': '+1.8%'},
        {'symbol': 'ADA/USDT', 'name': 'Cardano', 'price': 0.85, 'change': '-0.5%'},
        {'symbol': 'DOT/USDT', 'name': 'Polkadot', 'price': 25.50, 'change': '+3.2%'},
        {'symbol': 'LINK/USDT', 'name': 'Chainlink', 'price': 28.75, 'change': '+1.1%'}
    ]
    return jsonify(symbols)

@trading_bp.route('/execute', methods=['POST'])
def execute_trade():
    """Execute a manual trade"""
    data = request.get_json()
    
    try:
        symbol = data.get('symbol')
        side = data.get('side')  # 'buy' or 'sell'
        amount = float(data.get('amount'))
        
        if side == 'buy':
            order = mock_exchange.create_market_buy_order(symbol, amount)
        else:
            order = mock_exchange.create_market_sell_order(symbol, amount)
        
        return jsonify({
            'success': True,
            'order': order,
            'message': f'Successfully executed {side} order for {amount} {symbol}'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@trading_bp.route('/balance', methods=['GET'])
def get_balance():
    """Get current account balance"""
    balance = mock_exchange.fetch_balance()
    return jsonify(balance)

@trading_bp.route('/orders', methods=['GET'])
def get_orders():
    """Get order history"""
    return jsonify(mock_exchange.orders)

@trading_bp.route('/trades', methods=['GET'])
def get_trades():
    """Get trade history"""
    return jsonify(mock_exchange.trades)

@trading_bp.route('/price/<symbol>', methods=['GET'])
def get_price(symbol):
    """Get current price for a symbol"""
    try:
        ticker = mock_exchange.fetch_ticker(symbol)
        return jsonify(ticker)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

