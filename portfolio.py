# Portfolio Management Routes

from flask import Blueprint, request, jsonify, session
import json
from datetime import datetime, timedelta
import random

portfolio_bp = Blueprint('portfolio', __name__)

@portfolio_bp.route('/overview', methods=['GET'])
def get_portfolio_overview():
    """Get portfolio overview with performance metrics"""
    
    # Mock portfolio data
    portfolio_data = {
        'total_value': 12450.75,
        'total_invested': 10000.00,
        'total_profit_loss': 2450.75,
        'profit_loss_percentage': 24.51,
        'daily_change': 156.23,
        'daily_change_percentage': 1.27,
        'assets': [
            {
                'symbol': 'BTC',
                'name': 'Bitcoin',
                'amount': 0.28,
                'value': 12600.00,
                'percentage': 85.2,
                'profit_loss': 1800.00,
                'profit_loss_percentage': 16.67
            },
            {
                'symbol': 'ETH',
                'name': 'Ethereum',
                'amount': 1.5,
                'value': 4800.00,
                'percentage': 32.5,
                'profit_loss': 450.00,
                'profit_loss_percentage': 10.34
            },
            {
                'symbol': 'USDT',
                'name': 'Tether',
                'amount': 2250.75,
                'value': 2250.75,
                'percentage': 15.2,
                'profit_loss': 0.00,
                'profit_loss_percentage': 0.00
            }
        ]
    }
    
    return jsonify(portfolio_data)

@portfolio_bp.route('/performance', methods=['GET'])
def get_portfolio_performance():
    """Get portfolio performance over time"""
    
    # Generate mock performance data for the last 30 days
    performance_data = []
    base_value = 10000
    
    for i in range(30):
        date = datetime.now() - timedelta(days=29-i)
        # Simulate some volatility
        change = random.uniform(-0.05, 0.08)  # -5% to +8% daily change
        base_value *= (1 + change)
        
        performance_data.append({
            'date': date.strftime('%Y-%m-%d'),
            'value': round(base_value, 2),
            'profit_loss': round(base_value - 10000, 2),
            'profit_loss_percentage': round(((base_value - 10000) / 10000) * 100, 2)
        })
    
    return jsonify(performance_data)

@portfolio_bp.route('/transactions', methods=['GET'])
def get_transactions():
    """Get transaction history"""
    
    # Mock transaction data
    transactions = [
        {
            'id': 'tx_001',
            'type': 'buy',
            'symbol': 'BTC/USDT',
            'amount': 0.1,
            'price': 44500.00,
            'value': 4450.00,
            'fee': 4.45,
            'timestamp': '2024-01-20T10:30:00Z',
            'status': 'completed'
        },
        {
            'id': 'tx_002',
            'type': 'sell',
            'symbol': 'ETH/USDT',
            'amount': 0.5,
            'price': 3150.00,
            'value': 1575.00,
            'fee': 1.58,
            'timestamp': '2024-01-19T15:45:00Z',
            'status': 'completed'
        },
        {
            'id': 'tx_003',
            'type': 'buy',
            'symbol': 'ETH/USDT',
            'amount': 1.0,
            'price': 3100.00,
            'value': 3100.00,
            'fee': 3.10,
            'timestamp': '2024-01-18T09:15:00Z',
            'status': 'completed'
        },
        {
            'id': 'tx_004',
            'type': 'buy',
            'symbol': 'BTC/USDT',
            'amount': 0.18,
            'price': 43800.00,
            'value': 7884.00,
            'fee': 7.88,
            'timestamp': '2024-01-17T14:20:00Z',
            'status': 'completed'
        }
    ]
    
    return jsonify(transactions)

@portfolio_bp.route('/allocation', methods=['GET'])
def get_asset_allocation():
    """Get current asset allocation"""
    
    allocation = [
        {'symbol': 'BTC', 'percentage': 52.3, 'value': 6500.00, 'target': 50.0},
        {'symbol': 'ETH', 'percentage': 25.7, 'value': 3200.00, 'target': 30.0},
        {'symbol': 'USDT', 'percentage': 18.1, 'value': 2250.75, 'target': 15.0},
        {'symbol': 'ADA', 'percentage': 2.4, 'value': 300.00, 'target': 3.0},
        {'symbol': 'DOT', 'percentage': 1.5, 'value': 200.00, 'target': 2.0}
    ]
    
    return jsonify(allocation)

@portfolio_bp.route('/rebalance', methods=['POST'])
def rebalance_portfolio():
    """Rebalance portfolio to target allocation"""
    
    data = request.get_json()
    target_allocation = data.get('allocation', [])
    
    # Mock rebalancing logic
    rebalance_actions = []
    
    for asset in target_allocation:
        symbol = asset['symbol']
        target_percentage = asset['target_percentage']
        current_percentage = asset.get('current_percentage', 0)
        
        if abs(target_percentage - current_percentage) > 1:  # 1% threshold
            action = 'buy' if target_percentage > current_percentage else 'sell'
            amount = abs(target_percentage - current_percentage) * 100  # Mock calculation
            
            rebalance_actions.append({
                'symbol': symbol,
                'action': action,
                'amount': amount,
                'reason': f'Adjust from {current_percentage}% to {target_percentage}%'
            })
    
    return jsonify({
        'success': True,
        'actions': rebalance_actions,
        'estimated_cost': sum(action['amount'] for action in rebalance_actions) * 0.001  # Mock fee
    })

@portfolio_bp.route('/risk-metrics', methods=['GET'])
def get_risk_metrics():
    """Get portfolio risk metrics"""
    
    risk_metrics = {
        'sharpe_ratio': 1.85,
        'max_drawdown': -8.5,
        'volatility': 15.2,
        'beta': 1.12,
        'var_95': -2.3,  # Value at Risk (95% confidence)
        'risk_score': 6.5,  # Out of 10
        'diversification_score': 7.8,  # Out of 10
        'correlation_matrix': {
            'BTC': {'BTC': 1.0, 'ETH': 0.75, 'USDT': 0.05},
            'ETH': {'BTC': 0.75, 'ETH': 1.0, 'USDT': 0.03},
            'USDT': {'BTC': 0.05, 'ETH': 0.03, 'USDT': 1.0}
        }
    }
    
    return jsonify(risk_metrics)

