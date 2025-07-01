import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { 
  Users, Store, Truck, ShoppingCart, DollarSign, TrendingUp, 
  Activity, Settings, LogOut, Brain, Plus, Bell, Download, Filter
} from 'lucide-react';

// =================================================================================
// COMPONENTE DE PÁGINA DE LOGIN
// =================================================================================
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulação de autenticação
    setTimeout(() => {
      if (email === 'admin@inksa.com' && password === 'admin123') {
        localStorage.setItem('isLoggedIn', 'true');
        onLogin(true);
      } else {
        setError('Credenciais inválidas. Por favor, tente novamente.');
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <img 
            src="/logo.png" 
            alt="Inksa Admin Logo" 
            className="w-20 h-20 mx-auto mb-4 rounded-full object-cover border-4 border-white shadow-sm"
          />
          <CardTitle className="text-3xl font-bold text-gray-800">Inksa Admin</CardTitle>
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
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <div className="mt-6 text-xs text-muted-foreground text-center bg-gray-50 p-3 rounded-lg">
            <p className="font-bold">Credenciais de teste:</p>
            <p>Email: admin@inksa.com</p>
            <p>Senha: admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col shadow-lg">
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <img 
            src="/logo.png" 
            alt="Inksa Admin Logo" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h2 className="text-lg font-bold">Inksa Admin</h2>
            <p className="text-sm text-slate-400">Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === item.id 
                      ? 'bg-red-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
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
  );
}

function Header({ activeTab }) {
    const title = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
    return (
        <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gerenciar {title}</h1>
                    <p className="text-gray-600">Visão geral e ações para a seção de {title}</p>
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
    );
}

function renderContent(activeTab) {
  // O seu switch case para renderizar o conteúdo pode ir aqui
  // Por simplicidade, vamos mostrar um placeholder
  return (
    <div className="p-6">
        <Card>
            <CardHeader>
                <CardTitle>Conteúdo de: {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-10">
                    Funcionalidade para "{activeTab}" em desenvolvimento...
                </p>
            </CardContent>
        </Card>
    </div>
  );
}


function Dashboard({ onLogout }) {
    const [activeTab, setActiveTab] = useState('dashboard');

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                onLogout={onLogout} 
            />
            <div className="flex-1 ml-64 flex flex-col">
                <Header activeTab={activeTab} />
                <main className="flex-1 overflow-y-auto">
                    {renderContent(activeTab)}
                </main>
            </div>
        </div>
    );
}


// =================================================================================
// COMPONENTE PRINCIPAL DA APLICAÇÃO
// =================================================================================
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Atraso para evitar "flash" de conteúdo
    const timer = setTimeout(() => {
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        setIsLoggedIn(loggedIn);
        setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (status) => {
    setIsLoggedIn(status);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
  };

  // Mostra um loader enquanto verifica o status de login
  if (isLoading) {
      return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
              <p>Carregando...</p>
          </div>
      );
  }

  // Renderiza a página correta baseada no estado de login
  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}

export default App;
