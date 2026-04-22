import React, { useState } from 'react';
import { openRazorpayCheckout } from '../utils/razorpay';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const UpgradeModal = ({ reason, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { isDark } = useTheme();

  const reasons = {
    limit_reached: {
      icon: "⚡",
      title: "Limit Reached",
      subtitle: "You've used all 3 free audits today. Upgrade for unlimited access."
    },
    jurisdiction_locked: {
      icon: "🌍",
      title: "Jurisdiction Locked",
      subtitle: "Multiple jurisdictions are a Pro feature. Unlock global compliance."
    },
    pdf_locked: {
      icon: "📄",
      title: "PDF Export Locked",
      subtitle: "Download professional audit reports with the Pro plan."
    }
  };

  const content = reasons[reason] || reasons.limit_reached;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await openRazorpayCheckout(
        () => {
          setLoading(false);
          setShowSuccess(true);
          if (onSuccess) onSuccess();
        },
        (err) => {
          setLoading(false);
          console.error(err);
          alert("Payment failed or cancelled. Please check your API keys.");
        }
      );
    } catch (err) {
      setLoading(false);
      console.error(err);
    }
  };

  const colors = {
    bg: isDark ? '#111827' : '#ffffff',
    border: isDark ? 'rgba(109, 40, 217, 0.4)' : 'rgba(109, 40, 217, 0.2)',
    text: isDark ? '#ffffff' : '#1f2937',
    subtext: isDark ? '#9ca3af' : '#6b7280',
    featureBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(109, 40, 217, 0.03)',
    featureBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(109, 40, 217, 0.08)',
  };

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1.5rem'
  };

  const modalContentStyle = {
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: '24px',
    padding: '2rem',
    maxWidth: '380px',
    width: '100%',
    boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.8)' : '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    textAlign: 'center',
    color: colors.text
  };

  if (showSuccess) {
    return (
      <div style={modalOverlayStyle} onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={modalContentStyle} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem', color: colors.text }}>Upgrade Successful!</h2>
          <p style={{ color: colors.subtext, marginBottom: '1.5rem', lineHeight: 1.6, fontSize: '0.9rem' }}>Welcome to EquiAI Pro. Your account is now fully unlocked.</p>
          <button 
            style={{ width: '100%', padding: '0.85rem', background: '#6d28d9', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
            onClick={onClose}
          >
            Start Auditing →
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={modalContentStyle} onClick={e => e.stopPropagation()}>
        <div style={{
          width: '56px', height: '56px', background: 'rgba(109, 40, 217, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', margin: '0 auto 1.25rem', border: `1.5px solid ${colors.border}`
        }}>{content.icon}</div>
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em', color: colors.text }}>{content.title}</h2>
        <p style={{ color: colors.subtext, fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>{content.subtitle}</p>

        <div style={{ background: colors.featureBg, border: `1px solid ${colors.featureBorder}`, borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
          {[
            "Unlimited daily audits",
            "Full Global Compliance suite",
            "AI remediation hints",
            "PDF reports & CSV exports",
            "Priority support"
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: i === 4 ? 0 : '10px' }}>
              <div style={{ width: '16px', height: '16px', background: '#6d28d9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
              </div>
              <span style={{ color: colors.text, fontSize: '0.85rem', fontWeight: 500 }}>{f}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: colors.text }}>₹749<span style={{ fontSize: '1rem', color: colors.subtext, fontWeight: 600 }}>/mo</span></div>
          <p style={{ fontSize: '0.8rem', color: colors.subtext, marginTop: '2px' }}>Cancel anytime. No hidden fees.</p>
        </div>

        <button 
          style={{
            width: '100%', padding: '0.9rem', background: '#6d28d9', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer',
            boxShadow: '0 8px 15px -4px rgba(109, 40, 217, 0.4)', transition: 'all 0.2s', marginBottom: '1rem', opacity: loading ? 0.7 : 1
          }} 
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? "Connecting..." : `Unlock Pro Features`}
        </button>

        <button 
          style={{ background: 'none', border: 'none', color: colors.subtext, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
          onClick={onClose}
        >
          Maybe later
        </button>
      </motion.div>
    </div>
  );
};

export default UpgradeModal;
