import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Badge } from './components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Bot, 
  DollarSign, 
  Activity, 
  Settings,
  Play,
  Pause,
  Plus,
  BarChart3,
  Wallet,
  Bell
} from 'lucide-react'
import './App.css'

// Dashboard Component
function Dashboard() {
  const [stats, setStats] = useState({
    total_profit: '+$1,234.56',
    active_bots: 2,
    total_trades: 156,
    success_rate: '78.5%',
    portfolio_value: '$10,500.00',
    daily_change: '+2.3%'
  })

  const [bots, setBots] = useState([])

  useEffect(() => {
    // Fetch dashboard stats
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err))

    // Fetch bots
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => setBots(data))
      .catch(err => console.error('Error fetching bots:', err))
  }, [])

  const handleBotToggle = async (botId, currentStatus) => {
    const action = currentStatus === 'running' ? 'stop' : 'start'
    
    try {
      const response = await fetch(`/api/bots/${botId}/${action}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        // Update bot status locally
        setBots(bots.map(bot => 
          bot.id === botId 
            ? { ...bot, status: currentStatus === 'running' ? 'stopped' : 'running' }
            : bot
        ))
      }
    } catch (error) {
      console.error('Error toggling bot:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.total_profit}</div>
            <p className="text-xs text-muted-foreground">
              {stats.daily_change} from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bots</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_bots}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total_trades} trades today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.success_rate}</div>
            <p className="text-xs text-muted-foreground">
              Portfolio: {stats.portfolio_value}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trading Bots */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Trading Bots</CardTitle>
              <CardDescription>Manage your automated trading strategies</CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Bot
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bots.map((bot) => (
              <div key={bot.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-5 w-5" />
                    <div>
                      <h3 className="font-medium">{bot.name}</h3>
                      <p className="text-sm text-muted-foreground">{bot.strategy}</p>
                    </div>
                  </div>
                  <Badge variant={bot.status === 'running' ? 'default' : 'secondary'}>
                    {bot.status}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-medium text-green-600">{bot.profit_loss}</p>
                    <p className="text-sm text-muted-foreground">{bot.trades_today} trades today</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBotToggle(bot.id, bot.status)}
                  >
                    {bot.status === 'running' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Market Overview Component
function MarketOverview() {
  const [marketData, setMarketData] = useState([])

  useEffect(() => {
    fetch('/api/market/prices')
      .then(res => res.json())
      .then(data => setMarketData(data))
      .catch(err => console.error('Error fetching market data:', err))
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Market Overview</CardTitle>
          <CardDescription>Real-time cryptocurrency prices and market data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {marketData.map((coin) => (
              <div key={coin.symbol} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-medium">{coin.name}</h3>
                    <p className="text-sm text-muted-foreground">{coin.symbol}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-medium">${coin.price.toLocaleString()}</p>
                    <div className="flex items-center space-x-1">
                      {coin.change_percentage_24h > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-sm ${coin.change_percentage_24h > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {coin.change_percentage_24h > 0 ? '+' : ''}{coin.change_percentage_24h.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Portfolio Component
function Portfolio() {
  const [portfolio, setPortfolio] = useState(null)

  useEffect(() => {
    fetch('/api/portfolio/overview')
      .then(res => res.json())
      .then(data => setPortfolio(data))
      .catch(err => console.error('Error fetching portfolio:', err))
  }, [])

  if (!portfolio) {
    return <div>Loading portfolio...</div>
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolio.total_value.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +${portfolio.total_profit_loss.toLocaleString()} ({portfolio.profit_loss_percentage.toFixed(2)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Change</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +${portfolio.daily_change.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {portfolio.daily_change_percentage.toFixed(2)}% today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolio.total_invested.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolio.assets.length}</div>
            <p className="text-xs text-muted-foreground">Different cryptocurrencies</p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Breakdown</CardTitle>
          <CardDescription>Your current cryptocurrency holdings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {portfolio.assets.map((asset) => (
              <div key={asset.symbol} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-medium">{asset.name}</h3>
                    <p className="text-sm text-muted-foreground">{asset.amount} {asset.symbol}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-medium">${asset.value.toLocaleString()}</p>
                    <p className={`text-sm ${asset.profit_loss > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {asset.profit_loss > 0 ? '+' : ''}${asset.profit_loss.toLocaleString()} ({asset.profit_loss_percentage.toFixed(2)}%)
                    </p>
                  </div>
                  <div className="w-16 text-right">
                    <p className="text-sm text-muted-foreground">{asset.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">TradingBot Pro</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>
          
          <TabsContent value="market">
            <MarketOverview />
          </TabsContent>
          
          <TabsContent value="portfolio">
            <Portfolio />
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Configure your trading preferences and account settings</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Settings panel coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App

