import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed,
  BarChart2, MessageSquare, Users, Settings,
  Bell, X, Wifi, WifiOff, Bot, Circle
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Menu from './pages/Menu';
import Analytics from './pages/Analytics';
import Conversations from './pages/Conversations';
import Students from './pages/Students';
import SettingsPage from './pages/Settings';
import './index.css';

function App() {
  const [wsStatus, setWsStatus] = useState('connecting');
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [time, setTime] = useState(new Date());

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // WebSocket
  useEffect(() => {
    let ws;
    const connect = () => {
      ws = new WebSocket('ws://localhost:8000/ws');
      ws.onopen = () => setWsStatus('online');
      ws.onclose = () => { setWsStatus('offline'); setTimeout(connect, 3000); };
      ws.onerror = () => setWsStatus('offline');
      ws.onmessage = (event) => {
        if (event.data === 'NEW_ORDER') {
          const notif = {
            id: Date.now(),
            text: 'New WhatsApp Order Received!',
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            read: false,
          };
          setNotifications(prev => [notif, ...prev].slice(0, 20));
          setUnreadCount(c => c + 1);
          toast.success('🛍️ New WhatsApp Order Received!', {
            style: { borderRadius: '12px', background: 'rgba(30,27,75,0.98)', color: '#fff', border: '1px solid rgba(168,85,247,0.4)' },
          });
          window.dispatchEvent(new Event('order_updated'));
        }
      };
    };
    connect();
    return () => ws && ws.close();
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const navLinks = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/orders', icon: <ShoppingBag size={20} />, label: 'Orders' },
    { to: '/menu', icon: <UtensilsCrossed size={20} />, label: 'Menu' },
    { to: '/analytics', icon: <BarChart2 size={20} />, label: 'Analytics' },
    { to: '/conversations', icon: <MessageSquare size={20} />, label: 'Conversations' },
    { to: '/students', icon: <Users size={20} />, label: 'Students' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <div className="app-container">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <aside className="sidebar glass-card">
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg, #a855f7, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Bot size={20} color="#fff" />
            </div>
            <h2 style={{ margin: 0 }}>LPU FoodBot</h2>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Admin Dashboard</p>
        </div>

        <nav className="sidebar-nav">
          {navLinks.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            >
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Bottom: Status */}
        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
          {/* Clock */}
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#fff' }}>
              {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>
          {/* Connection status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center',
            padding: '0.5rem 0.75rem', borderRadius: '8px',
            background: wsStatus === 'online' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${wsStatus === 'online' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            {wsStatus === 'online'
              ? <><Wifi size={14} color="#4ade80" /><span style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 600 }}>Backend Online</span></>
              : <><WifiOff size={14} color="#f87171" /><span style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 600 }}>Reconnecting…</span></>
            }
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content" style={{ position: 'relative' }}>
        {/* Top bar with notification bell */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem', paddingBottom: '0.5rem'
        }}>
          <button
            id="notification-bell"
            onClick={() => { setNotifOpen(o => !o); if (!notifOpen) markAllRead(); }}
            style={{
              position: 'relative', background: 'rgba(255,255,255,0.08)',
              border: '1px solid var(--glass-border)', borderRadius: '12px',
              padding: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.2s ease'
            }}
          >
            <Bell size={20} color={unreadCount > 0 ? '#facc15' : 'var(--text-secondary)'} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: '#ef4444', color: '#fff', borderRadius: '999px',
                fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem',
                minWidth: 18, textAlign: 'center', boxShadow: '0 0 8px rgba(239,68,68,0.6)'
              }}>{unreadCount}</span>
            )}
          </button>
        </div>

        {/* Notification Panel */}
        {notifOpen && (
          <div style={{
            position: 'fixed', top: '1rem', right: '1rem', width: 340, zIndex: 1000,
            background: 'rgba(20,15,50,0.97)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(168,85,247,0.35)', borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            animation: 'slideInPanel 0.2s ease'
          }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 700 }}>Notifications</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{notifications.length} total</p>
              </div>
              <button onClick={() => setNotifOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ maxHeight: 380, overflowY: 'auto', padding: '0.5rem 0' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <Bell size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                  <p>No notifications yet</p>
                </div>
              ) : notifications.map(n => (
                <div key={n.id} style={{
                  padding: '0.85rem 1.25rem',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShoppingBag size={15} color="#a855f7" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{n.text}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/students" element={<Students />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
