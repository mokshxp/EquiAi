import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import FloatingLines from '../components/FloatingLines';
import { getSessionId, getPlan, setPlan as savePlan } from '../utils/session';
import UpgradeModal from '../components/UpgradeModal';
import { openRazorpayCheckout } from '../utils/razorpay';
import Navbar from '../components/Navbar';

const fadeUp  = { initial:{opacity:0,y:20}, animate:{opacity:1,y:0}, transition:{duration:0.5,ease:[0.22,1,0.36,1]} };
const stagger = { animate:{ transition:{ staggerChildren:0.07 } } };

const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior:'smooth' });

/* ── Hooks ──────────────────────────────────────────────────────── */

function useScrollReveal(cls = 'scroll-reveal') {
  useEffect(() => {
    const els = document.querySelectorAll(`.${cls}`);
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.18 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [cls]);
}

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
      { h: 'Permitted Use', p: 'EquiAI is licensed for lawful bias auditing purposes only. You may not use the platform to process illegal data, circumvent international anti-discrimination regulations, or reverse-engineer our proprietary scoring algorithms.' },
      { h: 'Intellectual Property', p: 'All audit methodologies, UI designs, and scoring algorithms are the exclusive property of EquiAI Inc. Our multi-jurisdictional audits are based on public regulatory standards including EEOC (US), EU AI Act, and UK Equality Act.' },
      { h: 'Limitation of Liability', p: 'EquiAI provides bias analysis as a decision-support tool, not a legal opinion. Our maximum liability for any claim arising from use of the service is limited to the fees paid in the preceding 12 months.' },
      { h: 'Global Jurisdiction', p: 'These terms are governed by international data governance standards and interpreted according to the laws of the jurisdiction where service is rendered, defaulting to Delaware, USA.' },
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
      { h: 'Our Mission', p: `EquiAI was founded in ${new Date().getFullYear()} with one mission: make algorithmic decision-making fair for everyone, globally. We believe AI systems should be transparent, auditable, and unbiased by design across all borders.` },
      { h: 'Universal Equity', p: 'Automated hiring, lending, and healthcare algorithms shape human outcomes on a global scale. EquiAI provides the universal infrastructure to verify these systems are free of discrimination, whether in San Francisco, London, or New Delhi.' },
      { h: 'Global Frameworks', p: 'We combine US EEOC standards, the EU AI Act safety protocols, and the UK Equality Act to create the world\'s first multi-jurisdictional algorithmic compliance platform.' },
      { h: 'International Cooperation', p: 'Our team partners with global bodies like the UN, international HR associations, and civil society organisations to continuously adapt to the evolving landscape of AI regulation.' },
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
      { h: 'Navigating the EU AI Act', p: 'The EU AI Act introduces strict fairness requirements for high-risk AI. Learn how EquiAI automates compliance checks against these new European standards.' },
      { h: 'US vs Global Fairness Metrics', p: 'While the US focuses on the 8/10ths rule, global frameworks often demand narrower parity. We compare the EEOC standards with Indian and UK legal requirements.' },
      { h: 'Blockchain: The Future of Auditing', p: 'Immutable records are key to global trust. By sealing every audit on the Polygon blockchain, EquiAI creates a tamper-proof trail that holds up in any international court.' },
      { h: 'Case Studies: Global Bias Trends', p: 'Read our analysis on demographic bias across four continents and how multi-national corporations are de-biasing their global talent pipelines.' },
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
      { h: 'Multi-Jurisdictional Logic', p: 'The EquiAI Audit Engine calculates disparate impact metrics that dynamically adapt to the selected legal jurisdiction (US EEOC, EU AI Act, UK Equality Act, India Constitution, etc.).' },
      { h: 'Standardised Fairness Score', p: 'Each audit produces a 0–100 Fairness Score. Our threshold-aware system classifies outcomes as Fair, Moderate, High Bias, or Severe based on international regulatory baselines.' },
      { h: 'High-Scale Processing', p: 'Engineered for speed, our engine handles datasets up to 1M+ rows. All processing is transient and privacy-first; data is never stored outside your local session.' },
      { h: 'Smart Bucketing', p: 'To avoid false-positive bias alerts, we use automated bucketing for age, education, and numeric attributes, ensuring stable and reliable results for demographic comparisons.' },
    ]
  },
  'API Docs': {
    icon: '📡',
    sections: [
      { h: 'REST API Overview', p: 'The EquiAI API allows you to integrate bias auditing directly into your ML pipelines, HR systems, or CI/CD workflows. Base URL: https://api.equiai.io/v1' },
      { h: 'POST /audit', p: 'Submit a dataset for bias analysis.\nRequest: multipart/form-data with your CSV file.\nResponse: { bias_score, bias_level, column_analyses, decision_col }\nAuth: Bearer token required.' },
      { h: 'GET /audit/{id}', p: 'Retrieve a previous audit result by its unique ID. Results are cached for 24 hours. Blockchain hash is included in the response for independent verification.' },
      { h: 'Rate Limits', p: 'API access is currently limited to Enterprise plans. Please contact sales for a dedicated API key.' },
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

/* ── Feature Card ──────────────────────────────────────────────── */
function FeatureCard({ f, i }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="card-stagger"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transitionDelay: `${i * 100}ms`,
        borderRadius:18,padding:'1.5rem',position:'relative',overflow:'hidden',
        background:'var(--card-bg)',
        border: hovered ? `1px solid ${f.accent}60` : '1px solid var(--border-card)',
        boxShadow: hovered ? `0 22px 52px -8px ${f.accent}35,0 0 0 1px ${f.accent}28` : '0 2px 12px rgba(109,40,217,0.04)',
        cursor:'default', transition:'all 0.38s ease',
        transform: hovered ? 'translateY(-6px)' : 'none'
      }}>

      {/* Glow bg on hover */}
      <div style={{position:'absolute',inset:0,borderRadius:18,background:`radial-gradient(circle at 20% 20%,${f.accent}15,transparent 65%)`,opacity:hovered?1:0,transition:'opacity 0.4s',pointerEvents:'none'}}/>

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

      {/* Hover reveal */}
      <div style={{
        marginTop:14,paddingTop:12,borderTop:`1px solid ${f.accent}30`,
        display:'flex',justifyContent:'space-between',alignItems:'center',
        height:hovered?38:0,overflow:'hidden',opacity:hovered?1:0,
        transition:'all 0.38s ease'
      }}>
        <span style={{fontSize:11,color:'#9ca3af',fontWeight:600}}>{f.stat}</span>
        <span style={{fontSize:10,padding:'3px 10px',borderRadius:99,background:f.iconBg,color:f.accent,fontWeight:800,letterSpacing:'0.04em'}}>{f.statVal}</span>
      </div>
    </div>
  );
}

/* ── Step Card ─────────────────────────────────────────────────── */
function StepCard({ s, i, total }) {
  const [hovered, setHovered] = useState(false);
  const [stepVisible, setStepVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStepVisible(true); obs.disconnect(); }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{position:'relative',display:'flex',gap:0}}>
      {/* Timeline spine */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginRight:20,flexShrink:0}}>
        <div style={{
            width:42,height:42,borderRadius:12,flexShrink:0,
            background: hovered ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
            border: hovered ? '1px solid transparent' : '1px solid #c4b5fd',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:16,fontWeight:900,color:hovered?'white':'#6d28d9',
            boxShadow:hovered?'0 8px 20px rgba(109,40,217,0.3)':'0 2px 8px rgba(109,40,217,0.1)',
            opacity: stepVisible ? 1 : 0, transform: stepVisible ? 'scale(1)' : 'scale(0.5)',
            transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            transitionDelay: `${i * 150}ms`,
            zIndex:2
        }}>{i+1}</div>
        {i < total-1 && (
          <div style={{width:2,flex:1,minHeight:28,background:'linear-gradient(180deg,#ddd6fe,transparent)',marginTop:4}}/>
        )}
      </div>
      {/* Card */}
      <div
        onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
        style={{
          flex:1,marginBottom:i<total-1?12:0,padding:'1.1rem 1.4rem',borderRadius:14,
          background:hovered?'var(--card-bg)':'var(--card-bg)',
          border: hovered?'1px solid rgba(196,181,253,0.8)':'1px solid var(--border-card)',
          boxShadow:hovered?'0 12px 30px rgba(109,40,217,0.1)':'none',
          opacity: stepVisible ? 1 : 0, transform: stepVisible ? 'translateX(0)' : 'translateX(20px)',
          transition: 'all 0.4s ease',
          transitionDelay: stepVisible ? `${i * 150 + 100}ms` : '0ms',
          cursor:'default'
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
      </div>
    </div>
  );
}

/* ── MAIN ──────────────────────────────────────────────────── */
export default function Home() {
  const [plan, setPlanState] = useState(getPlan());
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('limit_reached');
  const [modalPage, setModalPage]     = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/plan/${getSessionId()}`)
      .then(r => r.json())
      .then(d => {
        setPlanState(d.plan);
        savePlan(d.plan);
      })
      .catch(console.error);
  }, []);

  const { isDark }                    = useTheme();
  const navigate                      = useNavigate();

  useScrollReveal('scroll-reveal');
  useScrollReveal('card-stagger');

  const features = [
    {t:'Adverse Impact',   d:'Automated multi-jurisdiction frameworks to surface hidden decision bias across all groups.',           e:'📊',iconBg:'linear-gradient(135deg,#ede9fe,#c4b5fd)',accent:'#7c3aed',gradient:'linear-gradient(90deg,#8b5cf6,#6d28d9)',tag:'Statistical',   stat:'Columns analyzed',   statVal:'Auto-detected'},
    {t:'AI Explainer',     d:'Plain-language summaries of exactly why and where bias exists in the model.',              e:'🧠',iconBg:'linear-gradient(135deg,#d1fae5,#6ee7b7)',accent:'#059669',gradient:'linear-gradient(90deg,#10b981,#059669)',tag:'Generative AI', stat:'Explanation quality', statVal:'Powered by Gemini'},
    {t:'Blockchain Seal',  d:'Immutable on-chain hash for every audit — tamper-proof and permanently timestamped.',      e:'🔗',iconBg:'linear-gradient(135deg,#fef3c7,#fcd34d)',accent:'#d97706',gradient:'linear-gradient(90deg,#f59e0b,#d97706)',tag:'Web3',           stat:'Hash algorithm',     statVal:'SHA-256'},
    {t:'Demographic Scans',d:'Deep-dive analysis: gender, race, age, nationality, and 10+ protected dimensions.',        e:'🔍',iconBg:'linear-gradient(135deg,#fee2e2,#fca5a5)',accent:'#dc2626',gradient:'linear-gradient(90deg,#ef4444,#dc2626)',tag:'Analytics',     stat:'Protected categories', statVal:'12+ supported'},
    {t:'Remediation',      d:'Actionable, step-by-step guidance to reduce bias without sacrificing model accuracy.',     e:'✅',iconBg:'linear-gradient(135deg,#e0e7ff,#a5b4fc)',accent:'#4f46e5',gradient:'linear-gradient(90deg,#6366f1,#4f46e5)',tag:'Guidance',       stat:'Avg. improvement',   statVal:'~30% DI lift'},
    {t:'PDF Reports',      d:'One-click, professionally formatted reports ready for legal teams and executive filings.',  e:'📄',iconBg:'linear-gradient(135deg,#ecfdf5,#6ee7b7)',accent:'#059669',gradient:'linear-gradient(90deg,#10b981,#059669)',tag:'Export',         stat:'Report format',      statVal:'PDF + JSON'},
  ];

  const steps = [
    {t:'Secure Ingestion',   d:'Upload HR, credit, or policy decision data through our encrypted endpoint or standard REST API.',e:'📥',tag:'Input Layer',   chips:['CSV','XLSX','API']},
    {t:'Statistical Engine', d:'Automated computation of selection rates, DI ratios, and jurisdictional adverse impact flags.',   e:'⚙️',tag:'Core Analysis', chips:['Global Law','DI Ratio','p-value']},
    {t:'AI Translation',     d:'Gemini model converts complex statistics into actionable, plain-language compliance findings.',  e:'🧠',tag:'Generative AI', chips:['Gemini','RAG','NLP']},
    {t:'Blockchain Sealing', d:'SHA-256 hash of every audit is written on-chain — creating a tamper-proof compliance record.', e:'🔗',tag:'Ledger',         chips:['SHA-256','Polygon','IPFS']},
  ];

  return (
    <div style={{background:'var(--bg)',minHeight:'100vh',transition:'background 0.35s ease'}}>
      {modalPage && <InfoModal page={modalPage} onClose={()=>setModalPage(null)}/>}
      {showUpgradeModal && (
        <UpgradeModal 
          reason={upgradeReason} 
          onClose={() => setShowUpgradeModal(false)}
          onSuccess={() => {
            setPlanState('pro');
            savePlan('pro');
          }}
        />
      )}
      <Navbar/>
      {/* ════ HERO ════ */}
      <section style={{background:'var(--bg-hero)',borderBottom:'1px solid var(--border)',padding:'2rem 4%',position:'relative',overflow:'hidden',minHeight:'calc(100vh - 60px)',display:'flex',alignItems:'center'}}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.6 }}>
          <FloatingLines 
            enabledWaves={["top","middle","bottom"]}
            lineCount={6}
            lineDistance={8}
            bendRadius={8}
            bendStrength={-2}
            interactive={true}
            parallax={true}
            animationSpeed={1}
            linesGradient={["#A855F7", "#6f6f6f", "#6a6a6a"]}
          />
        </div>
        <div style={{position:'absolute',top:'-25%',right:'-8%',width:'45%',height:'90%',borderRadius:'50%',background:'radial-gradient(circle,rgba(109,40,217,0.09),transparent 70%)',filter:'blur(50px)',pointerEvents:'none'}}/>
        <div style={{width:'100%',maxWidth:1320,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center',gap:'clamp(40px, 6vw, 80px)',flexWrap:'wrap',position:'relative',zIndex:1}}>
          <motion.div style={{flex:1,minWidth:320,maxWidth:680}} initial="initial" animate="animate" variants={stagger}>
            <motion.div variants={fadeUp} style={{marginBottom:12}}>
              <Pill><span style={{width:6,height:6,borderRadius:'50%',background:'#7c3aed',display:'inline-block'}} className="animate-pulse-glow"/> AI Compliance Standard v2.0</Pill>
            </motion.div>
            <motion.h1 id="hero-h1" variants={fadeUp} style={{fontSize:'clamp(2.5rem,5vw,4.5rem)',lineHeight:1.1,marginBottom:'1.5rem',color:'var(--text-primary)',letterSpacing:'-0.03em'}}>
              Audit Your AI for<br/><span style={{background:'linear-gradient(135deg,#a78bfa,#7c3aed,#818cf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Decision Fairness</span>
            </motion.h1>
            <motion.p variants={fadeUp} style={{fontSize:'1.15rem',maxWidth:560,marginBottom:'2.5rem',color:isDark?'rgba(255,255,255,0.7)':'var(--text-muted)',lineHeight:1.8}}>
              Instantly detect algorithmic bias using global legal frameworks (US, EU, UK, India). Transform HR, credit, and policy datasets into verifiable fairness certificates.
            </motion.p>
            <motion.div variants={fadeUp} style={{display:'flex',flexWrap:'wrap',gap:16,marginBottom:'3.5rem'}}>
              <button className="btn-glow" onClick={()=>navigate('/audit')} style={{padding:'11px 26px',background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',color:'white',border:'none',borderRadius:11,fontSize:14,fontWeight:700,cursor:'pointer',boxShadow:'0 8px 22px rgba(109,40,217,0.38)'}}>
                Launch Live Audit →</button>
              <button 
                onClick={()=>scrollTo('workflow')} 
                style={{padding:'11px 26px',background:isDark?'rgba(255,255,255,0.05)':'rgba(109,40,217,0.04)',color:'#a78bfa',border:isDark?'1.5px solid rgba(255,255,255,0.12)':'1.5px solid rgba(109,40,217,0.15)',borderRadius:11,fontSize:14,fontWeight:700,cursor:'pointer',backdropFilter:'blur(8px)',transition:'all 0.2s'}}
                onMouseEnter={e=>e.currentTarget.style.background=isDark?'rgba(255,255,255,0.1)':'rgba(109,40,217,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background=isDark?'rgba(255,255,255,0.05)':'rgba(109,40,217,0.04)'}
              >
                How It Works ↓
              </button>
            </motion.div>
            <motion.div variants={fadeUp} style={{display:'flex',flexWrap:'wrap',gap:16}}>
              {[
                {v:'100%',l:'Verifiability',i:'🛡️'},{v:'Global',l:'Standards',i:'⚖️'},
                {v:'Multi',l:'Jurisdiction',i:'🌍'},{v:'193',l:'UN Member States',i:'🇺🇳'}
              ].map(s=>(
                <div key={s.l} style={{padding:'16px 20px',borderRadius:16,background:isDark?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.7)',border:isDark?'1px solid rgba(167,139,250,0.15)':'1px solid rgba(196,181,253,0.4)',backdropFilter:'blur(12px)',textAlign:'center',minWidth:110,flex:1,boxShadow:'0 4px 24px rgba(0,0,0,0.03)',transition:'all 0.3s ease'}}>
                  <div style={{fontSize:18,marginBottom:6}}>{s.i}</div>
                  <div style={{fontSize:'1.3rem',fontWeight:900,color:'var(--text-primary)',lineHeight:1,marginBottom:6}}>{s.v}</div>
                  <div style={{fontSize:10,fontWeight:800,color:isDark?'#c4b5fd':'var(--text-muted)',letterSpacing:'0.12em',textTransform:'uppercase'}}>{s.l}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
          <motion.div className="hidden lg:block" style={{flexShrink:0}} initial={{opacity:0,x:40}} animate={{opacity:1,x:0}} transition={{duration:0.85,delay:0.15}}>
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
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
            {features.map((f,i)=>(
              <div key={i} style={i === features.length - 1 && features.length % 3 !== 0 ? {gridColumn: features.length % 3 === 1 ? '2' : 'auto'} : {}}>
                <FeatureCard f={f} i={i}/>
              </div>
            ))}
          </div>
        </motion.div>
        </div>
      </section>

      {/* ════ GLOBAL NETWORK ════ */}
      <section id="global" style={{background:'var(--surface-2)',padding:'4rem 1.5rem',borderBottom:'1px solid var(--border)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'3rem'}}>
            <Pill>Global Coverage</Pill>
            <h2 style={{fontSize:'2.25rem'}}>Compliance Across Jurisdictions</h2>
            <p style={{marginTop:'1rem',maxWidth:700,margin:'1rem auto'}}>EquiAI is the only fairness engine with hardcoded logic for local legal thresholds, mapped to international Human Rights standards.</p>
          </div>
          
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:24}}>
            {[
              {flag:'🇺🇸',name:'USA EEOC',law:'Civil Rights Act',std:'80% Rule',back:'EEOC 4/5ths Rule. Used in US federal courts since 1978.'},
              {flag:'🇪🇺',name:'European Union',law:'EU AI Act 2024',std:'Conformity Check',back:'EU AI Act 2024. Highest-risk AI systems face heavy fines.'},
              {flag:'🇬🇧',name:'United Kingdom',law:'Equality Act 2010',std:'Proportionality',back:'Equality Act 2010. 9 protected characteristics.'},
              {flag:'🇮🇳',name:'India',law:'Const. Art 15/16',std:'Non-Discrim.',back:'Article 15/16. Constitutional protection since 1950.'},
              {flag:'🌍',name:'Global Baseline',law:'UN Human Rights',std:'Core Fairness',back:'UN Human Rights baseline. Applies to 193 countries.'}
            ].map((r,i)=>(
              <div key={i} className="juris-card scroll-reveal" style={{transitionDelay:`${i*80}ms`,
                background:'var(--bg)',borderRadius:20,padding:'1.75rem',position:'relative',overflow:'hidden',
                boxShadow:'0 4px 20px rgba(0,0,0,0.03)', border:'1px solid var(--border-card)',
                display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center'
              }}>
                <div style={{fontSize:36,marginBottom:14,filter:'drop-shadow(0 4px 8px rgba(0,0,0,0.12))'}}>{r.flag}</div>
                <h4 style={{fontSize:16,marginBottom:4,color:'var(--text-primary)',fontWeight:800}}>{r.name}</h4>
                <div style={{fontSize:11,color:'#8b5cf6',fontWeight:900,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>{r.law}</div>
                <div style={{width:24,height:2,background:'rgba(139,92,246,0.2)',borderRadius:2,marginBottom:12}} />
                <p style={{fontSize:13,lineHeight:1.6,color:'var(--text-muted)',margin:0}}>{r.back}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ WORKFLOW ════ */}
      <section id="workflow" style={{background:'var(--bg)',padding:'4.5rem 1.5rem',marginTop:0}}>
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

      {/* ════ SDG GOALS ════ */}
      <section id="sdg" style={{
        background: 'var(--surface-2)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding:'5rem 1.5rem',
        transition: 'background 0.35s ease'
      }}>
        <div style={{maxWidth:1320,margin:'0 auto',textAlign:'center'}}>
          <Pill>UN Sustainable Goals</Pill>
          <h2 style={{fontSize:'2rem',marginBottom:'2rem'}}>Commitment to Global Equality</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16,textAlign:'left'}}>
            {[
              {num:'10',accent:'#e11d48',i:'🌍',t:'SDG 10 — Reduced Inequalities',d:'Proactively reducing social and economic inequalities from automated algorithmic decisions.',tag:'Education & Policy'},
              {num:'5', accent:'#f97316',i:'⚖️',t:'SDG 5 — Gender Equality',      d:'Ensuring AI systems across fintech, healthcare, and public services provide equal opportunity.',tag:'Tech & Society'},
              {num:'4', accent:'#dc2626',i:'📚',t:'SDG 4 — Quality Education',     d:'Preventing algorithmic bias in college admission and scholarship systems globally.',tag:'Access & Equity'},
              {num:'8', accent:'#92400e',i:'💼',t:'SDG 8 — Decent Work & Growth',  d:'Making hiring AI fair across gender, race, and age for equitable employment worldwide.',tag:'Employment'},
            ].map((g,i)=>(
              <motion.div key={i} initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.1}}
                className={`sdg-card sdg-card-${g.num}`}
                style={{
                  background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.92)',
                  backdropFilter:'blur(12px)',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border-card)',
                  borderRadius:18,padding:'1.5rem',
                  boxShadow:'0 2px 8px rgba(0,0,0,0.03)',
                  position:'relative',overflow:'hidden'
                }}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${g.accent},${g.accent}88)`}}/>
                <div style={{position:'absolute',top:12,right:16,fontSize:'3rem',fontWeight:800,color:isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.03)',lineHeight:1,userSelect:'none'}}>{g.num}</div>
                <div style={{fontSize:32,marginBottom:12}}>{g.i}</div>
                <div style={{fontSize:10,fontWeight:800,color:g.accent,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:8}}>{g.tag}</div>
                <h3 style={{fontSize:15,marginBottom:8,color:'var(--text-primary)'}}>{g.t}</h3>
                <p style={{fontSize:13,color:'var(--text-muted)',margin:0,lineHeight:1.7}}>{g.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ PRICING ════ */}
      <section id="pricing" style={{background:'var(--bg)',padding:'5rem 1.5rem 4rem'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'2.5rem'}}>
            <Pill>Pricing</Pill>
            <h2 style={{fontSize:'2rem',fontWeight:900,letterSpacing:'-0.03em',marginBottom:10}}>Simple, Transparent Pricing</h2>
            <p style={{color:'var(--text-muted)',maxWidth:440,margin:'0 auto',fontSize:14,lineHeight:1.7}}>No auditor fees. No compliance consultants. Fast, web-based algorithmic fairness analysis.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14,maxWidth:800,margin:'0 auto'}}>
            {[
              {
                name:'FREE', price:'₹0', period:'/month', badge:null, tag:'Individuals & Students', tagColor:'#6b7280',
                features:[
                  {text: '3 audits per day', ok: true},
                  {text: 'US EEOC jurisdiction', ok: true},
                  {text: 'AI explanation', ok: true},
                  {text: 'Audit hash (SHA-256)', ok: true},
                  {text: 'PDF export (locked)', ok: false},
                  {text: 'Multiple jurisdictions (locked)', ok: false},
                  {text: 'Audit history (locked)', ok: false}
                ],
                cta:'Start Free', ctaBg:'transparent', ctaColor:'#6b7280', ctaBorder:'#6b7280', sel:false,
                action: () => navigate('/audit')
              },
              {
                name:'PRO', price:'₹749', period:'/month', badge:null, tag:'Teams & Professionals', tagColor:'#6d28d9',
                features:[
                  {text: 'Unlimited audits', ok: true},
                  {text: 'All 5 jurisdictions', ok: true},
                  {text: 'AI explanation', ok: true},
                  {text: 'PDF export', ok: true},
                  {text: 'Audit history', ok: true},
                  {text: '50MB file uploads', ok: true},
                  {text: 'Priority support', ok: true}
                ],
                cta:'Upgrade to Pro', ctaBg:'#6d28d9', ctaColor:'white', ctaBorder:'#6d28d9', sel:true,
                action: async () => {
                  await openRazorpayCheckout(
                    () => { setPlanState('pro'); savePlan('pro'); },
                    (err) => console.error(err)
                  );
                }
              },
            ].map((plan,i)=>(
              <motion.div key={plan.name} initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.09,duration:0.45}}
                style={{background:'var(--card-bg)',border:`2px solid ${plan.sel?'#6d28d9':'var(--border-card)'}`,borderRadius:24,padding:'1.75rem',display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
                {plan.badge&&<div style={{position:'absolute',top:14,right:14,fontSize:9,fontWeight:900,color:'white',background:'#6d28d9',padding:'3px 9px',borderRadius:99,letterSpacing:'0.06em'}}>{plan.badge}</div>}
                <div style={{fontSize:11,fontWeight:800,color:plan.tagColor,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>{plan.name}</div>
                <div style={{marginBottom:6}}>
                  <span style={{fontSize:plan.price==='Custom'?'1.6rem':'2.1rem',fontWeight:900,color:'var(--text-primary)'}}>{plan.price}</span>
                  <span style={{fontSize:13,color:'var(--text-muted)',fontWeight:600}}>{plan.period}</span>
                </div>
                <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:18,paddingBottom:16,borderBottom:'1px solid var(--border-card)'}}>{plan.tag}</div>
                <div style={{flex:1,display:'flex',flexDirection:'column',gap:9,marginBottom:20}}>
                  {plan.features.map(f=>(
                    <div key={f.text} style={{display:'flex',alignItems:'center',gap:9,fontSize:13, opacity: f.ok ? 1 : 0.5}}>
                      <span style={{color:f.ok ? plan.tagColor : '#9ca3af',fontWeight:700,flexShrink:0}}>{f.ok ? '✓' : '✗'}</span>
                      <span style={{color:'var(--text-primary)', textDecoration: f.ok ? 'none' : 'line-through'}}>{f.text}</span>
                    </div>
                  ))}
                </div>
                <button onClick={plan.action} className="btn-glow" style={{width:'100%',padding:'11px',background:plan.ctaBg,color:plan.ctaColor,border:`1.5px solid ${plan.ctaBorder}`,borderRadius:12,fontWeight:800,fontSize:13,cursor:'pointer'}}
                  onMouseEnter={e=>{e.currentTarget.style.background='#6d28d9';e.currentTarget.style.color='white';}}
                  onMouseLeave={e=>{e.currentTarget.style.background=plan.ctaBg;e.currentTarget.style.color=plan.ctaColor;}}>
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ CTA ════ */}
      <section style={{padding:'6rem 2rem',textAlign:'center',background:'#6d28d9',position:'relative',overflow:'hidden'}}>
        <div style={{position:'relative',zIndex:1,maxWidth:580,margin:'0 auto'}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:'0.18em',color:'rgba(196,181,253,0.75)',textTransform:'uppercase',marginBottom:16}}>✦ Start Auditing Today ✦</div>
          <h2 style={{fontSize:'clamp(1.9rem,4.5vw,2.8rem)',color:'white',marginBottom:14}}>Ready to build trust?</h2>
          <p style={{color:'rgba(196,181,253,0.8)',fontSize:'1.03rem',marginBottom:32,lineHeight:1.75}}>Join researchers, HR teams, and compliance officers building a fairer digital world.</p>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:12}}>
            {[
              {label:'Get Started Free →', action:()=>navigate('/audit')},
              {label:'View Documentation',  action:()=>scrollTo('workflow')}
            ].map(({label,action},i)=>(
              <button key={i} onClick={action} className={i===0 ? "btn-glow" : ""} style={{padding:'0.9rem 2.2rem',borderRadius:13,fontWeight:800,fontSize:14,cursor:'pointer',
                background:i===0?'white':'rgba(255,255,255,0.12)',
                color:i===0?'#6d28d9':'white',
                border:i===0?'none':'1.5px solid rgba(255,255,255,0.25)',
                backdropFilter:i===1?'blur(8px)':undefined,
                boxShadow:i===0?'0 12px 30px rgba(0,0,0,0.2)':undefined
              }}>{label}</button>
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
              <p style={{fontSize:13,lineHeight:1.7,maxWidth:195,margin:'0 0 18px 0',color:'var(--text-muted)'}}>The global standard for algorithmic fairness monitoring.</p>
              <div style={{display:'flex',gap:8}}>
                {['𝕏','in'].map(s=>(
                  <div key={s} style={{width:30,height:30,borderRadius:7,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#9ca3af',cursor:'pointer',transition:'all 0.2s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(109,40,217,0.3)';e.currentTarget.style.color='white';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.07)';e.currentTarget.style.color='#9ca3af';}}>{s}</div>
                ))}
                <div style={{width:30,height:30,borderRadius:7,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af',cursor:'pointer',transition:'all 0.2s'}}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(109,40,217,0.3)';e.currentTarget.style.color='white';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.07)';e.currentTarget.style.color='#9ca3af';}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23.765 1.29 2.775.465 3.69-.075.105-.6.375-1.035.75-1.395 0 0-3.3-.945-3.3-4.455 0-.99.345-1.815.915-2.46-.09-.225-.405-1.17.09-2.43 0 0 .75-.24 2.46.915.72-.2 1.485-.3 2.25-.3.765 0 1.53.1 2.25.3 1.71-1.155 2.46-.915 2.46-.915.495 1.26.18 2.205.09 2.43.57.645.915 1.47.915 2.46 0 3.51-2.115 4.455-3.3 4.455.255.225.48.66.48 1.335 0 .96-.015 1.74-.015 1.98 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                </div>
              </div>
            </div>
            {[{t:'Product',l:['Audit Engine','API Docs','Changelog']},{t:'Company',l:['About Us','SDG Mission','Blog','Careers']},{t:'Legal',l:['Privacy Policy','Terms of Use','Security','Cookies']}].map(col=>(
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
          <div style={{paddingTop:'1.25rem',borderTop:'1px solid #374151',display:'flex',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',fontSize:12,color:'#4b5563',fontWeight:600,gap:10}}>
            <p style={{margin:0}}>© 2025 EquiAI · Built for Google Solution Challenge · UN SDG Goals 4, 5, 8, 10</p>
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
