import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [stats, setStats] = useState({ total_orders: 0, total_revenue: 0, total_students: 0 });
  
  // Dummy chart data for demo purposes since we don't have historical data API yet
  const chartData = [
    { name: 'Mon', revenue: 400 },
    { name: 'Tue', revenue: 300 },
    { name: 'Wed', revenue: 550 },
    { name: 'Thu', revenue: 450 },
    { name: 'Fri', revenue: 700 },
    { name: 'Sat', revenue: 150 },
    { name: 'Sun', revenue: 800 },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await fetch('http://localhost:8000/api/stats');
        const statsData = await statsRes.json();
        setStats(statsData);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    
    // Listen for WebSocket custom event
    window.addEventListener('order_updated', fetchData);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('order_updated', fetchData);
    };
  }, []);

  return (
    <div>
      <header className="header">
        <h1>Overview</h1>
        <div className="user-profile">
          <span style={{color: "var(--text-secondary)"}}>Admin Access</span>
        </div>
      </header>

      <div className="stats-grid">
        <div className="glass-card stat-item">
          <h3>Total Orders</h3>
          <p>{stats.total_orders}</p>
        </div>
        <div className="glass-card stat-item">
          <h3>Total Revenue</h3>
          <p>₹{stats.total_revenue.toFixed(2)}</p>
        </div>
        <div className="glass-card stat-item">
          <h3>Active Students</h3>
          <p>{stats.total_students}</p>
        </div>
      </div>

      <div className="glass-card" style={{ height: '400px', marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Revenue Trend</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" stroke="var(--text-secondary)" />
            <YAxis stroke="var(--text-secondary)" />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(30, 27, 75, 0.9)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#a855f7" fillOpacity={1} fill="url(#colorRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Dashboard;
