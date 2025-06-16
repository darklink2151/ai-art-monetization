# Trading Bot Strategy Testing and Optimization

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import random
import json

class TradingStrategy:
    """Base class for trading strategies"""
    
    def __init__(self, name, parameters=None):
        self.name = name
        self.parameters = parameters or {}
        self.trades = []
        self.balance = 10000  # Starting balance
        self.position = 0  # Current position
        self.entry_price = 0
        
    def generate_signal(self, data, index):
        """Generate trading signal based on strategy logic"""
        raise NotImplementedError
    
    def execute_trade(self, signal, price, timestamp):
        """Execute trade based on signal"""
        if signal == 'buy' and self.position == 0:
            # Buy signal - enter long position
            amount = self.balance * 0.95 / price  # Use 95% of balance
            self.position = amount
            self.entry_price = price
            self.balance -= amount * price
            
            trade = {
                'timestamp': timestamp,
                'action': 'buy',
                'price': price,
                'amount': amount,
                'balance': self.balance,
                'position_value': self.position * price
            }
            self.trades.append(trade)
            
        elif signal == 'sell' and self.position > 0:
            # Sell signal - exit long position
            self.balance += self.position * price
            
            trade = {
                'timestamp': timestamp,
                'action': 'sell',
                'price': price,
                'amount': self.position,
                'balance': self.balance,
                'position_value': 0,
                'profit_loss': (price - self.entry_price) * self.position
            }
            self.trades.append(trade)
            
            self.position = 0
            self.entry_price = 0
    
    def get_portfolio_value(self, current_price):
        """Get current portfolio value"""
        return self.balance + (self.position * current_price)

class SMAStrategy(TradingStrategy):
    """Simple Moving Average Crossover Strategy"""
    
    def __init__(self, short_period=10, long_period=30):
        super().__init__("SMA Crossover", {
            'short_period': short_period,
            'long_period': long_period
        })
        self.short_period = short_period
        self.long_period = long_period
    
    def generate_signal(self, data, index):
        if index < self.long_period:
            return 'hold'
        
        short_ma = data['close'].iloc[index-self.short_period:index].mean()
        long_ma = data['close'].iloc[index-self.long_period:index].mean()
        
        prev_short_ma = data['close'].iloc[index-self.short_period-1:index-1].mean()
        prev_long_ma = data['close'].iloc[index-self.long_period-1:index-1].mean()
        
        # Golden cross - short MA crosses above long MA
        if short_ma > long_ma and prev_short_ma <= prev_long_ma:
            return 'buy'
        # Death cross - short MA crosses below long MA
        elif short_ma < long_ma and prev_short_ma >= prev_long_ma:
            return 'sell'
        
        return 'hold'

class RSIStrategy(TradingStrategy):
    """RSI Oversold/Overbought Strategy"""
    
    def __init__(self, period=14, oversold=30, overbought=70):
        super().__init__("RSI Strategy", {
            'period': period,
            'oversold': oversold,
            'overbought': overbought
        })
        self.period = period
        self.oversold = oversold
        self.overbought = overbought
    
    def calculate_rsi(self, prices):
        """Calculate RSI indicator"""
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = np.mean(gains[-self.period:])
        avg_loss = np.mean(losses[-self.period:])
        
        if avg_loss == 0:
            return 100
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def generate_signal(self, data, index):
        if index < self.period + 1:
            return 'hold'
        
        prices = data['close'].iloc[:index].values
        rsi = self.calculate_rsi(prices)
        
        if rsi < self.oversold:
            return 'buy'
        elif rsi > self.overbought:
            return 'sell'
        
        return 'hold'

def generate_mock_price_data(days=365, initial_price=45000):
    """Generate mock cryptocurrency price data"""
    dates = pd.date_range(start=datetime.now() - timedelta(days=days), 
                         end=datetime.now(), freq='H')
    
    prices = []
    current_price = initial_price
    
    for i in range(len(dates)):
        # Add some trend and volatility
        trend = 0.0001  # Slight upward trend
        volatility = random.uniform(-0.02, 0.02)  # ±2% hourly volatility
        
        # Add some market cycles
        cycle = 0.001 * np.sin(i * 0.01)  # Long-term cycle
        
        change = trend + volatility + cycle
        current_price *= (1 + change)
        prices.append(current_price)
    
    data = pd.DataFrame({
        'timestamp': dates,
        'close': prices
    })
    
    # Add OHLV data
    data['open'] = data['close'].shift(1)
    data['high'] = data[['open', 'close']].max(axis=1) * (1 + np.random.uniform(0, 0.005, len(data)))
    data['low'] = data[['open', 'close']].min(axis=1) * (1 - np.random.uniform(0, 0.005, len(data)))
    data['volume'] = np.random.uniform(1000000, 10000000, len(data))
    
    return data.dropna()

def backtest_strategy(strategy, data):
    """Backtest a trading strategy"""
    print(f"Backtesting {strategy.name}...")
    
    for i in range(len(data)):
        signal = strategy.generate_signal(data, i)
        price = data.iloc[i]['close']
        timestamp = data.iloc[i]['timestamp']
        
        strategy.execute_trade(signal, price, timestamp)
    
    # Calculate performance metrics
    final_value = strategy.get_portfolio_value(data.iloc[-1]['close'])
    total_return = (final_value - 10000) / 10000 * 100
    
    # Calculate Sharpe ratio (simplified)
    if len(strategy.trades) > 1:
        returns = []
        for i in range(1, len(strategy.trades)):
            if 'profit_loss' in strategy.trades[i]:
                returns.append(strategy.trades[i]['profit_loss'] / 10000)
        
        if returns:
            sharpe_ratio = np.mean(returns) / np.std(returns) if np.std(returns) > 0 else 0
        else:
            sharpe_ratio = 0
    else:
        sharpe_ratio = 0
    
    # Calculate maximum drawdown
    portfolio_values = []
    for i in range(len(data)):
        if i < len(strategy.trades):
            portfolio_values.append(strategy.get_portfolio_value(data.iloc[i]['close']))
        else:
            portfolio_values.append(strategy.get_portfolio_value(data.iloc[i]['close']))
    
    peak = np.maximum.accumulate(portfolio_values)
    drawdown = (portfolio_values - peak) / peak
    max_drawdown = np.min(drawdown) * 100
    
    results = {
        'strategy_name': strategy.name,
        'parameters': strategy.parameters,
        'total_trades': len(strategy.trades),
        'final_value': final_value,
        'total_return': total_return,
        'sharpe_ratio': sharpe_ratio,
        'max_drawdown': max_drawdown,
        'win_rate': calculate_win_rate(strategy.trades)
    }
    
    return results

def calculate_win_rate(trades):
    """Calculate win rate from trades"""
    profitable_trades = 0
    total_trades = 0
    
    for trade in trades:
        if 'profit_loss' in trade:
            total_trades += 1
            if trade['profit_loss'] > 0:
                profitable_trades += 1
    
    return (profitable_trades / total_trades * 100) if total_trades > 0 else 0

def optimize_strategy_parameters():
    """Optimize strategy parameters using grid search"""
    print("Optimizing strategy parameters...")
    
    # Generate test data
    data = generate_mock_price_data(days=180)  # 6 months of data
    
    # SMA Strategy optimization
    sma_results = []
    for short in range(5, 21, 5):  # 5, 10, 15, 20
        for long in range(20, 51, 10):  # 20, 30, 40, 50
            if short < long:
                strategy = SMAStrategy(short_period=short, long_period=long)
                result = backtest_strategy(strategy, data)
                sma_results.append(result)
    
    # RSI Strategy optimization
    rsi_results = []
    for period in [10, 14, 21]:
        for oversold in [20, 30, 35]:
            for overbought in [65, 70, 80]:
                strategy = RSIStrategy(period=period, oversold=oversold, overbought=overbought)
                result = backtest_strategy(strategy, data)
                rsi_results.append(result)
    
    return sma_results, rsi_results

def create_performance_visualization(results, strategy_type):
    """Create performance visualization"""
    df = pd.DataFrame(results)
    
    plt.figure(figsize=(15, 10))
    
    # Plot 1: Total Return vs Sharpe Ratio
    plt.subplot(2, 2, 1)
    plt.scatter(df['total_return'], df['sharpe_ratio'], alpha=0.6)
    plt.xlabel('Total Return (%)')
    plt.ylabel('Sharpe Ratio')
    plt.title(f'{strategy_type} Strategy: Return vs Risk')
    plt.grid(True, alpha=0.3)
    
    # Plot 2: Total Return vs Max Drawdown
    plt.subplot(2, 2, 2)
    plt.scatter(df['max_drawdown'], df['total_return'], alpha=0.6, color='red')
    plt.xlabel('Max Drawdown (%)')
    plt.ylabel('Total Return (%)')
    plt.title(f'{strategy_type} Strategy: Return vs Drawdown')
    plt.grid(True, alpha=0.3)
    
    # Plot 3: Win Rate vs Total Return
    plt.subplot(2, 2, 3)
    plt.scatter(df['win_rate'], df['total_return'], alpha=0.6, color='green')
    plt.xlabel('Win Rate (%)')
    plt.ylabel('Total Return (%)')
    plt.title(f'{strategy_type} Strategy: Win Rate vs Return')
    plt.grid(True, alpha=0.3)
    
    # Plot 4: Parameter heatmap (for SMA strategy)
    if strategy_type == 'SMA':
        plt.subplot(2, 2, 4)
        # Create pivot table for heatmap
        pivot_data = []
        for result in results:
            pivot_data.append({
                'short_period': result['parameters']['short_period'],
                'long_period': result['parameters']['long_period'],
                'total_return': result['total_return']
            })
        
        pivot_df = pd.DataFrame(pivot_data)
        heatmap_data = pivot_df.pivot(index='short_period', columns='long_period', values='total_return')
        sns.heatmap(heatmap_data, annot=True, fmt='.1f', cmap='RdYlGn')
        plt.title('SMA Parameters Heatmap (Total Return %)')
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/strategy_optimization_results.png', dpi=300, bbox_inches='tight')
    plt.close()

def run_strategy_tests():
    """Run comprehensive strategy tests"""
    print("Running Trading Bot Strategy Tests and Optimization")
    print("=" * 60)
    
    # Generate test data
    data = generate_mock_price_data(days=365)
    print(f"Generated {len(data)} hours of mock price data")
    
    # Test individual strategies
    strategies = [
        SMAStrategy(short_period=10, long_period=30),
        SMAStrategy(short_period=5, long_period=20),
        RSIStrategy(period=14, oversold=30, overbought=70),
        RSIStrategy(period=21, oversold=25, overbought=75)
    ]
    
    results = []
    for strategy in strategies:
        result = backtest_strategy(strategy, data)
        results.append(result)
        print(f"\n{result['strategy_name']} Results:")
        print(f"  Parameters: {result['parameters']}")
        print(f"  Total Return: {result['total_return']:.2f}%")
        print(f"  Total Trades: {result['total_trades']}")
        print(f"  Win Rate: {result['win_rate']:.2f}%")
        print(f"  Sharpe Ratio: {result['sharpe_ratio']:.3f}")
        print(f"  Max Drawdown: {result['max_drawdown']:.2f}%")
    
    # Optimize parameters
    print("\n" + "=" * 60)
    print("PARAMETER OPTIMIZATION")
    print("=" * 60)
    
    sma_results, rsi_results = optimize_strategy_parameters()
    
    # Find best performing strategies
    best_sma = max(sma_results, key=lambda x: x['total_return'])
    best_rsi = max(rsi_results, key=lambda x: x['total_return'])
    
    print(f"\nBest SMA Strategy:")
    print(f"  Parameters: {best_sma['parameters']}")
    print(f"  Total Return: {best_sma['total_return']:.2f}%")
    print(f"  Sharpe Ratio: {best_sma['sharpe_ratio']:.3f}")
    print(f"  Max Drawdown: {best_sma['max_drawdown']:.2f}%")
    
    print(f"\nBest RSI Strategy:")
    print(f"  Parameters: {best_rsi['parameters']}")
    print(f"  Total Return: {best_rsi['total_return']:.2f}%")
    print(f"  Sharpe Ratio: {best_rsi['sharpe_ratio']:.3f}")
    print(f"  Max Drawdown: {best_rsi['max_drawdown']:.2f}%")
    
    # Create visualizations
    create_performance_visualization(sma_results, 'SMA')
    
    # Save detailed results
    all_results = {
        'individual_tests': results,
        'sma_optimization': sma_results,
        'rsi_optimization': rsi_results,
        'best_strategies': {
            'sma': best_sma,
            'rsi': best_rsi
        }
    }
    
    with open('/home/ubuntu/strategy_test_results.json', 'w') as f:
        json.dump(all_results, f, indent=2, default=str)
    
    print(f"\nResults saved to strategy_test_results.json")
    print(f"Visualization saved to strategy_optimization_results.png")
    
    return all_results

if __name__ == "__main__":
    results = run_strategy_tests()

