import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { state: { scrollTo: id } });
    }
  };

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 999, height: 60, display: 'flex', alignItems: 'center',
      background: scrolled ? (isDark ? 'rgba(26,22,48,0.92)' : 'rgba(255,255,255,0.92)') : 'transparent',
      backdropFilter: 'blur(20px)',
      borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
      boxShadow: scrolled ? '0 1px 20px rgba(109,40,217,0.08)' : 'none',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ maxWidth: 1320, width: '100%', margin: '0 auto', padding: '0 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', boxShadow: '0 4px 12px rgba(109,40,217,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 12 }}>EQ</div>
          <span style={{ fontSize: '1.18rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>Equi<span style={{ color: '#7c3aed' }}>AI</span></span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {[
            { label: 'Home', action: () => navigate('/') },
            { label: 'How It Works', action: () => scrollTo('workflow') },
            { label: 'SDG Goals', action: () => scrollTo('sdg') }
          ].map(item => (
            <span key={item.label} onClick={item.action} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s', cursor: 'pointer' }}
              onMouseEnter={e => e.target.style.color = '#6d28d9'} onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>{item.label}</span>
          ))}

          {/* Theme Toggle */}
          <div
            onClick={toggle}
            style={{
              width: 48, height: 26, borderRadius: 99, cursor: 'pointer', position: 'relative',
              background: isDark ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'linear-gradient(135deg,#e0e7ff,#c4b5fd)',
              boxShadow: '0 2px 8px rgba(109,40,217,0.3)', transition: 'background 0.3s', flexShrink: 0
            }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <div style={{
              position: 'absolute', top: 4, width: 18, height: 18, borderRadius: '50%', background: 'white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              left: isDark ? 26 : 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10
            }}>
              {isDark ? '🌙' : '☀️'}
            </div>
          </div>

          <button className="btn-shimmer" onClick={() => navigate('/audit')} style={{ padding: '7px 18px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(109,40,217,0.35)' }}>Launch Audit ↗</button>
        </div>
      </div>
    </nav>
  );
}
