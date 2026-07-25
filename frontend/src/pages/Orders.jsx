import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const ordersRes = await fetch('http://localhost:8000/api/orders');
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    
    window.addEventListener('order_updated', fetchOrders);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('order_updated', fetchOrders);
    }
  }, []);

  const exportToCSV = () => {
    const headers = ["Order ID", "Student", "Restaurant", "Pickup Time", "Total", "Status"];
    const csvContent = [
      headers.join(","),
      ...filteredOrders.map(o => 
        `LPU${o.id},"${o.student_name}","${o.restaurant_name}","${o.pickup_time}",${o.total_amount},${o.status}`
      )
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "orders_export.csv";
    link.click();
  };

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'ALL' || order.status === filter;
    const matchesSearch = 
      order.student_name.toLowerCase().includes(search.toLowerCase()) || 
      order.id.toString().includes(search);
    return matchesFilter && matchesSearch;
  });

  return (
    <div>
      <header className="header">
        <h1>Order Management</h1>
        <button 
          onClick={exportToCSV}
          style={{
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Export CSV
        </button>
      </header>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
            <input 
              type="text" 
              placeholder="Search by ID or Student Name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                background: 'rgba(0,0,0,0.2)',
                color: 'white',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED'].map(status => (
              <button 
                key={status}
                onClick={() => setFilter(status)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '999px',
                  border: '1px solid var(--glass-border)',
                  background: filter === status ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div style={{overflowX: 'auto'}}>
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Student</th>
                <th>Restaurant</th>
                <th>Items</th>
                <th>Pickup Time</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr><td colSpan="7" style={{textAlign: 'center'}}>No matching orders.</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#LPU{order.id}</td>
                    <td>{order.student_name}</td>
                    <td>{order.restaurant_name}</td>
                    <td>
                      {order.items.map((i, idx) => (
                        <div key={idx}>{i.quantity}x {i.name}</div>
                      ))}
                    </td>
                    <td>{order.pickup_time}</td>
                    <td>₹{order.total_amount}</td>
                    <td>
                      <span className={`status-badge status-${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Orders;
