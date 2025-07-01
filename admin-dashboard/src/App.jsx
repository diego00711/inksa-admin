import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { 
  Users, Store, Truck, ShoppingCart, DollarSign, TrendingUp, 
  Activity, Settings, LogOut, Brain, Plus, Bell, Download, Filter
} from 'lucide-react'

// =================================================================================
// COMPONENTE DE PÁGINA DE LOGIN
// =================================================================================
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    // Simulação de autenticação
    setTimeout(() => {
      if (email === 'admin@inksa.com' && password === 'admin123') {
        localStorage.setItem('isLoggedIn', 'true')
        onLogin(true)
      } else {
        setError('Credenciais inválidas')
      }
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center p-6">
          <img 
            src="/logo.png" 
            alt="Inksa Admin Logo" 
            className="w-24 h-auto mx-auto mb-4"
          />
          <CardTitle className="text-2xl font-bold">Inksa Admin</CardTitle>
          <CardDescription>Dashboard de Administrador</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@inksa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'A entrar...' : 'Entrar'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Credenciais de teste:</p>
            <p>Email: admin@inksa.com | Senha: admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =================================================================================
// COMPONENTES DO DASHBOARD
// =================================================================================

function Sidebar({ activeTab, setActiveTab, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'usuarios', label: 'Usuários', icon: Users },
    { id: 'restaurantes', label: 'Restaurantes', icon: Store },
    { id: 'entregadores', label: 'Entregadores', icon: Truck },
    { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
    { id: 'ia', label: 'IA & Analytics', icon: Brain },
    { id: 'configuracoes', label: 'Configurações', icon: Settings }
  ]

  return (
    <div className="w-64 bg-card text-card-foreground h-screen fixed left-0 top-0 flex flex-col border-r">
      <div className="p-6 border-b">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="Inksa Admin Logo" className="w-8 h-auto" />
          <h2 className="text-lg font-bold">Inksa Admin</h2>
        </div>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === item.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={onLogout}>
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrativo</h1>
          <p className="text-gray-600">Gerencie toda a plataforma Inksa</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Bell className="w-4 h-4 mr-2" />
            Notificações
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Relatórios
          </Button>
        </div>
      </div>
    </header>
  )
}

function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Usuários</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Restaurantes</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Store className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entregadores</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Truck className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pedidos Hoje</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Faturamento Mês</p>
                <p className="text-2xl font-bold">R$ 0,00</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Crescimento</p>
                <p className="text-2xl font-bold text-green-600">+0%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Aqui pode adicionar os outros componentes como gráficos e tabelas */}
    </div>
  )
}

function renderContent(activeTab) {
  switch (activeTab) {
    case 'dashboard':
      return <DashboardContent />
    // Adicione os outros casos para as diferentes abas aqui
    default:
      return (
        <div className="p-6">
          <h2 className="text-2xl font-bold">Página de {activeTab}</h2>
          <p className="text-muted-foreground">Conteúdo em desenvolvimento...</p>
        </div>
      )
  }
}

// =================================================================================
// COMPONENTE PRINCIPAL DA APLICAÇÃO
// =================================================================================
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
    setIsLoggedIn(loggedIn)
  }, [])

  const handleLogin = (status) => {
    setIsLoggedIn(status)
  }

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    setIsLoggedIn(false)
    setActiveTab('dashboard')
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      <div className="flex-1 ml-64 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent(activeTab)}
        </main>
      </div>
    </div>
  )
}

export default App