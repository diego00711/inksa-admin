import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts'
import { 
  Users, Store, Truck, ShoppingCart, DollarSign, TrendingUp, 
  Activity, AlertTriangle, Settings, LogOut, Eye, Edit, 
  Trash2, Plus, Search, Filter, Download, Bell, Brain,
  MapPin, Clock, Star, Package
} from 'lucide-react'
import './App.css'

// Componente de Login
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // Simular autenticação
    setTimeout(() => {
      if (email === 'admin@inksa.com' && password === 'admin123') {
        localStorage.setItem('isLoggedIn', 'true')
        onLogin(true)
      } else {
        alert('Credenciais inválidas')
      }
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img 
            src="/logo.png" 
            alt="Inksa Admin Logo" 
            className="w-16 h-16 mx-auto mb-4 rounded-lg object-contain"
          />
          <CardTitle className="text-2xl font-bold">Inksa Admin</CardTitle>
          <CardDescription>Dashboard de Administrador</CardDescription>
        </CardHeader>
        <CardContent>
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground text-center">
            <p>Credenciais de teste:</p>
            <p>Email: admin@inksa.com</p>
            <p>Senha: admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente de Sidebar
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
    <div className="w-64 bg-slate-800 text-white h-screen fixed left-0 top-0 flex flex-col">
      {/* Header da Sidebar */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <img 
            src="/logo.png" 
            alt="Inksa Admin Logo" 
            className="w-8 h-8 rounded object-contain"
          />
          <div>
            <h2 className="text-lg font-bold">Inksa Admin</h2>
            <p className="text-sm text-slate-400">Dashboard</p>
          </div>
        </div>
      </div>
      
      {/* Navegação */}
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
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
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
      
      {/* Footer da Sidebar */}
      <div className="p-4 border-t border-slate-700">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-slate-300 hover:bg-slate-700 hover:text-white" 
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  )
}

// Componente de Header
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

// Componente de Dashboard Principal
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

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos por Mês</CardTitle>
            <CardDescription>Evolução dos pedidos nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Gráfico aqui
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorias Populares</CardTitle>
            <CardDescription>Distribuição de pedidos por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Gráfico aqui
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabelas de Dados Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Usuários Recentes</CardTitle>
            <CardDescription>Últimos usuários cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">Nenhum usuário recente.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos Recentes</CardTitle>
            <CardDescription>Últimos pedidos realizados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">Nenhum pedido recente.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Função para renderizar conteúdo baseado na aba ativa
function renderContent(activeTab) {
  switch (activeTab) {
    case 'dashboard':
      return <DashboardContent />
    case 'usuarios':
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Gerenciamento de Usuários</h2>
              <p className="text-muted-foreground">Gerencie clientes, restaurantes e entregadores</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Funcionalidade em desenvolvimento...</p>
            </CardContent>
          </Card>
        </div>
      )
    case 'restaurantes':
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Gerenciamento de Restaurantes</h2>
              <p className="text-muted-foreground">Gerencie estabelecimentos parceiros</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Restaurante
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Funcionalidade em desenvolvimento...</p>
            </CardContent>
          </Card>
        </div>
      )
    case 'entregadores':
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Gerenciamento de Entregadores</h2>
              <p className="text-muted-foreground">Gerencie a equipe de entrega</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Entregador
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Funcionalidade em desenvolvimento...</p>
            </CardContent>
          </Card>
        </div>
      )
    case 'pedidos':
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Gerenciamento de Pedidos</h2>
              <p className="text-muted-foreground">Acompanhe todos os pedidos da plataforma</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Funcionalidade em desenvolvimento...</p>
            </CardContent>
          </Card>
        </div>
      )
    case 'ia':
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Inteligência Artificial & Analytics</h2>
              <p className="text-muted-foreground">Insights e recomendações baseadas em IA</p>
            </div>
            <Button>
              <Brain className="w-4 h-4 mr-2" />
              Gerar Insights
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Funcionalidade em desenvolvimento...</p>
            </CardContent>
          </Card>
        </div>
      )
    case 'configuracoes':
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
            <p className="text-muted-foreground">Gerencie as configurações da plataforma</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Funcionalidade em desenvolvimento...</p>
            </CardContent>
          </Card>
        </div>
      )
    default:
      return <DashboardContent />
  }
}

// Componente Principal da Aplicação
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    // Verificar se o usuário está logado
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
    <div className="flex h-screen bg-gray-50">
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

