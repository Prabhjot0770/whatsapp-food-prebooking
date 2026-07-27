import React, { useState } from 'react';
import {
  Bot, Key, Bell, Moon, Sun, Database,
  Smartphone, Save, RefreshCw, CheckCircle2, Sliders
} from 'lucide-react';
import toast from 'react-hot-toast';

function Settings() {
  const [settings, setSettings] = useState({
    botEnabled: true,
    notifications: true,
    autoConfirm: false,
    darkMode: true,
    geminiKey: '',
    whatsappPhone: '+91-XXXXXXXXXX',
    maxOrdersPerHour: 50,
    pickupBuffer: 30,
  });
  const [saved, setSaved] = useState(false);

  const toggle = (key) => setSettings(s => ({ ...s, [key]: !s[key] }));
  const update = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const handleSave = () => {
    setSaved(true);
    toast.success('Settings saved successfully!', {
      style: { background: 'rgba(18,14,28,0.95)', color: '#fff', border: '1px solid rgba(197, 160, 89, 0.5)' }
    });
    setTimeout(() => setSaved(false), 2000);
  };

  const ToggleSwitch = ({ on, onClick, label }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      <div
        onClick={onClick}
        style={{
          width: 48, height: 26, borderRadius: 999, cursor: 'pointer',
          background: on ? 'linear-gradient(90deg, #C5A059, #A51C30)' : 'rgba(255,255,255,0.1)',
          position: 'relative', transition: 'background 0.3s ease',
          border: '1px solid rgba(255,255,255,0.15)'
        }}
      >
        <div style={{
          position: 'absolute', top: 3,
          left: on ? 24 : 3,
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff', transition: 'left 0.3s ease',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)'
        }} />
      </div>
    </div>
  );

  const Section = ({ icon, title, children }) => (
    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ background: 'rgba(197, 160, 89, 0.15)', borderRadius: '10px', padding: '0.5rem', display: 'flex' }}>
          {icon}
        </div>
        <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</h3>
      </div>
      {children}
    </div>
  );

  const InputField = ({ label, value, onChange, type = 'text', placeholder }) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '0.7rem 1rem', borderRadius: '10px',
          border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)',
          color: '#fff', outline: 'none', fontSize: '0.9rem',
          transition: 'border 0.2s ease'
        }}
        onFocus={e => e.target.style.borderColor = '#C5A059'}
        onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
      />
    </div>
  );

  return (
    <div>
      <header className="header">
        <h1>Settings</h1>
        <button
          onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: saved ? 'rgba(74,222,128,0.2)' : 'linear-gradient(135deg, #C5A059, #A51C30)',
            color: '#fff', border: saved ? '1px solid #4ade80' : 'none',
            padding: '0.7rem 1.5rem', borderRadius: '10px', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.3s ease'
          }}
        >
          {saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <Section icon={<Bot size={20} color="#C5A059" />} title="Bot Configuration">
            <ToggleSwitch on={settings.botEnabled} onClick={() => toggle('botEnabled')} label="WhatsApp Bot Active" />
            <ToggleSwitch on={settings.autoConfirm} onClick={() => toggle('autoConfirm')} label="Auto-Confirm Orders" />
            <div style={{ padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                Max Orders per Hour: <strong style={{ color: '#fff' }}>{settings.maxOrdersPerHour}</strong>
              </label>
              <input
                type="range" min={10} max={200} value={settings.maxOrdersPerHour}
                onChange={e => update('maxOrdersPerHour', +e.target.value)}
                style={{ width: '100%', accentColor: '#C5A059' }}
              />
            </div>
            <div style={{ padding: '1rem 0' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                Min Pickup Buffer (mins): <strong style={{ color: '#fff' }}>{settings.pickupBuffer}</strong>
              </label>
              <input
                type="range" min={10} max={120} value={settings.pickupBuffer}
                onChange={e => update('pickupBuffer', +e.target.value)}
                style={{ width: '100%', accentColor: '#A51C30' }}
              />
            </div>
          </Section>

          <Section icon={<Bell size={20} color="#A51C30" />} title="Notifications">
            <ToggleSwitch on={settings.notifications} onClick={() => toggle('notifications')} label="Browser Notifications" />
            <ToggleSwitch on={settings.darkMode} onClick={() => toggle('darkMode')} label="Dark Mode (always on recommended)" />
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(197, 160, 89, 0.08)', border: '1px solid rgba(197, 160, 89, 0.2)' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                💡 Notifications fire automatically when new orders arrive via WhatsApp bot.
              </p>
            </div>
          </Section>
        </div>

        <div>
          <Section icon={<Key size={20} color="#f59e0b" />} title="API Keys & Integration">
            <InputField
              label="Gemini AI API Key"
              value={settings.geminiKey}
              onChange={v => update('geminiKey', v)}
              type="password"
              placeholder="AIzaSy..."
            />
            <InputField
              label="WhatsApp Business Number"
              value={settings.whatsappPhone}
              onChange={v => update('whatsappPhone', v)}
              placeholder="+91-9876543210"
            />
            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <p style={{ fontSize: '0.82rem', color: '#fbbf24' }}>
                ⚠️ API keys are stored in your backend .env file. Never share them publicly.
              </p>
            </div>
          </Section>

          <Section icon={<Database size={20} color="#14b8a6" />} title="System Status">
            {[
              { label: 'FastAPI Backend', status: 'online', color: '#4ade80' },
              { label: 'SQLite Database', status: 'online', color: '#4ade80' },
              { label: 'WhatsApp Webhook', status: 'online', color: '#4ade80' },
              { label: 'Gemini AI', status: 'not configured', color: '#facc15' },
              { label: 'WebSocket Server', status: 'online', color: '#4ade80' },
            ].map((s, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none'
              }}>
                <span style={{ fontSize: '0.9rem' }}>{s.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                  <span style={{ fontSize: '0.8rem', color: s.color, fontWeight: 600 }}>{s.status}</span>
                </div>
              </div>
            ))}
          </Section>
        </div>
      </div>
    </div>
  );
}

export default Settings;
