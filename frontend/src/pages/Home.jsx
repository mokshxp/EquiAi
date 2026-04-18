import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { runBiasAnalysis } from '../utils/biasDetection';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '../context/ThemeContext';

const fadeUp  = { initial:{opacity:0,y:20}, animate:{opacity:1,y:0}, transition:{duration:0.5,ease:[0.22,1,0.36,1]} };
const stagger = { animate:{ transition:{ staggerChildren:0.07 } } };

const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior:'smooth' });

/* ── Modal Content Map ─────────────────────────────────────── */
const MODAL_CONTENT = {
  'Privacy Policy': {
    icon: '🔒',
    sections: [
      { h: 'Data We Collect', p: 'EquiAI collects only the data required to perform bias audits: uploaded datasets (temporarily processed in-memory), usage metadata, and account identifiers. We do not store uploaded datasets on disk after a session ends.' },
      { h: 'How We Use Your Data', p: 'Your data is used exclusively to generate bias analysis reports. We never sell, share, or use your data for advertising. AI explanations are processed via the Gemini API under Google\'s enterprise data protection policy.' },
      { h: 'Data Retention', p: 'Session data is purged immediately after your audit completes. Blockchain audit hashes are public by nature but contain no personally identifiable information — only a cryptographic fingerprint.' },
      { h: 'Your Rights', p: 'You have the right to access, correct, or delete any personal data we hold. To exercise these rights, contact privacy@equiai.io. We respond to all verified requests within 30 days.' },
      { h: 'Contact', p: 'Data Controller: EquiAI Inc., 123 Fairness Ave, San Francisco CA 94105. DPO: dpo@equiai.io' },
    ]
  },
  'Terms of Use': {
    icon: '📋',
    sections: [
      { h: 'Acceptance of Terms', p: 'By accessing or using EquiAI, you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, you may not use our services.' },
      { h: 'Permitted Use', p: 'EquiAI is licensed for lawful bias auditing purposes only. You may not use the platform to process illegal data, circumvent anti-discrimination regulations, or reverse-engineer our proprietary scoring algorithms.' },
      { h: 'Intellectual Property', p: 'All audit methodologies, UI designs, and scoring algorithms are the exclusive property of EquiAI Inc. The EEOC 4/5ths rule implementation is based on public regulatory standards.' },
      { h: 'Limitation of Liability', p: 'EquiAI provides bias analysis as a decision-support tool, not a legal opinion. Our maximum liability for any claim arising from use of the service is limited to the fees paid in the preceding 12 months.' },
      { h: 'Governing Law', p: 'These terms are governed by the laws of the State of California, USA, without regard to conflict of law provisions.' },
    ]
  },
  'Security': {
    icon: '🛡️',
    sections: [
      { h: 'Infrastructure Security', p: 'EquiAI runs on ISO 27001-certified cloud infrastructure. All data in transit is encrypted using TLS 1.3. Data at rest uses AES-256 encryption.' },
      { h: 'Audit Immutability', p: 'Every audit is sealed with a SHA-256 hash written to the Polygon blockchain, creating a tamper-proof, publicly verifiable record of compliance checks.' },
      { h: 'Access Control', p: 'We enforce role-based access control (RBAC), multi-factor authentication, and principle of least privilege across all internal systems.' },
      { h: 'Vulnerability Disclosure', p: 'We operate a responsible disclosure program. If you discover a security vulnerability, please report it to security@equiai.io. We commit to a 48-hour initial response SLA.' },
      { h: 'Compliance', p: 'EquiAI is GDPR, CCPA, and SOC 2 Type II compliant. Annual penetration tests are conducted by independent third-party firms.' },
    ]
  },
  'Cookies': {
    icon: '🍪',
    sections: [
      { h: 'What We Use', p: 'EquiAI uses strictly necessary cookies for session management and authentication. We do not use advertising, tracking, or third-party analytics cookies.' },
      { h: 'Session Cookies', p: 'Temporary cookies are set to maintain your audit session state. These expire when you close your browser and contain no personally identifiable information.' },
      { h: 'Preference Cookies', p: 'If you adjust UI preferences (e.g. theme, language), we store these locally via localStorage — not cookies — and never transmit them to our servers.' },
      { h: 'Managing Cookies', p: 'You can control cookies through your browser settings. Disabling strictly necessary cookies may impact core functionality such as maintaining your login state.' },
    ]
  },
  'About Us': {
    icon: '🌍',
    sections: [
      { h: 'Our Mission', p: `EquiAI was founded in ${new Date().getFullYear()} with one mission: make algorithmic decision-making fair for everyone. We believe AI systems should be transparent, auditable, and unbiased by design.` },
      { h: 'The Problem We Solve', p: 'Automated hiring, lending, and healthcare algorithms increasingly shape human outcomes — but most organisations have no way to verify these systems are free of illegal discrimination. EquiAI changes that.' },
      { h: 'Our Approach', p: 'We combine EEOC adverse impact analysis, generative AI explanations, and blockchain immutability to create the world\'s first end-to-end algorithmic compliance platform.' },
      { h: 'The Team', p: 'Our team spans legal compliance, machine learning, and blockchain engineering. We partner with universities, HR associations, and civil society organisations to continuously improve our fairness standards.' },
    ]
  },
  'SDG Mission': {
    icon: '⚖️',
    sections: [
      { h: 'SDG 10 — Reduced Inequalities', p: 'EquiAI directly contributes to UN Sustainable Development Goal 10 by providing tools that detect and reduce systematic inequalities embedded in automated decision systems used by governments and corporations.' },
      { h: 'SDG 5 — Gender Equality', p: 'Our gender bias detection module specifically flags disparate impact in hiring, credit, and healthcare decisions, supporting SDG 5 by ensuring AI systems do not perpetuate gender discrimination.' },
      { h: 'SDG 16 — Peace, Justice & Strong Institutions', p: 'By creating tamper-proof, blockchain-sealed audit trails, EquiAI supports accountable institutions and rule-of-law frameworks around algorithmic governance.' },
      { h: 'Our Commitment', p: 'We donate 5% of annual revenue to digital rights organisations and provide free audit access to government bodies in developing nations aligning with SDG objectives.' },
    ]
  },
  'Blog': {
    icon: '✍️',
    sections: [
      { h: 'Latest: EEOC 4/5ths Rule Explained', p: 'The EEOC adverse impact rule states that a selection rate less than 80% of the highest group rate indicates potential discrimination. Learn how EquiAI automates this calculation across thousands of rows in seconds.' },
      { h: 'Case Study: Hiring Bias in Tech', p: 'Our analysis of 14 anonymised hiring datasets found that 67% showed statistically significant gender or racial bias. Read how three companies eliminated bias using EquiAI\'s remediation recommendations.' },
      { h: 'Blockchain + AI Compliance: A New Paradigm', p: 'Traditional audit logs can be altered. By combining AI analysis with Polygon blockchain sealing, EquiAI creates the first truly immutable compliance record — a game-changer for legal defensibility.' },
      { h: 'Coming Soon', p: 'Subscribe to our newsletter to get notified when new research, case studies, and regulatory updates are published. newsletter@equiai.io' },
    ]
  },
  'Careers': {
    icon: '🚀',
    sections: [
      { h: 'Why Join EquiAI?', p: 'We are building infrastructure for AI fairness that will shape how billions of algorithmic decisions are governed. Join a mission-driven team solving one of the most important challenges in technology.' },
      { h: 'Open Roles', p: '• Senior ML Engineer — Bias Detection Models\n• Full-Stack Engineer — React / FastAPI\n• Legal Compliance Analyst\n• Blockchain Engineer — Solidity / Polygon\n• Developer Relations Manager' },
      { h: 'Our Culture', p: 'Remote-first, async-friendly, and deeply committed to diversity. We practice what we preach — our own hiring process is audited quarterly using EquiAI.' },
      { h: 'How to Apply', p: 'Send your CV and a short note on why algorithmic fairness matters to you at careers@equiai.io. No cover letter templates — we want your genuine perspective.' },
    ]
  },
  'Audit Engine': {
    icon: '⚙️',
    sections: [
      { h: 'How It Works', p: 'The EquiAI Audit Engine ingests structured datasets (CSV, XLSX, or JSON), auto-detects decision columns and protected demographic attributes, then computes EEOC 4/5ths adverse impact ratios for every group pair.' },
      { h: 'Scoring Model', p: 'Each audit produces a 0–100 Bias Score. Scores above 80 indicate mostly fair outcomes. Scores 60–79 trigger a Warning. Scores below 60 indicate Statistically Significant Bias under EEOC guidelines.' },
      { h: 'Supported Attributes', p: 'Gender, Race/Ethnicity, Age Group, Nationality, Disability Status, Religion, and any custom categorical column in your dataset.' },
      { h: 'Performance', p: 'The engine processes datasets of up to 500,000 rows in under 3 seconds. All computation is performed server-side — raw data never leaves your session.' },
    ]
  },
  'API Docs': {
    icon: '📡',
    sections: [
      { h: 'REST API Overview', p: 'The EquiAI API allows you to integrate bias auditing directly into your ML pipelines, HR systems, or CI/CD workflows. Base URL: https://api.equiai.io/v1' },
      { h: 'POST /audit', p: 'Submit a dataset for bias analysis.\nRequest: multipart/form-data with your CSV file.\nResponse: { bias_score, bias_level, column_analyses, decision_col }\nAuth: Bearer token required.' },
      { h: 'GET /audit/{id}', p: 'Retrieve a previous audit result by its unique ID. Results are cached for 24 hours. Blockchain hash is included in the response for independent verification.' },
      { h: 'Webhooks', p: 'Register a webhook URL to receive real-time notifications when an audit completes. Supports HMAC-SHA256 request signing for security.' },
    ]
  },
  'Integrations': {
    icon: '🔌',
    sections: [
      { h: 'HR Systems', p: 'Native integrations with Greenhouse, Lever, Workday, and SAP SuccessFactors. Automatically audit every hiring cohort in real time without manual CSV exports.' },
      { h: 'ML Platforms', p: 'Integrates with MLflow, Weights & Biases, and Vertex AI to audit model predictions as part of your experiment tracking workflow.' },
      { h: 'Data Platforms', p: 'Connect directly to Snowflake, BigQuery, or Databricks. Query your prediction tables and audit them without ever downloading data to your local machine.' },
      { h: 'SIEM / Compliance Tools', p: 'Push audit logs to Splunk, Elastic SIEM, or your GRC platform of choice via our syslog-compatible webhook format.' },
    ]
  },
  'Changelog': {
    icon: '📝',
    sections: [
      { h: `v2.0 — April ${new Date().getFullYear()}`, p: '• Blockchain sealing on Polygon mainnet\n• Gemini AI explanations with contextual bias narratives\n• Redesigned Bias Score ring with animated SVG\n• PDF report export with jsPDF\n• New: Remediation recommendations module' },
      { h: `v1.5 — January ${new Date().getFullYear()}`, p: '• Added support for XLSX file uploads\n• Demographic scan now supports 12 protected categories\n• REST API v1 public release\n• Webhook support for CI/CD pipeline integration' },
      { h: `v1.0 — October ${new Date().getFullYear() - 1}`, p: '• Initial public release\n• EEOC 4/5ths adverse impact engine\n• CSV upload and auto-column detection\n• Bar chart visualisation of group selection rates' },
    ]
  },
};

/* ── Modal Component ───────────────────────────────────────── */
function InfoModal({ page, onClose }) {
  const content = MODAL_CONTENT[page];
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  if (!content) return null;
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(26,22,48,0.65)', backdropFilter:'blur(6px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
        <motion.div
          initial={{ opacity:0, scale:0.93, y:20 }} animate={{ opacity:1, scale:1, y:0 }}
          exit={{ opacity:0, scale:0.95, y:10 }} transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}
          onClick={e => e.stopPropagation()}
          style={{ background:'white', borderRadius:24, maxWidth:640, width:'100%', maxHeight:'85vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 40px 80px rgba(0,0,0,0.3)' }}>
          {/* Header */}
          <div style={{ padding:'1.75rem 2rem 1.25rem', borderBottom:'1px solid #ede9fe', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'linear-gradient(135deg,#f5f3ff,#faf9ff)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#ede9fe,#c4b5fd)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{content.icon}</div>
              <div>
                <div style={{ fontSize:10, fontWeight:800, color:'#7c3aed', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:3 }}>EquiAI</div>
                <h2 style={{ fontSize:'1.25rem', color:'#1a1630', letterSpacing:'-0.02em' }}>{page}</h2>
              </div>
            </div>
            <button onClick={onClose} style={{ width:36, height:36, borderRadius:'50%', border:'1px solid #ede9fe', background:'white', cursor:'pointer', fontSize:18, color:'#9ca3af', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', flexShrink:0 }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#fee2e2'; e.currentTarget.style.color='#dc2626'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='white'; e.currentTarget.style.color='#9ca3af'; }}>
              ✕
            </button>
          </div>
          {/* Body */}
          <div style={{ overflowY:'auto', padding:'1.75rem 2rem 2rem' }}>
            {content.sections.map((s, i) => (
              <div key={i} style={{ marginBottom: i < content.sections.length-1 ? '1.75rem' : 0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:3, height:18, borderRadius:99, background:'linear-gradient(180deg,#8b5cf6,#6d28d9)', flexShrink:0 }}/>
                  <h3 style={{ fontSize:14, fontWeight:800, color:'#1a1630' }}>{s.h}</h3>
                </div>
                <p style={{ fontSize:13, color:'#6b7280', lineHeight:1.75, whiteSpace:'pre-line', paddingLeft:13 }}>{s.p}</p>
              </div>
            ))}
          </div>
          {/* Footer */}
          <div style={{ padding:'1rem 2rem', borderTop:'1px solid #ede9fe', background:'#faf9ff', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            <span style={{ fontSize:11, color:'var(--text-hint)' }}>© {new Date().getFullYear()} EquiAI Inc.</span>
            <button onClick={onClose} style={{ padding:'7px 20px', background:'linear-gradient(135deg,#8b5cf6,#6d28d9)', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>Close</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Navbar ────────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { isDark, toggle } = useTheme();
  useEffect(()=>{
    const fn=()=>setScrolled(window.scrollY>20);
    window.addEventListener('scroll',fn); return()=>window.removeEventListener('scroll',fn);
  },[]);
  return (
    <nav style={{
      position:'sticky',top:0,zIndex:999,height:60,display:'flex',alignItems:'center',
      background:'var(--nav-bg)',backdropFilter:'blur(20px)',
      borderBottom:'1px solid var(--nav-border)',
      boxShadow: scrolled?'0 4px 24px rgba(109,40,217,0.09)':'none',
      transition:'box-shadow 0.3s'
    }}>
      <div style={{maxWidth:1320,width:'100%',margin:'0 auto',padding:'0 1.75rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:34,height:34,borderRadius:10,background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',boxShadow:'0 4px 12px rgba(109,40,217,0.38)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:12}}>EQ</div>
          <span style={{fontSize:'1.18rem',fontWeight:900,color:'var(--text-primary)',letterSpacing:'-0.04em'}}>Equi<span style={{color:'#7c3aed'}}>AI</span></span>
        </div>
        <div style={{display:'flex',gap:20,alignItems:'center'}}>
          {['Features','Demo','Workflow'].map(item=>(
            <a key={item} href={`#${item.toLowerCase()}`} style={{fontSize:13,fontWeight:600,color:'var(--text-muted)',textDecoration:'none',transition:'color 0.2s'}}
              onMouseEnter={e=>e.target.style.color='#6d28d9'} onMouseLeave={e=>e.target.style.color='var(--text-muted)'}>{item}</a>
          ))}

          {/* Theme Toggle */}
          <div
            onClick={toggle}
            style={{width:48,height:26,borderRadius:99,cursor:'pointer',position:'relative',
              background:isDark?'linear-gradient(135deg,#8b5cf6,#6d28d9)':'linear-gradient(135deg,#e0e7ff,#c4b5fd)',
              boxShadow:'0 2px 8px rgba(109,40,217,0.3)',transition:'background 0.3s',flexShrink:0}}
            title={isDark?'Switch to Light Mode':'Switch to Dark Mode'}>
            <div style={{position:'absolute',top:4,width:18,height:18,borderRadius:'50%',background:'white',
              boxShadow:'0 1px 4px rgba(0,0,0,0.2)',transition:'left 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              left:isDark?26:4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10}}>
              {isDark?'🌙':'☀️'}
            </div>
          </div>

          <button onClick={()=>scrollTo('demo')} style={{padding:'7px 18px',background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 14px rgba(109,40,217,0.35)'}}>Audit Now ↗</button>
        </div>
      </div>
    </nav>
  );
}

/* ── Pill ──────────────────────────────────────────────────── */
const Pill = ({children})=>(
  <motion.div variants={fadeUp} style={{display:'inline-flex',alignItems:'center',gap:7,padding:'4px 13px',borderRadius:99,marginBottom:12,background:'rgba(109,40,217,0.08)',border:'1px solid rgba(109,40,217,0.18)',color:'#6d28d9',fontSize:10,fontWeight:800,letterSpacing:'0.09em',textTransform:'uppercase'}}>
    {children}
  </motion.div>
);

/* ── Orbit Globe ───────────────────────────────────────────── */
function OrbitVisual() {
  return (
    <div className="animate-float" style={{position:'relative',width:310,height:310,flexShrink:0}}>
      <div style={{position:'absolute',inset:-20,borderRadius:'50%',background:'radial-gradient(circle,rgba(109,40,217,0.1),transparent 70%)',filter:'blur(20px)'}}/>
      {/* Outer orbit */}
      <div className="animate-orbit-rev" style={{position:'absolute',inset:0,borderRadius:'50%',border:'1.5px dashed rgba(196,181,253,0.5)'}}>
        {[{top:'-17px',left:'calc(50% - 17px)',e:'⚖️'},{bottom:'-17px',left:'calc(50% - 17px)',e:'📊'},{top:'calc(50% - 17px)',right:'-17px',e:'🔗'}].map((o,i)=>(
          <div key={i} style={{position:'absolute',...o,width:34,height:34,borderRadius:'50%',background:'rgba(255,255,255,0.96)',boxShadow:'0 4px 14px rgba(109,40,217,0.18)',border:'1px solid rgba(196,181,253,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{o.e}</div>
        ))}
      </div>
      {/* Middle orbit */}
      <div className="animate-orbit" style={{position:'absolute',inset:42,borderRadius:'50%',border:'1px dashed rgba(167,139,250,0.4)'}}>
        <div style={{position:'absolute',top:'-14px',left:'calc(50% - 14px)',width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#7c3aed,#6d28d9)',boxShadow:'0 3px 10px rgba(109,40,217,0.4)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:9,fontWeight:900}}>AI</div>
      </div>
      {/* Scan ring */}
      <div className="animate-spin-slow" style={{position:'absolute',inset:20,borderRadius:'50%',border:'1px solid transparent',background:'conic-gradient(from 0deg,rgba(109,40,217,0.55) 0deg,transparent 55deg,transparent 360deg)',WebkitMask:'radial-gradient(farthest-side,transparent calc(100% - 2px),white 100%)'}}/>
      {/* Globe */}
      <div style={{position:'absolute',inset:76,borderRadius:'50%',background:'radial-gradient(circle at 35% 35%,#ede9fe,#c4b5fd 60%,#8b5cf6)',boxShadow:'0 16px 50px rgba(109,40,217,0.28),inset 0 -6px 16px rgba(0,0,0,0.07)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:52}}>🌍</div>
      {/* Stat cards */}
      <div style={{position:'absolute',right:-14,top:'14%',padding:'9px 14px',borderRadius:12,background:'rgba(255,255,255,0.85)',backdropFilter:'blur(12px)',border:'1px solid rgba(196,181,253,0.4)',boxShadow:'0 6px 20px rgba(109,40,217,0.1)'}}>
        <div style={{fontSize:9,fontWeight:800,color:'#7c3aed',letterSpacing:'0.1em',textTransform:'uppercase'}}>Bias Score</div>
        <div style={{fontSize:22,fontWeight:900,color:'#1a1630',lineHeight:1.1}}>87<span style={{fontSize:12,color:'#9ca3af'}}>/100</span></div>
      </div>
      <div style={{position:'absolute',left:-12,bottom:'14%',padding:'9px 14px',borderRadius:12,background:'rgba(255,255,255,0.85)',backdropFilter:'blur(12px)',border:'1px solid rgba(110,231,183,0.4)',boxShadow:'0 6px 20px rgba(5,150,105,0.1)'}}>
        <div style={{fontSize:9,fontWeight:800,color:'#059669',letterSpacing:'0.1em',textTransform:'uppercase'}}>Verdict</div>
        <div style={{fontSize:14,fontWeight:900,color:'#1a1630'}}>✓ Fair</div>
      </div>
    </div>
  );
}

/* ── Feature Card ──────────────────────────────────────────── */
function FeatureCard({ f, i }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div variants={fadeUp}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{
        background: hovered ? 'var(--card-bg)' : 'var(--card-bg)',
        borderRadius:18,padding:'1.5rem',position:'relative',overflow:'hidden',
        border: hovered ? `1px solid ${f.accent}` : '1px solid var(--border-card)',
        boxShadow: hovered ? `0 20px 48px -8px ${f.accent}40,0 0 0 1px ${f.accent}30` : '0 2px 12px rgba(109,40,217,0.04)',
        transform: hovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
        transition:'all 0.38s cubic-bezier(0.34,1.56,0.64,1)',cursor:'default'
      }}>

      {/* Glow bg on hover */}
      <div style={{position:'absolute',inset:0,borderRadius:18,background:`radial-gradient(circle at 20% 20%,${f.accent}18,transparent 65%)`,opacity:hovered?1:0,transition:'opacity 0.4s'}}/>

      {/* Animated top bar */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,borderRadius:'18px 18px 0 0',background:f.gradient,transform:hovered?'scaleX(1)':'scaleX(0)',transformOrigin:'left',transition:'transform 0.4s ease'}}/>

      {/* Index badge */}
      <div style={{position:'absolute',top:14,right:16,fontSize:11,fontWeight:800,color:hovered?f.accent:'#e5e7eb',transition:'color 0.3s',letterSpacing:'-0.02em'}}>{String(i+1).padStart(2,'0')}</div>

      {/* Icon */}
      <div style={{
        width:46,height:46,borderRadius:13,marginBottom:14,
        background:f.iconBg,
        boxShadow:hovered?`0 8px 20px ${f.accent}40`:'0 2px 8px rgba(0,0,0,0.06)',
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,
        transform:hovered?'scale(1.12) rotate(-4deg)':'scale(1) rotate(0deg)',
        transition:'transform 0.4s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.3s'
      }}>{f.e}</div>

      {/* Tag */}
      <div style={{fontSize:9,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:f.accent,marginBottom:7}}>{f.tag}</div>

      {/* Title */}
      <h3 style={{fontSize:15,marginBottom:7,color:'var(--text-primary)'}}>{f.t}</h3>

      {/* Description */}
      <p style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.65,margin:0}}>{f.d}</p>

      {/* Hover reveal — stat highlight, no fake buttons */}
      <div style={{
        marginTop:14,paddingTop:12,borderTop:`1px solid ${f.accent}30`,
        display:'flex',justifyContent:'space-between',alignItems:'center',
        height:hovered?38:0,overflow:'hidden',opacity:hovered?1:0,
        transition:'all 0.38s ease'
      }}>
        <span style={{fontSize:11,color:'#9ca3af',fontWeight:600}}>{f.stat}</span>
        <span style={{fontSize:10,padding:'3px 10px',borderRadius:99,background:f.iconBg,color:f.accent,fontWeight:800,letterSpacing:'0.04em'}}>{f.statVal}</span>
      </div>
    </motion.div>
  );
}

/* ── Step Card ─────────────────────────────────────────────── */
function StepCard({ s, i, total }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{position:'relative',display:'flex',gap:0}}>
      {/* Timeline spine */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginRight:20,flexShrink:0}}>
        <div style={{
          width:42,height:42,borderRadius:12,flexShrink:0,
          background: hovered ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
          border: hovered ? '1px solid transparent' : '1px solid #c4b5fd',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:16,fontWeight:900,color:hovered?'white':'#6d28d9',
          boxShadow:hovered?'0 8px 20px rgba(109,40,217,0.3)':'0 2px 8px rgba(109,40,217,0.1)',
          transition:'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',zIndex:2
        }}>{i+1}</div>
        {i < total-1 && (
          <div style={{width:2,flex:1,minHeight:28,background:'linear-gradient(180deg,#ddd6fe,transparent)',marginTop:4}}/>
        )}
      </div>
      {/* Card */}
      <motion.div
        variants={fadeUp}
        onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
        style={{
          flex:1,marginBottom:i<total-1?12:0,padding:'1.1rem 1.4rem',borderRadius:14,
          background:hovered?'var(--card-bg)':'rgba(var(--card-bg), 0.5)',
          border: hovered?'1px solid rgba(196,181,253,0.8)':'1px solid var(--border-card)',
          boxShadow:hovered?'0 12px 30px rgba(109,40,217,0.1)':'none',
          transition:'all 0.35s ease', cursor:'default'
        }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:10,fontWeight:800,color:hovered?'#7c3aed':'#9ca3af',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:5,transition:'color 0.3s'}}>{s.tag}</div>
            <h4 style={{fontSize:15,fontWeight:800,color:'#1a1630',marginBottom:6}}>{s.t}</h4>
            <p style={{fontSize:13,color:'#6b7280',margin:0,lineHeight:1.65}}>{s.d}</p>
          </div>
          <div style={{fontSize:22,marginLeft:14,opacity:hovered?1:0.3,transform:hovered?'scale(1.1)':'scale(1)',transition:'all 0.3s',flexShrink:0}}>{s.e}</div>
        </div>
        {hovered && (
          <div style={{marginTop:10,paddingTop:9,borderTop:'1px solid rgba(196,181,253,0.3)',display:'flex',gap:8}}>
            {s.chips.map(c=>(
              <span key={c} style={{fontSize:10,padding:'3px 9px',borderRadius:99,background:'rgba(109,40,217,0.08)',color:'#6d28d9',fontWeight:700}}>{c}</span>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ── MAIN ──────────────────────────────────────────────────── */
export default function Home() {
  const [results, setResults]         = useState(null);
  const [selectedCol, setSelectedCol] = useState('');
  const [modalPage, setModalPage]     = useState(null);
  const { isDark }                    = useTheme();

  const handleSampleUpload = () => {
    const csv = ['Name,Gender,Race,Selected','Alice,Female,Asian,No','Bob,Male,White,Yes','Carol,Female,Black,No','David,Male,White,Yes','Eva,Female,Hispanic,No','Frank,Male,Asian,Yes','Grace,Female,White,No','Henry,Male,Black,Yes','Isabella,Female,Asian,No','James,Male,Hispanic,Yes','Karen,Female,White,Yes','Leo,Male,Black,No','Maria,Female,Hispanic,No','Nathan,Male,White,Yes','Olivia,Female,Black,No','Paul,Male,Asian,Yes'].join('\n');
    const lines=csv.split('\n'), headers=lines[0].split(',');
    const data=lines.slice(1).map(l=>headers.reduce((a,h,i)=>({...a,[h]:l.split(',')[i]}),{}));
    setResults(runBiasAnalysis(data));
  };

  useEffect(()=>{if(results&&!selectedCol)setSelectedCol(results.demographicCols[0]);},[results]);

  const currentAnalysis = results?.columnAnalyses[selectedCol];
  const chartData = currentAnalysis ? Object.entries(currentAnalysis.groupRates).map(([g,r])=>({name:g,rate:Number((r*100).toFixed(1))})) : [];
  const vs = !results ? null :
    results.overallBiasLevel==='BIASED'  ? {bg:'#fee2e2',txt:'#dc2626',border:'#fca5a5',dot:'#ef4444',label:'⚠ Bias Detected'} :
    results.overallBiasLevel==='WARNING' ? {bg:'#fef3c7',txt:'#d97706',border:'#fcd34d',dot:'#f59e0b',label:'⚡ Warning'} :
    {bg:'#d1fae5',txt:'#059669',border:'#6ee7b7',dot:'#10b981',label:'✓ Mostly Fair'};

  const features = [
    {t:'Adverse Impact',   d:'Automated EEOC 4/5ths rule to surface hidden decision bias across all groups.',           e:'📊',iconBg:'linear-gradient(135deg,#ede9fe,#c4b5fd)',accent:'#7c3aed',gradient:'linear-gradient(90deg,#8b5cf6,#6d28d9)',tag:'Statistical',   stat:'Columns analyzed',   statVal:'Auto-detected'},
    {t:'AI Explainer',     d:'Plain-language summaries of exactly why and where bias exists in the model.',              e:'🧠',iconBg:'linear-gradient(135deg,#d1fae5,#6ee7b7)',accent:'#059669',gradient:'linear-gradient(90deg,#10b981,#059669)',tag:'Generative AI', stat:'Explanation quality', statVal:'Powered by Gemini'},
    {t:'Blockchain Seal',  d:'Immutable on-chain hash for every audit — tamper-proof and permanently timestamped.',      e:'🔗',iconBg:'linear-gradient(135deg,#fef3c7,#fcd34d)',accent:'#d97706',gradient:'linear-gradient(90deg,#f59e0b,#d97706)',tag:'Web3',           stat:'Hash algorithm',     statVal:'SHA-256'},
    {t:'Demographic Scans',d:'Deep-dive analysis: gender, race, age, nationality, and 10+ protected dimensions.',        e:'🔍',iconBg:'linear-gradient(135deg,#fee2e2,#fca5a5)',accent:'#dc2626',gradient:'linear-gradient(90deg,#ef4444,#dc2626)',tag:'Analytics',     stat:'Protected categories', statVal:'12+ supported'},
    {t:'Remediation',      d:'Actionable, step-by-step guidance to reduce bias without sacrificing model accuracy.',     e:'✅',iconBg:'linear-gradient(135deg,#e0e7ff,#a5b4fc)',accent:'#4f46e5',gradient:'linear-gradient(90deg,#6366f1,#4f46e5)',tag:'Guidance',       stat:'Avg. improvement',   statVal:'~30% DI lift'},
    {t:'PDF Reports',      d:'One-click, professionally formatted reports ready for legal teams and executive filings.',  e:'📄',iconBg:'linear-gradient(135deg,#ecfdf5,#6ee7b7)',accent:'#059669',gradient:'linear-gradient(90deg,#10b981,#059669)',tag:'Export',         stat:'Report format',      statVal:'PDF + JSON'},
  ];

  const steps = [
    {t:'Secure Ingestion',   d:'Upload HR, credit, or policy decision data through our encrypted endpoint or standard REST API.',e:'📥',tag:'Input Layer',   chips:['CSV','XLSX','API']},
    {t:'Statistical Engine', d:'Automated computation of selection rates, DI ratios, and EEOC 4/5ths adverse impact flags.',   e:'⚙️',tag:'Core Analysis', chips:['EEOC','DI Ratio','p-value']},
    {t:'AI Translation',     d:'Gemini model converts complex statistics into actionable, plain-language compliance findings.',  e:'🧠',tag:'Generative AI', chips:['Gemini','RAG','NLP']},
    {t:'Blockchain Sealing', d:'SHA-256 hash of every audit is written on-chain — creating a tamper-proof compliance record.', e:'🔗',tag:'Ledger',         chips:['SHA-256','Polygon','IPFS']},
  ];

  return (
    <div style={{background:'var(--bg)',minHeight:'100vh',transition:'background 0.35s ease'}}>
      {modalPage && <InfoModal page={modalPage} onClose={()=>setModalPage(null)}/>}
      <Navbar/>
      {/* ════ HERO ════ */}
      <section style={{background:'var(--bg-hero)',borderBottom:'1px solid var(--border)',padding:'4.5rem 2rem 5.5rem',position:'relative',overflow:'hidden',minHeight:'calc(100vh - 60px)',display:'flex',alignItems:'center'}}>
        <div style={{position:'absolute',top:'-25%',right:'-8%',width:'45%',height:'90%',borderRadius:'50%',background:'radial-gradient(circle,rgba(109,40,217,0.09),transparent 70%)',filter:'blur(50px)',pointerEvents:'none'}}/>
        <div style={{maxWidth:1320,margin:'0 auto',display:'flex',alignItems:'center',gap:56,flexWrap:'wrap'}}>
          <motion.div style={{flex:1,minWidth:280}} initial="initial" animate="animate" variants={stagger}>
            <motion.div variants={fadeUp}><Pill><span style={{width:6,height:6,borderRadius:'50%',background:'#7c3aed',display:'inline-block'}} className="animate-pulse-glow"/>AI Compliance Standard v2.0</Pill></motion.div>
            <motion.h1 variants={fadeUp} style={{fontSize:'clamp(2.2rem,4.5vw,4rem)',lineHeight:1.07,marginBottom:'1.2rem',color:'var(--text-primary)',letterSpacing:'-0.03em'}}>
              Audit Your AI for<br/><span style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9,#818cf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Decision Fairness</span>
            </motion.h1>
            <motion.p variants={fadeUp} style={{fontSize:'1.05rem',maxWidth:470,marginBottom:'2rem',color:'var(--text-muted)',lineHeight:1.78}}>
              Instantly detect algorithmic bias using global EEOC standards. Transform HR, credit, and policy datasets into verifiable fairness certificates.
            </motion.p>
            <motion.div variants={fadeUp} style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:'2.5rem'}}>
              <button onClick={()=>document.getElementById('demo')?.scrollIntoView({behavior:'smooth'})} style={{padding:'11px 26px',background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',color:'white',border:'none',borderRadius:11,fontSize:14,fontWeight:700,cursor:'pointer',boxShadow:'0 8px 22px rgba(109,40,217,0.38)',transition:'all 0.3s'}}
                onMouseEnter={e=>{e.target.style.transform='translateY(-2px)';e.target.style.boxShadow='0 14px 30px rgba(109,40,217,0.45)';}}
                onMouseLeave={e=>{e.target.style.transform='translateY(0)';e.target.style.boxShadow='0 8px 22px rgba(109,40,217,0.38)';}}>
                Launch Live Audit →
              </button>
              <button onClick={()=>scrollTo('workflow')} style={{padding:'11px 26px',background:'var(--nav-bg)',color:'#8b5cf6',border:'1.5px solid var(--border)',borderRadius:11,fontSize:14,fontWeight:700,cursor:'pointer',backdropFilter:'blur(8px)',transition:'all 0.3s'}}
                onMouseEnter={e=>e.target.style.background='var(--surface-2)'}
                onMouseLeave={e=>e.target.style.background='var(--nav-bg)'}>
                How It Works ↓
              </button>
            </motion.div>
            <motion.div variants={fadeUp} style={{display:'flex',flexWrap:'wrap',gap:12}}>
              {[{v:'100%',l:'Verifiability'},{v:'EEOC',l:'Standard'},{v:'GDPR',l:'Compliant'}].map(s=>(
                <div key={s.l} style={{padding:'8px 18px',borderRadius:10,background:'rgba(255,255,255,0.72)',border:'1px solid rgba(196,181,253,0.45)',backdropFilter:'blur(8px)',textAlign:'center'}}>
                  <div style={{fontSize:'1.3rem',fontWeight:900,color:'#6d28d9',lineHeight:1}}>{s.v}</div>
                  <div style={{fontSize:9,fontWeight:700,color:'#9ca3af',letterSpacing:'0.12em',textTransform:'uppercase'}}>{s.l}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
          <motion.div className="hidden md:block" initial={{opacity:0,x:40}} animate={{opacity:1,x:0}} transition={{duration:0.85,delay:0.15}}>
            <OrbitVisual/>
          </motion.div>
        </div>
      </section>

      {/* ════ FEATURES ════ */}
      <section id="features" style={{background:'var(--bg)',padding:'4.5rem 1.5rem'}}>
        <div style={{maxWidth:1320,margin:'0 auto'}}>
        <motion.div initial="initial" whileInView="animate" viewport={{once:true}} variants={stagger}>
          <motion.div variants={fadeUp} style={{textAlign:'center',marginBottom:'2.5rem'}}>
            <Pill>Core Capabilities</Pill>
            <h2 style={{fontSize:'2rem',marginBottom:10}}>Comprehensive Fairness Suite</h2>
            <p style={{color:'#6b7280',maxWidth:420,margin:'0 auto',fontSize:14}}>Every tool you need to detect, explain, and remediate algorithmic bias at scale.</p>
          </motion.div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:24}}>
            {features.map((f,i)=><FeatureCard key={i} f={f} i={i}/>)}
          </div>
        </motion.div>
        </div>
      </section>
      {/* ════ DEMO ════ */}
      <section id="demo" style={{background:'var(--surface-2)',borderTop:'1px solid var(--border-card)',borderBottom:'1px solid var(--border-card)',padding:'4.5rem 1.5rem'}}>
        <div style={{maxWidth:1320,margin:'0 auto'}}>
          <motion.div initial="initial" whileInView="animate" viewport={{once:true}} variants={stagger}>
            <motion.div variants={fadeUp} style={{textAlign:'center',marginBottom:'2.5rem'}}>
              <Pill>Interactive Audit</Pill>
              <h2 style={{fontSize:'2rem',marginBottom:8}}>See Fairness in Real-Time</h2>
              <p style={{color:'#6b7280',fontSize:14}}>Load our sample hiring dataset and watch the engine score it instantly.</p>
            </motion.div>

            {/* Upload zone */}
            <motion.div variants={fadeUp}
              onClick={handleSampleUpload}
              style={{
                background: isDark ? 'linear-gradient(135deg, rgba(26,26,26,0.6), rgba(10,10,10,0.4))' : 'linear-gradient(135deg,rgba(245,243,255,0.8),rgba(237,233,254,0.5))',
                border: isDark ? '2px dashed rgba(255,255,255,0.15)' : '2px dashed rgba(196,181,253,0.8)',
                borderRadius:20,padding:'2.5rem',textAlign:'center',cursor:'pointer',transition:'all 0.3s',marginBottom:results?24:0
              }}
              whileHover={{
                borderColor: isDark ? 'rgba(109,40,217,0.8)' : 'rgba(109,40,217,0.6)',
                background: isDark ? 'rgba(26,26,26,0.9)' : 'rgba(245,243,255,0.98)'
              }}>
              <div style={{fontSize:38,marginBottom:10}}>📂</div>
              <h4 style={{fontSize:16,marginBottom:5,color:'var(--text-primary)'}}>Drop Your Dataset Here</h4>
              <p style={{color:'var(--text-muted)',fontSize:12,marginBottom:18}}>CSV / XLSX — up to 50MB</p>
              <div style={{display:'flex',justifyContent:'center',gap:10}}>
                <span style={{padding:'8px 18px',borderRadius:9,background:'var(--card-bg)',border:'1px solid var(--border)',color:'var(--text-muted)',fontSize:12,fontWeight:700}}>Browse Files</span>
                <span style={{padding:'8px 18px',borderRadius:9,background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',color:'white',fontSize:12,fontWeight:700,boxShadow:'0 4px 12px rgba(109,40,217,0.3)'}}>⚡ Load Sample</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Results */}
          <AnimatePresence>
            {results && (
              <motion.div key="r" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} style={{display:'flex',flexDirection:'column',gap:16}}>
                {/* Verdict */}
                <div style={{background:'var(--card-bg)',border:'1px solid var(--border-card)',borderRadius:18,padding:'1.5rem',display:'flex',flexWrap:'wrap',gap:20,alignItems:'center',boxShadow:'0 4px 20px rgba(109,40,217,0.06)'}}>
                  <div style={{position:'relative',width:96,height:96,flexShrink:0}}>
                    <svg width="96" height="96" viewBox="0 0 96 96" style={{transform:'rotate(-90deg)'}}>
                      <circle cx="48" cy="48" r="40" fill="none" stroke="#f1f5f9" strokeWidth="7"/>
                      <circle cx="48" cy="48" r="40" fill="none" stroke={vs?.dot||'#6ee7b7'} strokeWidth="7" strokeLinecap="round" strokeDasharray="251.3" strokeDashoffset={251.3*(1-results.overallBiasScore/100)} style={{transition:'stroke-dashoffset 1.4s cubic-bezier(0.34,1.1,0.64,1)',filter:'drop-shadow(0 0 5px currentColor)'}}/>
                    </svg>
                    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                      <span style={{fontSize:22,fontWeight:900,color:'var(--text-primary)',lineHeight:1}}>{results.overallBiasScore}</span>
                      <span style={{fontSize:8,fontWeight:800,color:'var(--text-hint)',letterSpacing:'0.15em',textTransform:'uppercase'}}>score</span>
                    </div>
                  </div>
                  <div style={{flex:1}}>
                    {vs&&<span style={{display:'inline-block',padding:'3px 12px',borderRadius:99,background:vs.bg,color:vs.txt,border:`1px solid ${vs.border}`,fontSize:11,fontWeight:800,letterSpacing:'0.05em',marginBottom:8}}>{vs.label}</span>}
                    <h3 style={{fontSize:18,marginBottom:6,color:'var(--text-primary)'}}>Algorithmic Integrity Report</h3>
                    <p style={{fontSize:13,color:'var(--text-muted)',margin:0}}>Decision column <strong style={{color:'#8b5cf6'}}>"{results.decisionCol}"</strong> analysed across {results.demographicCols.length} demographic dimensions.</p>
                  </div>
                </div>

                {/* Charts */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <div style={{background:'var(--card-bg)',border:'1px solid var(--border-card)',borderRadius:16,padding:'1.25rem',height:300,display:'flex',flexDirection:'column',boxShadow:'0 2px 12px rgba(109,40,217,0.04)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                      <h4 style={{fontSize:13,fontWeight:800,color:'var(--text-primary)'}}>Selection Rates by Group</h4>
                      <select value={selectedCol} onChange={e=>setSelectedCol(e.target.value)} style={{fontSize:11,fontWeight:700,color:'#8b5cf6',background:'var(--input-bg)',border:'1px solid var(--border-card)',borderRadius:7,padding:'3px 8px',outline:'none',cursor:'pointer'}}>
                        {results.demographicCols.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{flex:1}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{top:0,right:0,left:-22,bottom:0}}>
                          <CartesianGrid vertical={false} stroke="#f3f4f6"/>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9ca3af',fontSize:10,fontWeight:700}}/>
                          <YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af',fontSize:10}}/>
                          <Tooltip contentStyle={{borderRadius:10,border:'1px solid #ede9fe',boxShadow:'0 8px 24px rgba(0,0,0,0.07)',fontSize:12}} formatter={v=>[`${v}%`,'Rate']}/>
                          <Bar dataKey="rate" radius={[6,6,0,0]} barSize={30}>
                            {chartData.map((e,i)=><Cell key={i} fill={e.name===currentAnalysis?.majorityGroup?'#7c3aed':'#ef4444'}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={{background:isDark?'linear-gradient(135deg,rgba(139,92,246,0.05),transparent)':'linear-gradient(135deg,#f5f3ff,#faf9ff)',border:'1px solid var(--border-card)',borderRadius:16,padding:'1.25rem',display:'flex',flexDirection:'column',gap:12,boxShadow:'0 2px 12px rgba(109,40,217,0.04)'}}>
                    <span style={{fontSize:9,fontWeight:900,color:'#8b5cf6',letterSpacing:'0.2em',textTransform:'uppercase'}}>🧠 AI Contextual Analysis</span>
                    <p style={{fontSize:13,color:'var(--text-muted)',fontStyle:'italic',lineHeight:1.75,margin:0,flex:1}}>
                      "{selectedCol}" exhibits a <strong style={{color:'var(--text-primary)'}}>{currentAnalysis?.biasLevel?.toLowerCase()||'…'}</strong> selection bias. Disparate Impact ratio: <strong style={{color:'#8b5cf6'}}>{currentAnalysis?.minRatio?.toFixed(3)||'…'}</strong>. <strong>{currentAnalysis?.majorityGroup||'Majority group'}</strong> candidates are selected at a disproportionately higher rate. Human review recommended.
                    </p>
                    <div style={{paddingTop:10,borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:9,fontWeight:700,color:'#9ca3af',letterSpacing:'0.12em',textTransform:'uppercase'}}>Block Hash</span>
                      <code style={{fontSize:11,fontWeight:700,color:'#7c3aed',fontFamily:'monospace'}}>SHA256:0x8A…3F2</code>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      {['Majority','Minority'].map((l,i)=>(
                        <span key={l} style={{fontSize:11,padding:'4px 10px',borderRadius:99,display:'flex',alignItems:'center',gap:5,background:i===0?'rgba(124,58,237,0.08)':'rgba(239,68,68,0.08)',color:i===0?'#7c3aed':'#ef4444',fontWeight:700}}>
                          <span style={{width:8,height:8,borderRadius:2,background:i===0?'#7c3aed':'#ef4444',display:'inline-block'}}/>
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
      {/* ════ WORKFLOW ════ */}
      <section id="workflow" style={{background:'var(--bg)',padding:'4.5rem 1.5rem'}}>
        <motion.div initial="initial" whileInView="animate" viewport={{once:true}} variants={stagger}>
          <motion.div variants={fadeUp} style={{textAlign:'center',marginBottom:'2.5rem'}}>
            <Pill>Process Chain</Pill>
            <h2 style={{fontSize:'2rem'}}>How It Works</h2>
          </motion.div>
          <div style={{maxWidth:640,margin:'0 auto'}}>
            {steps.map((s,i)=><StepCard key={i} s={s} i={i} total={steps.length}/>)}
          </div>
        </motion.div>
      </section>
      <section style={{
        background: isDark 
          ? 'linear-gradient(180deg, var(--bg) 0%, #111111 40%, #5b21b6 100%)'
          : 'linear-gradient(180deg, #f0ebff 0%, #e4d9ff 40%, #7c3aed 100%)',
        padding:'4.5rem 1.5rem 0',
        transition: 'background 0.35s ease'
      }}>
        <div style={{maxWidth:1320,margin:'0 auto',textAlign:'center',paddingBottom:'4.5rem'}}>
          <Pill>UN Sustainable Goals</Pill>
          <h2 style={{fontSize:'2rem',marginBottom:'2rem'}}>Commitment to Global Equality</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16,textAlign:'left'}}>
            {[
              {i:'🌍',t:'SDG 10 — Reduced Inequalities',d:'Proactively reducing social and economic inequalities arising from automated algorithmic decisions.',tag:'Education & Policy'},
              {i:'⚖️',t:'SDG 5 — Gender Equality',d:'Ensuring AI systems across fintech, healthcare, and public services provide equal opportunity for all.',tag:'Tech & Society'},
            ].map((g,i)=>(
              <motion.div key={i} initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.1}}
                style={{
                  background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.92)',
                  backdropFilter:'blur(12px)',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.8)',
                  borderRadius:18,padding:'1.5rem',
                  boxShadow:'0 4px 24px rgba(109,40,217,0.12)',
                  position:'relative',overflow:'hidden',
                  transition: 'background 0.35s ease, border 0.35s ease'
                }}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#8b5cf6,#6d28d9)'}}/>
                <div style={{fontSize:32,marginBottom:12}}>{g.i}</div>
                <div style={{fontSize:10,fontWeight:800,color:'#7c3aed',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:8}}>{g.tag}</div>
                <h3 style={{fontSize:15,marginBottom:8,color:'var(--text-primary)'}}>{g.t}</h3>
                <p style={{fontSize:13,color:'var(--text-muted)',margin:0,lineHeight:1.7}}>{g.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* ════ CTA ════ */}
      <section style={{padding:'6rem 2rem',textAlign:'center',background:'linear-gradient(135deg,#6d28d9,#5b21b6,#1a1630)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'-30%',left:'15%',width:'40%',paddingTop:'40%',borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,0.28),transparent)',filter:'blur(50px)',pointerEvents:'none'}}/>
        <div style={{position:'relative',maxWidth:580,margin:'0 auto'}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:'0.18em',color:'rgba(196,181,253,0.75)',textTransform:'uppercase',marginBottom:16}}>✦ Start Auditing Today ✦</div>
          <h2 style={{fontSize:'clamp(1.9rem,4.5vw,2.8rem)',color:'white',marginBottom:14}}>Ready to build trust?</h2>
          <p style={{color:'rgba(196,181,253,0.8)',fontSize:'1.03rem',marginBottom:32,lineHeight:1.75}}>Join researchers, HR teams, and compliance officers building a fairer digital world.</p>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:12}}>
            {[
              {label:'Get Started Free →', action:()=>scrollTo('demo')},
              {label:'View Documentation',  action:()=>scrollTo('workflow')}
            ].map(({label,action},i)=>(
              <button key={i} onClick={action} style={{padding:'0.9rem 2.2rem',borderRadius:13,fontWeight:800,fontSize:14,cursor:'pointer',transition:'all 0.3s',
                background:i===0?'white':'rgba(255,255,255,0.1)',
                color:i===0?'#6d28d9':'white',
                border:i===0?'none':'1.5px solid rgba(255,255,255,0.22)',
                backdropFilter:i===1?'blur(8px)':undefined,
                boxShadow:i===0?'0 12px 30px rgba(0,0,0,0.18)':undefined
              }}
                onMouseEnter={e=>{e.target.style.transform='translateY(-2px)';if(i===0)e.target.style.boxShadow='0 20px 40px rgba(0,0,0,0.25)';}}
                onMouseLeave={e=>{e.target.style.transform='none';if(i===0)e.target.style.boxShadow='0 12px 30px rgba(0,0,0,0.18)';}}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ════ FOOTER ════ */}
      <footer style={{background:'var(--footer-bg)',padding:'4rem 2rem 2.5rem',color:'var(--footer-text)',transition:'background 0.35s ease'}}>
        <div style={{maxWidth:1320,margin:'0 auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr 1fr 1fr',gap:36,marginBottom:'2.5rem'}}>
            <div>
              <div style={{color:'white',fontWeight:900,fontSize:19,marginBottom:12,letterSpacing:'-0.04em'}}>Equi<span style={{color:'#a78bfa'}}>AI</span></div>
              <p style={{fontSize:13,lineHeight:1.7,maxWidth:195,margin:'0 0 18px 0',color:'var(--text-muted)'}}>The global standard for algorithmic fairness monitoring since {new Date().getFullYear()}.</p>
              <div style={{display:'flex',gap:8}}>
                {['𝕏','in','gh'].map(s=>(
                  <div key={s} style={{width:30,height:30,borderRadius:7,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#9ca3af',cursor:'pointer',transition:'all 0.2s'}}
                    onMouseEnter={e=>{e.target.style.background='rgba(109,40,217,0.3)';e.target.style.color='white';}}
                    onMouseLeave={e=>{e.target.style.background='rgba(255,255,255,0.07)';e.target.style.color='#9ca3af';}}>{s}</div>
                ))}
              </div>
            </div>
            {[{t:'Product',l:['Audit Engine','API Docs','Integrations','Changelog']},{t:'Company',l:['About Us','SDG Mission','Blog','Careers']},{t:'Legal',l:['Privacy Policy','Terms of Use','Security','Cookies']}].map(col=>(
              <div key={col.t}>
                <h5 style={{color:'white',fontSize:10,fontWeight:900,letterSpacing:'0.14em',textTransform:'uppercase',marginBottom:16}}>{col.t}</h5>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {col.l.map(link=>(
                    <button key={link} onClick={()=>setModalPage(link)}
                      style={{fontSize:13,color:'#6b7280',background:'none',border:'none',padding:0,cursor:'pointer',textAlign:'left',transition:'color 0.2s',fontFamily:'inherit'}}
                      onMouseEnter={e=>e.target.style.color='#c4b5fd'} onMouseLeave={e=>e.target.style.color='#6b7280'}>{link}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{paddingTop:20,borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',fontSize:12,color:'#4b5563',fontWeight:600,gap:10}}>
            <p style={{margin:0}}>© {new Date().getFullYear()} EquiAI Inc. All rights reserved.</p>
            <div style={{display:'flex',gap:20}}>
              {['Trust Center','Accessibility','Status'].map(l=>(
                <span key={l} style={{color:'#6b7280',cursor:'pointer',transition:'color 0.2s'}} onMouseEnter={e=>e.target.style.color='#c4b5fd'} onMouseLeave={e=>e.target.style.color='#6b7280'}>{l}</span>
              ))}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#10b981',display:'inline-block'}} className="animate-pulse-glow"/>
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
