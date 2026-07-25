import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Award, Clock, Users } from 'lucide-react';

const COLORS = ['#a855f7', '#ec4899', '#6366f1', '#14b8a6', '#f59e0b', '#10b981'];

function Analytics() {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ordersRes, menuRes] = await Promise.all([
          fetch('http://localhost:8000/api/orders'),
          fetch('http://localhost:8000/api/menu'),
        ]);
        setOrders(await ordersRes.json());
        setMenuItems(await menuRes.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchAll();
  }, []);

  // Top restaurants by revenue
  const restaurantRevenue = orders.reduce((acc, o) => {
    acc[o.restaurant_name] = (acc[o.restaurant_name] || 0) + (o.total_amount || 0);
    return acc;
  }, {});
  const restaurantData = Object.entries(restaurantRevenue)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // Orders by status (pie)
  const statusCount = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

  // Hourly order distribution (simulate from pickup_time)
  const hourlyData = Array.from({ length: 14 }, (_, i) => ({
    hour: `${8 + i}:00`,
    orders: 0,
  }));
  orders.forEach(o => {
    if (o.pickup_time) {
      const hr = parseInt(o.pickup_time.split(':')[0], 10);
      const idx = hr - 8;
      if (idx >= 0 && idx < 14) hourlyData[idx].orders += 1;
    }
  });

  // Menu category breakdown
  const categoryCount = menuItems.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {});
  const categoryData = Object.entries(categoryCount).map(([name, count]) => ({ name, count }));

  const totalRevenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const avgOrder = orders.length ? (totalRevenue / orders.length).toFixed(0) : 0;
  const peakHour = hourlyData.reduce((a, b) => (b.orders > a.orders ? b : a), hourlyData[0]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(15,10,40,0.95)', border: '1px solid rgba(168,85,247,0.4)',
          borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.85rem'
        }}>
          <p style={{ color: '#a855f7', fontWeight: 700 }}>{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: '#fff' }}>
              {p.name === 'revenue' ? `₹${p.value.toFixed(0)}` : p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <header className="header">
        <h1>Analytics</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="live-dot" style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#4ade80', display: 'inline-block', marginRight: 6,
            boxShadow: '0 0 8px #4ade80'
          }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Live Data</span>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {[
          { icon: <TrendingUp size={22} color="#a855f7" />, label: 'Total Revenue', value: `₹${totalRevenue.toFixed(0)}` },
          { icon: <Users size={22} color="#ec4899" />, label: 'Total Orders', value: orders.length },
          { icon: <Award size={22} color="#f59e0b" />, label: 'Avg Order Value', value: `₹${avgOrder}` },
          { icon: <Clock size={22} color="#14b8a6" />, label: 'Peak Hour', value: peakHour?.hour || '-' },
        ].map((kpi, i) => (
          <div key={i} className="glass-card stat-item" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{
              background: 'rgba(255,255,255,0.08)', borderRadius: '12px',
              padding: '0.75rem', display: 'flex', alignItems: 'center'
            }}>
              {kpi.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>{kpi.label}</h3>
              <p style={{ fontSize: '1.5rem' }}>{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: Restaurant Revenue + Status Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ height: 320 }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 1 }}>
            Revenue by Restaurant
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={restaurantData} margin={{ top: 0, right: 10, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
              <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {restaurantData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card" style={{ height: 320 }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 1 }}>
            Order Status Breakdown
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="45%" outerRadius={90} dataKey="value" label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              } labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Hourly + Category */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
        <div className="glass-card" style={{ height: 280 }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 1 }}>
            Hourly Order Volume
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={hourlyData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="hour" stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
              <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="orders" radius={[4, 4, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card" style={{ height: 280 }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 1 }}>
            Menu by Category
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 10 }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
