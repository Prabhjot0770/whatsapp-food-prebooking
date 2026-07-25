import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

function Menu() {
  const [menuItems, setMenuItems] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/menu');
        const data = await res.json();
        setMenuItems(data);
      } catch (error) {
        console.error("Error fetching menu:", error);
      }
    };
    fetchMenu();
  }, []);

  const filteredMenu = menuItems.filter(item => 
    item.item_name.toLowerCase().includes(search.toLowerCase()) || 
    item.restaurant.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <header className="header">
        <h1>Digital Menu</h1>
      </header>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
          <input 
            type="text" 
            placeholder="Search for food items or restaurants..." 
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
      </div>

      <div className="stats-grid">
        {filteredMenu.slice(0, 50).map((item) => (
          <div key={item.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: item.is_available === false ? 0.5 : 1 }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--secondary-color)', fontWeight: 'bold' }}>{item.category.toUpperCase()}</span>
              <h3 style={{ margin: '0.5rem 0' }}>{item.item_name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.restaurant}</p>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₹{item.price}</span>
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch(`http://localhost:8000/api/menu/${item.id}/toggle`, { method: 'POST' });
                    const data = await res.json();
                    setMenuItems(menuItems.map(m => m.id === item.id ? {...m, is_available: data.is_available} : m));
                  } catch (e) { console.error(e) }
                }}
                style={{ 
                  background: item.is_available !== false ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)', 
                  color: item.is_available !== false ? '#f87171' : '#4ade80', 
                  border: '1px solid currentColor',
                  padding: '0.5rem 1rem', 
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}>
                {item.is_available !== false ? "Mark Out of Stock" : "Mark Available"}
              </button>
            </div>
          </div>
        ))}
      </div>
      {filteredMenu.length > 50 && (
        <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)' }}>
          Showing 50 of {filteredMenu.length} items. Use search to refine.
        </p>
      )}
    </div>
  );
}

export default Menu;
