import React from 'react';

const AuditCounter = ({ plan, remaining, onUpgradeClick }) => {
  if (plan === 'pro') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        background: 'rgba(124, 58, 237, 0.1)',
        border: '1px solid rgba(124, 58, 237, 0.2)',
        borderRadius: '99px',
        fontSize: '0.85rem',
        fontWeight: 700,
        color: '#7c3aed'
      }}>
        <span style={{ fontSize: '1rem' }}>⚡</span> Pro — Unlimited Audits
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 18px',
      background: remaining === 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.05)',
      border: remaining === 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border)',
      borderRadius: '99px',
      fontSize: '0.85rem',
      fontWeight: 600,
      color: remaining === 0 ? '#ef4444' : 'var(--text-primary)',
      transition: 'all 0.3s ease'
    }}>
      <span>
        {remaining > 0
          ? `${remaining} free audit${remaining !== 1 ? 's' : ''} remaining today`
          : "Daily limit reached"
        }
      </span>
      <button
        style={{
          background: 'none',
          border: 'none',
          color: '#7c3aed',
          fontWeight: 800,
          cursor: 'pointer',
          padding: 0,
          marginLeft: '4px',
          transition: 'transform 0.2s'
        }}
        onClick={onUpgradeClick}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
      >
        Upgrade →
      </button>
    </div>
  );
};

export default AuditCounter;
