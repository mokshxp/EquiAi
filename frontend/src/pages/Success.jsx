import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { setPlan } from '../utils/session';

const Success = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Ensure local storage is updated just in case
    setPlan('pro');
    
    // Redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate('/');
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #6d28d9, #1f2937)',
      padding: '2rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '32px',
          padding: '3.5rem',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, delay: 0.2 }}
          style={{
            width: '80px',
            height: '80px',
            background: '#6d28d9',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            margin: '0 auto 24px'
          }}
        >
          ✨
        </motion.div>
        
        <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 900, marginBottom: '16px', letterSpacing: '-0.02em' }}>
          Welcome to Pro!
        </h1>
        
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '32px' }}>
          Your payment was successful. You now have unlimited access to all EquiAI premium features including PDF exports and all jurisdictions.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={() => navigate('/')}
            style={{
              padding: '1rem',
              background: '#6d28d9',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Start Auditing Now
          </button>
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.9rem' }}>
            Redirecting to dashboard in 5 seconds...
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Success;
