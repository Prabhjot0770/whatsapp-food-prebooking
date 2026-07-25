import React, { useState, useEffect } from 'react';
import {
  Bot, Wifi, WifiOff, MessageSquare, ChevronRight,
  User, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';

const MOCK_CONVERSATIONS = [
  {
    student: 'Arjun Sharma',
    phone: '+91-98765-43210',
    lastMessage: 'Yes, please confirm my order!',
    time: '2 min ago',
    unread: 2,
    messages: [
      { from: 'student', text: 'Hi! I want to order Paneer Tikka from Punjabi Dhaba', time: '14:30' },
      { from: 'bot', text: 'Great choice! Paneer Tikka is ₹180. What time would you like to pick it up?', time: '14:30' },
      { from: 'student', text: 'Around 5pm please', time: '14:31' },
      { from: 'bot', text: 'Perfect! Pickup at 17:00. Total: ₹180. Confirm? Reply YES to confirm.', time: '14:31' },
      { from: 'student', text: 'Yes, please confirm my order!', time: '14:32' },
    ]
  },
  {
    student: 'Priya Kaur',
    phone: '+91-87654-32109',
    lastMessage: 'What are the veg options at Taste of Punjab?',
    time: '15 min ago',
    unread: 0,
    messages: [
      { from: 'student', text: 'Hello, what are the veg options at Taste of Punjab?', time: '14:15' },
      { from: 'bot', text: 'At Taste of Punjab, veg options include: Dal Makhani ₹120, Paneer Butter Masala ₹160, Aloo Paratha ₹80, Veg Biryani ₹150', time: '14:15' },
      { from: 'student', text: 'What are the veg options at Taste of Punjab?', time: '14:20' },
    ]
  },
  {
    student: 'Rahul Verma',
    phone: '+91-76543-21098',
    lastMessage: 'Order confirmed! Thank you 🎉',
    time: '1 hr ago',
    unread: 0,
    messages: [
      { from: 'student', text: 'Can I order Chicken Biryani?', time: '13:00' },
      { from: 'bot', text: 'Chicken Biryani from Spice Garden is ₹220. Pickup time?', time: '13:00' },
      { from: 'student', text: '4:30 PM', time: '13:01' },
      { from: 'bot', text: 'Order confirmed! Pickup at 16:30. Order #LPU-1042. Total: ₹220', time: '13:01' },
      { from: 'student', text: 'Order confirmed! Thank you 🎉', time: '13:02' },
    ]
  },
];

function Conversations() {
  const [selected, setSelected] = useState(MOCK_CONVERSATIONS[0]);
  const [botStatus, setBotStatus] = useState('online');

  return (
    <div>
      <header className="header">
        <h1>WhatsApp Conversations</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
            borderRadius: '999px', padding: '0.4rem 1rem'
          }}>
            <Bot size={16} color="#4ade80" />
            <span style={{ color: '#4ade80', fontSize: '0.85rem', fontWeight: 600 }}>Bot Active</span>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', height: 'calc(100vh - 180px)' }}>
        {/* Conversations List */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Recent Chats ({MOCK_CONVERSATIONS.length})
            </h3>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {MOCK_CONVERSATIONS.map((conv, i) => (
              <div
                key={i}
                onClick={() => setSelected(conv)}
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  background: selected.phone === conv.phone ? 'rgba(168,85,247,0.15)' : 'transparent',
                  borderLeft: selected.phone === conv.phone ? '3px solid #a855f7' : '3px solid transparent',
                  transition: 'all 0.2s ease',
                  display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${['#a855f7','#ec4899','#6366f1'][i % 3]}, #1e1b4b)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: '1rem', fontWeight: 700, color: '#fff'
                }}>
                  {conv.student[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{conv.student}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{conv.time}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                      {conv.lastMessage}
                    </p>
                    {conv.unread > 0 && (
                      <span style={{
                        background: '#a855f7', color: '#fff', borderRadius: '999px',
                        fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', flexShrink: 0
                      }}>{conv.unread}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className="glass-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Chat Header */}
          <div style={{
            padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(0,0,0,0.15)'
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg, #a855f7, #1e1b4b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '1.1rem', color: '#fff'
            }}>
              {selected.student[0]}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem' }}>{selected.student}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selected.phone}</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#4ade80" />
              <span style={{ fontSize: '0.8rem', color: '#4ade80' }}>Bot Handled</span>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selected.messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.from === 'student' ? 'flex-start' : 'flex-end',
                alignItems: 'flex-end', gap: '0.5rem'
              }}>
                {msg.from === 'student' && (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ec4899, #1e1b4b)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0
                  }}>
                    <User size={14} />
                  </div>
                )}
                <div style={{
                  maxWidth: '70%',
                  background: msg.from === 'student'
                    ? 'rgba(255,255,255,0.1)'
                    : 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(99,102,241,0.4))',
                  borderRadius: msg.from === 'student' ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                  padding: '0.75rem 1rem',
                  border: '1px solid rgba(255,255,255,0.12)'
                }}>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{msg.text}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.35rem', textAlign: 'right' }}>{msg.time}</p>
                </div>
                {msg.from === 'bot' && (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #1e1b4b)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Bot size={14} color="#fff" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              📖 Read-only view — conversations are handled automatically by the WhatsApp bot
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Conversations;
