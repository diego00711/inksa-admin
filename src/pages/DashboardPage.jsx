import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Loader2 } from "lucide-react";
import { getDashboard } from "../services/analytics";
import authService from "../services/authService";
import { RevenueChart, ClientsLineChart, OrdersStatusPie, RecentOrdersList, KpiCard } from "../components/DashboardWidgets"; // separe seus componentes se quiser

export function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersStatus, setOrdersStatus] = useState({});
  const [clientsGrowth, setClientsGrowth] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await getDashboard();
      setKpis(data.kpis || {});
      setChartData(data.chartData || []);
      setRecentOrders(data.recentOrders || []);
      setOrdersStatus(data.ordersStatus || {});
      setClientsGrowth(data.clientsGrowth || []);
    } catch (e) {
      console.error("Erro ao buscar dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000); // polling
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const BASE = (
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      "https://inksa-auth-flask-dev.onrender.com"
    ).replace(/\/+$/, "");

    const token = authService.getToken();
    const socket = io(BASE, {
      transports: ["websocket"],
      auth: { token: token || "" },
    });

    socket.on("admin:dashboard-updated", () => {
      console.log("📡 Atualização recebida do backend — recarregando...");
      loadDashboard();
    });

    return () => socket.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* seus cards e gráficos existentes */}
      {/* Exemplo simples */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Receita Total" value={`R$ ${kpis.totalRevenue?.toFixed(2) || 0}`} />
        <KpiCard title="Pedidos Hoje" value={kpis.ordersToday ?? 0} />
        <KpiCard title="Ticket Médio" value={`R$ ${kpis.averageTicket?.toFixed(2) || 0}`} />
        <KpiCard title="Novos Clientes" value={kpis.newClientsToday ?? 0} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <RevenueChart data={chartData} />
          <ClientsLineChart data={clientsGrowth} />
        </div>
        <div className="space-y-8">
          <OrdersStatusPie data={ordersStatus} />
          <RecentOrdersList orders={recentOrders} />
        </div>
      </div>
    </div>
  );
}
