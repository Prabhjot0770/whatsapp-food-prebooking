import React, { useState, useEffect } from 'react';
import {
  Users, Search, Phone, GraduationCap,
  ShoppingBag, IndianRupee, TrendingUp, Star
} from 'lucide-react';
import { API_BASE_URL } from '../config';

function Students() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('orders');

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders`);
        setOrders(await res.json());
      } catch (e) { console.error(e); }
    };
    fetch_();
  }, []);

  // Aggregate per student
  const studentMap = orders.reduce((acc, o) => {
    const key = o.student_name;
    if (!acc[key]) acc[key] = { name: key, phone: o.student_phone || '—', orders: 0, spent: 0, lastOrder: '' };
    acc[key].orders += 1;
    acc[key].spent += o.total_amount || 0;
    acc[key].lastOrder = o.created_at || o.pickup_time || '—';
    return acc;
  }, {});

  let students = Object.values(studentMap).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  students.sort((a, b) => sortBy === 'orders' ? b.orders - a.orders : b.spent - a.spent);

  const totalStudents = students.length;
  const totalSpent = students.reduce((s, st) => s + st.spent, 0);
  const topSpender = students[0];

  const avatarColor = (name) => {
    const colors = ['#a855f7','#ec4899','#6366f1','#14b8a6','#f59e0b','#10b981'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <div>
      <header className="header">
        <h1>Student Insights</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '999px', padding: '0.4rem 1rem' }}>
          <Users size={16} color="#6366f1" />
          <span style={{ color: '#818cf8', fontSize: '0.85rem', fontWeight: 600 }}>{totalStudents} students</span>
        </div>
      </header>

      {/* KPIs */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.5rem' }}>
        {[
          { icon: <GraduationCap size={22} color="#6366f1" />, label: 'Total Students', value: totalStudents },
          { icon: <IndianRupee size={22} color="#a855f7" />, label: 'Lifetime Revenue', value: `₹${totalSpent.toFixed(0)}` },
          { icon: <Star size={22} color="#f59e0b" />, label: 'Top Customer', value: topSpender?.name || '—' },
        ].map((k, i) => (
          <div key={i} className="glass-card stat-item" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '0.75rem', display: 'flex' }}>
              {k.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>{k.label}</h3>
              <p style={{ fontSize: '1.4rem' }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem',
              borderRadius: '8px', border: '1px solid var(--glass-border)',
              background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[['orders', 'Sort by Orders'], ['spent', 'Sort by Spent']].map(([key, label]) => (
            <button key={key} onClick={() => setSortBy(key)} style={{
              padding: '0.5rem 1rem', borderRadius: '999px', cursor: 'pointer',
              background: sortBy === key ? 'rgba(168,85,247,0.2)' : 'transparent',
              border: `1px solid ${sortBy === key ? 'rgba(168,85,247,0.5)' : 'var(--glass-border)'}`,
              color: sortBy === key ? '#c084fc' : 'var(--text-secondary)',
              fontWeight: 500, fontSize: '0.85rem', transition: 'all 0.2s ease'
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Student Cards */}
      {students.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p>No students found. Orders will appear here once received.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {students.map((st, i) => (
            <div key={i} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${avatarColor(st.name)}, #1e1b4b)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '1.2rem', color: '#fff', flexShrink: 0
                }}>
                  {st.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '1rem' }}>{st.name}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Phone size={11} /> {st.phone}
                  </p>
                </div>
                {i === 0 && (
                  <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '999px', padding: '0.2rem 0.6rem' }}>
                    <Star size={12} color="#f59e0b" style={{ display: 'inline', marginRight: 4 }} />
                    <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 700 }}>TOP</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                  <ShoppingBag size={16} color="#818cf8" style={{ margin: '0 auto 0.3rem' }} />
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{st.orders}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Orders</p>
                </div>
                <div style={{ background: 'rgba(168,85,247,0.1)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                  <IndianRupee size={16} color="#c084fc" style={{ margin: '0 auto 0.3rem' }} />
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>₹{st.spent.toFixed(0)}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Spent</p>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <TrendingUp size={12} />
                Avg: ₹{st.orders ? (st.spent / st.orders).toFixed(0) : 0} per order
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Students;
