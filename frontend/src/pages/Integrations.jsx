import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45 } };

// ─── COPY BUTTON CODEBLOCK ──────────────────────────────────────────────────
function CodeBlock({ title, code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ background: '#0d0f1a', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(109,40,217,0.2)', marginBottom: 12 }}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 16px', background: 'rgba(109,40,217,0.12)', borderBottom: '1px solid rgba(109,40,217,0.15)' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</span>
          <button onClick={copy} style={{ fontSize: 10, fontWeight: 700, color: copied ? '#10b981' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>{copied ? '✓ Copied' : 'Copy'}</button>
        </div>
      )}
      <pre style={{ margin: 0, padding: '1rem 1.25rem', color: '#e2e8f0', fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 12, lineHeight: 1.8, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Pill({ children }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 13px', borderRadius: 99, background: 'rgba(109,40,217,0.08)', border: '1px solid rgba(109,40,217,0.18)', color: '#6d28d9', fontSize: 10, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 14 }}>
      {children}
    </div>
  );
}

function FlowStep({ n, label, sub, last }) {
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: last ? 0 : 18, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 900 }}>{n}</div>
        {!last && <div style={{ width: 2, height: 20, background: 'linear-gradient(180deg,rgba(109,40,217,0.4),transparent)', marginTop: 4 }} />}
      </div>
      <div style={{ paddingTop: 5 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{sub}</div>}
      </div>
    </div>
  );
}

function PrivacyTable() {
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', borderRadius: 20, padding: '1.75rem', marginTop: 8 }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>🔒 Zero-Trust Privacy</div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>What EquiAI Does & Doesn't See</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '1.1rem' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#059669', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>✅ EquiAI Receives</div>
          {['Fairness score (0–100)', 'Blockchain hash (64-char)', 'Timestamp (ISO date)', 'Verdict (FAIR / BIASED)'].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(16,185,129,0.08)', fontSize: 12, color: 'var(--text-primary)' }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> {item}
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 14, padding: '1.1rem' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#dc2626', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>❌ NEVER Received</div>
          {['Employee / candidate names', 'Email addresses', 'Salary or compensation data', 'SSN, passport, ID numbers', 'Raw database rows', 'Database passwords'].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(239,68,68,0.08)', fontSize: 12, color: 'var(--text-primary)' }}>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>✗</span> {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar() {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 999, height: 60, display: 'flex', alignItems: 'center', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--nav-border)' }}>
      <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 12 }}>EQ</div>
          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>Equi<span style={{ color: '#7c3aed' }}>AI</span> <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Enterprise</span></span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div onClick={toggle} style={{ width: 48, height: 26, borderRadius: 99, cursor: 'pointer', position: 'relative', background: isDark ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'linear-gradient(135deg,#e0e7ff,#c4b5fd)', boxShadow: '0 2px 8px rgba(109,40,217,0.3)', transition: 'background 0.3s' }}>
            <div style={{ position: 'absolute', top: 4, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.3s cubic-bezier(0.34,1.56,0.64,1)', left: isDark ? 26 : 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{isDark ? '🌙' : '☀️'}</div>
          </div>
          <button onClick={() => navigate('/')} style={{ padding: '7px 18px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>← Back to Audit</button>
        </div>
      </div>
    </nav>
  );
}

// ─── PATH: SMALL TEAM ─────────────────────────────────────────────────────────
function SmallPath() {
  const navigate = useNavigate();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900, margin: '0 auto' }}>
      {/* No integration needed card */}
      <div style={{ background: 'rgba(109,40,217,0.06)', border: '1px solid rgba(109,40,217,0.2)', borderRadius: 20, padding: '2rem' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 10 }}>You don't need any integration.</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.75, margin: 0 }}>
          For teams under 50 people, the EquiAI web app is all you need. Upload your HR CSV once a month, get a professional fairness report in 10 seconds. No setup, no code, no IT team required.
        </p>
      </div>

      {/* 3 steps */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', borderRadius: 20, padding: '2rem' }}>
        <h4 style={{ fontWeight: 900, fontSize: '1rem', marginBottom: 22 }}>Your Monthly Workflow — 3 Steps</h4>
        <FlowStep n="1" label="Export your HR data as CSV" sub="From Gusto, BambooHR, or Excel. EquiAI automatically ignores names and ID numbers — no manual cleanup needed." />
        <FlowStep n="2" label="Upload on equiai.com" sub="Drag & drop. Jurisdiction auto-detected. Full analysis in under 10 seconds." />
        <FlowStep n="3" label="Download your PDF report" sub="Professionally formatted. Blockchain-sealed. Ready for HR and legal." last />
      </div>

      {/* Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          { label: 'Traditional Audit Firm', cost: '$50,000/yr', color: '#ef4444', note: 'Slow. Expensive. Manual.', sub: '4–6 weeks turnaround', icon: '❌' },
          { label: 'EquiAI Plan (Free)', cost: '$0/yr', color: '#7c3aed', note: 'Instant. Automated. Legally compliant.', sub: 'Results in 10 seconds', icon: '✅' },
        ].map(item => (
          <div key={item.label} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', borderRadius: 18, padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: item.color, marginBottom: 6 }}>{item.cost}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{item.note}</div>
            <div style={{ fontSize: 11, color: item.color, fontWeight: 700, background: `${item.color}15`, padding: '3px 10px', borderRadius: 99, display: 'inline-block' }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* CTA — centered */}
      <div style={{ textAlign: 'center' }}>
        <button onClick={() => navigate('/')} style={{ padding: '14px 32px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 8px 24px rgba(109,40,217,0.35)', transition: 'all 0.3s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
          Start Free Audit →
        </button>
      </div>

      {/* Sample report preview */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', borderRadius: 20, padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>This is what your report looks like:</div>
        <div style={{ background: 'linear-gradient(135deg,rgba(109,40,217,0.08),transparent)', border: '1px dashed rgba(109,40,217,0.3)', borderRadius: 14, padding: '2.5rem 1.5rem', marginBottom: 14 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📄</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>EquiAI Fairness Audit Report</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fairness Score: 87/100 · Blockchain-Sealed · EU AI Act Compliant</div>
        </div>
        <button onClick={() => navigate('/')} style={{ padding: '9px 22px', background: 'transparent', color: '#7c3aed', border: '1.5px solid #7c3aed', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>View Sample Report →</button>
      </div>
    </motion.div>
  );
}

// ─── PATH: GROWING COMPANY ────────────────────────────────────────────────────
function MediumPath() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(135deg,rgba(109,40,217,0.06),transparent)', border: '1px solid rgba(109,40,217,0.2)', borderRadius: 20, padding: '2rem' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: 10 }}>Install once. Runs forever automatically.</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.75, margin: 0 }}>
          EquiAI CLI runs as a background daemon on your server. Every week it automatically audits your HR data, seals the result on blockchain, and emails a PDF to your compliance team. <strong style={{ color: 'var(--text-primary)' }}>You never press a button again.</strong>
        </p>
      </div>

      <CodeBlock title="Step 1 — Install" code={`pip install equiai`} />
      <CodeBlock title="Step 2 — Initialize (one-time setup)" code={`equiai init

  Company ID:     acme_corp
  Jurisdiction:   EU_AI_ACT
  Alert Email:    hr@acme.com
  Watch Folder:   ~/Documents/datasets/
  Schedule:       weekly
  Threshold:      80

  ✅ Config saved + synced to EquiAI hub.`} />
      <CodeBlock title="Step 3 — Start daemon" code={`equiai start

  🚀 EquiAI Daemon Active
  Company:     acme_corp
  Schedule:    weekly (Mondays 02:00 UTC)
  Watching:    ~/Documents/datasets/
  Threshold:   80/100
  
  ● Running silently — use: equiai stop`} />

      {/* What happens every week */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', borderRadius: 20, padding: '2rem' }}>
        <h4 style={{ fontWeight: 900, fontSize: '1rem', marginBottom: 22 }}>🔄 What Happens Every Week — Fully Automatic</h4>
        <FlowStep n="1" label="Daemon wakes at 02:00 UTC every Monday" sub="Runs silently in background. Survives terminal close." />
        <FlowStep n="2" label="Reads CSV files from your watched folder" sub="PII stays on your machine — it never leaves." />
        <FlowStep n="3" label="Runs full bias audit locally" sub="pandas + numpy. 100% private. Zero cloud dependency." />
        <FlowStep n="4" label="Seals result on blockchain" sub="SHA-256 hash. Tamper-proof, legally admissible audit trail." />
        <FlowStep n="5" label="Emails PDF report to compliance team" sub="Only the fairness score + hash is sent to EquiAI hub." />
        <FlowStep n="6" label="Fires Slack alert if bias detected" sub="Alert fires from your machine. Your data, your control." last />
      </div>

      {/* Command grid */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Useful CLI Commands</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[
            ['equiai status', 'Health check'],
            ['equiai audit file.csv', 'Manual audit'],
            ['equiai history', 'Past audits table'],
            ['equiai stop', 'Stop daemon'],
            ['equiai config --jurisdiction EU', 'Update settings'],
            ['equiai dashboard', 'Open web UI'],
          ].map(([cmd, desc]) => (
            <div key={cmd} style={{ background: '#0d0f1a', borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(109,40,217,0.15)' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#c4b5fd', marginBottom: 4 }}>{cmd}</div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <PrivacyTable />
    </motion.div>
  );
}

// ─── PATH: LARGE ENTERPRISE ───────────────────────────────────────────────────
function LargePath() {
  const { isDark } = useTheme();
  const [activeOption, setActiveOption] = useState('daemon');
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResult, setWebhookResult] = useState(null);

  const testWebhook = async () => {
    setWebhookLoading(true); setWebhookResult(null);
    try {
      const res = await fetch('http://localhost:8000/webhook/decision', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: 'demo_corp', decision: 'rejected', gender: 'female', age: 34, race: 'asian', role: 'engineer', jurisdiction: 'EU_AI_ACT' }),
      });
      setWebhookResult(await res.json());
    } catch {
      setWebhookResult({ error: 'Backend not running. Start: uvicorn main:app --reload' });
    } finally { setWebhookLoading(false); }
  };

  const copyGHYaml = () => {
    const yaml = `name: EquiAI Fairness Gate\non:\n  push:\n    branches: [main]\njobs:\n  bias-audit:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - run: pip install equiai\n      - run: equiai audit data/training_data.csv --threshold 80 --block-on-fail\n        env:\n          EQUIAI_COMPANY_ID: \${{ secrets.EQUIAI_COMPANY_ID }}\n          EQUIAI_AUTH_TOKEN: \${{ secrets.EQUIAI_AUTH_TOKEN }}`;
    navigator.clipboard.writeText(yaml);
    alert('✅ GitHub Actions YAML copied!');
  };

  const options = [
    { id: 'daemon', icon: '🖥️', label: 'CLI Daemon', badge: 'MOST SECURE' },
    { id: 'token', icon: '🔑', label: 'Read-Only Token', badge: 'RECOMMENDED' },
    { id: 's3', icon: '☁️', label: 'S3 / CSV Export', badge: 'SIMPLEST' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 900, margin: '0 auto' }}>

      {/* Step 1 — Connection Method */}
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 6 }}>Step 1 — Choose Your Connection Method</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Three options depending on your security policy. CLI Daemon (Option A) is recommended for regulated industries.</p>

        {/* Option tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {options.map(opt => (
            <button key={opt.id} onClick={() => setActiveOption(opt.id)}
              style={{ flex: 1, padding: '13px 8px', borderRadius: 14, border: `2px solid ${activeOption === opt.id ? '#7c3aed' : 'var(--border-card)'}`, background: activeOption === opt.id ? 'rgba(109,40,217,0.08)' : 'transparent', cursor: 'pointer', transition: 'all 0.25s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ fontSize: 20 }}>{opt.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: activeOption === opt.id ? '#7c3aed' : 'var(--text-muted)' }}>{opt.label}</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 99 }}>{opt.badge}</div>
            </button>
          ))}
        </div>

        {/* Privacy banner */}
        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: 14 }}>
          <p style={{ fontSize: 13, color: '#059669', fontWeight: 700, margin: 0 }}>🔒 Your data NEVER leaves your building. Only the fairness score and a blockchain hash are sent to us.</p>
        </div>

        <AnimatePresence mode="wait">
          {activeOption === 'daemon' && (
            <motion.div key="d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CodeBlock title="Option A — CLI Daemon (Most Secure)" code={`# Install inside your network
pip install equiai

# Connect to your internal database
equiai connect-db \\
  --type postgres \\
  --host company-db.internal \\
  --database hr_decisions \\
  --table hiring_outcomes \\
  --protected-attr gender,race,age \\
  --decision-col hired \\
  --schedule daily

# Start daemon — your data never touches the internet
equiai start`} />
            </motion.div>
          )}
          {activeOption === 'token' && (
            <motion.div key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CodeBlock title="Option B — Read-Only Token (PostgreSQL)" code={`-- Create read-only user in your DB console
CREATE USER equiai_readonly WITH PASSWORD 'your_token_here';

-- Grant SELECT ONLY on specific columns (not PII)
GRANT SELECT (gender, age, race, hired)
  ON TABLE hiring_decisions
  TO equiai_readonly;

-- Paste token into EquiAI — NOT the master password`} />
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Paste Your Read-Only Token</label>
                <input type="password" placeholder="equiai_readonly_tok_..." style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border-card)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
                <button style={{ padding: '11px 24px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Connect Securely →</button>
              </div>
            </motion.div>
          )}
          {activeOption === 's3' && (
            <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CodeBlock title="Option C — S3 Export Connection" code={`-- Export ONLY non-PII columns from your database
SELECT gender, age, race, hired
FROM hiring_decisions
WHERE created_at > NOW() - INTERVAL '30 days';

-- Upload to S3
aws s3 cp decisions_export.csv s3://your-bucket/equiai/

-- Connect once
equiai connect-db --type s3 --bucket s3://your-bucket/equiai/ --schedule weekly`} />
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>S3 Bucket URL</label>
                <input type="text" placeholder="s3://your-compliance-bucket/equiai-exports/" style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border-card)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
                <button style={{ padding: '11px 24px', background: '#d97706', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Connect S3 Bucket →</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Step 2 — Business Tools */}
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 6 }}>Step 2 — Connect Your Business Tools</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>EquiAI embeds directly into the tools your team already uses every day.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>

          {/* Webhook */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', borderRadius: 20, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔌</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Real-Time Webhook</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#d97706', background: 'rgba(217,119,6,0.1)', padding: '1px 8px', borderRadius: 99, display: 'inline-block', marginTop: 2 }}>Enterprise plan</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>Every hiring decision is checked in real-time. Fairness score appears inside Workday, SAP, or BambooHR — your team never leaves their HR tool.</p>
            {webhookResult && (
              <div style={{ background: webhookResult.error ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${webhookResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: 10, padding: '9px 12px', fontSize: 11, fontFamily: 'monospace', color: webhookResult.error ? '#ef4444' : '#059669' }}>
                {webhookResult.error || `Score: ${webhookResult.fairness_score}/100 · ${webhookResult.verdict} · Hash: ${(webhookResult.blockchain_hash || '').slice(0, 16)}...`}
              </div>
            )}
            <button onClick={testWebhook} disabled={webhookLoading} style={{ padding: '9px', background: '#d97706', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, cursor: webhookLoading ? 'not-allowed' : 'pointer', fontSize: 12, opacity: webhookLoading ? 0.6 : 1, marginTop: 'auto' }}>
              {webhookLoading ? '⏳ Sending…' : '▶ Test Live Webhook'}
            </button>
          </div>

          {/* Slack */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', borderRadius: 20, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#4A154B,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💬</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Slack Bot</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#7c3aed', background: 'rgba(124,58,237,0.1)', padding: '1px 8px', borderRadius: 99, display: 'inline-block', marginTop: 2 }}>Business plan</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>HR manager types <code style={{ background: 'rgba(109,40,217,0.1)', padding: '1px 5px', borderRadius: 4 }}>/equiai audit</code> in Slack. Bot responds in 3 seconds with a full fairness report. Nobody leaves Slack.</p>
            <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#f0ebff', borderRadius: 10, padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.9, color: 'var(--text-muted)', marginTop: 'auto' }}>
              <div><span style={{ color: '#7c3aed', fontWeight: 800 }}>HR Mgr:</span> /equiai audit</div>
              <div><span style={{ color: '#7c3aed', fontWeight: 800 }}>EquiAI:</span> Score: 87/100 ✅ Attaching PDF…</div>
            </div>
          </div>

          {/* GitHub Actions */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', borderRadius: 20, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#24292e,#57606a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚙️</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>GitHub Actions Gate</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#238636', background: 'rgba(35,134,54,0.1)', padding: '1px 8px', borderRadius: 99, display: 'inline-block', marginTop: 2 }}>Business plan</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>Every <code style={{ background: 'rgba(109,40,217,0.1)', padding: '1px 5px', borderRadius: 4 }}>git push</code> triggers a fairness audit. Biased model = deployment blocked. Fair model = auto-approved.</p>
            <div style={{ background: '#0d1117', borderRadius: 10, padding: '1rem', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.9, marginTop: 'auto' }}>
              <div style={{ color: '#7ee787' }}>✓ Score: 87/100 — DEPLOYMENT APPROVED</div>
              <div style={{ color: '#ef4444' }}>✗ Score: 43/100 — DEPLOYMENT BLOCKED</div>
            </div>
            <button onClick={copyGHYaml} style={{ padding: '9px', background: '#238636', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 12 }}>📋 Copy GitHub Actions YAML</button>
          </div>

          {/* Teams */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', borderRadius: 20, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#6264A7,#464775)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👥</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Microsoft Teams</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#6264A7', background: 'rgba(98,100,167,0.12)', padding: '1px 8px', borderRadius: 99, display: 'inline-block', marginTop: 2 }}>Enterprise plan</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>HR Manager types <code style={{ background: 'rgba(109,40,217,0.1)', padding: '1px 5px', borderRadius: 4 }}>@EquiAI run monthly audit</code>. Bot pulls latest data and posts results with PDF in Teams channels.</p>
            <div style={{ background: 'rgba(98,100,167,0.07)', border: '1px solid rgba(98,100,167,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 11, lineHeight: 1.8, marginTop: 'auto', color: 'var(--text-muted)' }}>
              Contact enterprise sales for Teams bot onboarding.
            </div>
          </div>
        </div>
      </div>

      {/* Day 2 automation grid */}
      <div style={{ background: 'linear-gradient(135deg,rgba(109,40,217,0.05),transparent)', border: '1px solid rgba(109,40,217,0.15)', borderRadius: 20, padding: '2rem' }}>
        <h3 style={{ fontWeight: 900, marginBottom: 6 }}>Day 2 Onwards — Complete Automation</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 18 }}>After Day 1 setup, everything below happens automatically — forever:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 10 }}>
          {[
            ['Every hiring decision', '→ auto-checked', '🔌'],
            ['Every model deploy', '→ blocked if biased', '⚙️'],
            ['Every week', '→ auto audit report', '📊'],
            ['Every month', '→ email to legal', '📧'],
            ['Every bias event', '→ instant Slack alert', '🚨'],
            ['Every audit', '→ blockchain-sealed', '🔗'],
          ].map(([trigger, action, icon]) => (
            <div key={trigger} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', borderRadius: 14, padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 3 }}>{trigger}</div>
              <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>{action}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button style={{ padding: '13px 28px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 24px rgba(109,40,217,0.35)' }}>
          Book Enterprise Demo →
        </button>
        <button style={{ padding: '13px 28px', background: 'transparent', color: '#7c3aed', border: '1.5px solid #7c3aed', borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Contact enterprise sales
        </button>
      </div>

      <PrivacyTable />
    </motion.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Integrations() {
  const [companySize, setCompanySize] = useState(null);

  const sizes = [
    {
      id: 'small', emoji: '🏢', label: 'Small Team', sub: '1–50 employees',
      desc: 'Upload a CSV once a month. Get a fairness report in 10 seconds. No integration needed.',
      badge: 'Free Plan', badgeColor: '#6b7280', accentColor: '#6b7280',
      savings: '💰 Save $50,000/yr vs audit firms.',
      cta: 'Get Started Free',
    },
    {
      id: 'medium', emoji: '🏬', label: 'Growing Company', sub: '50–500 employees',
      desc: 'Install CLI daemon once. Runs automatically every week. Zero manual work needed.',
      badge: 'Starter — $49/mo', badgeColor: '#7c3aed', accentColor: '#7c3aed',
      savings: '💰 Replaces a $200K/yr compliance consultant.',
      cta: 'View Setup Guide',
    },
    {
      id: 'large', emoji: '🏛️', label: 'Large Enterprise', sub: '500+ employees',
      desc: 'Full embedding into Workday, GitHub, Slack, and your database infrastructure.',
      badge: 'Business / Enterprise', badgeColor: '#6d28d9', accentColor: '#6d28d9',
      savings: '💰 Zero human auditing. Fully automated.',
      cta: 'Book Enterprise Demo',
    },
  ];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text-primary)', transition: 'background 0.35s ease' }}>
      <Navbar />

      {/* Background glow */}
      <div style={{ position: 'fixed', top: '5%', right: '-8%', width: '40%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,40,217,0.06),transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '4rem 2rem', position: 'relative', zIndex: 1 }}>

        {/* HERO */}
        <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.1 } } }} style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <motion.div variants={fadeUp}><Pill>⚙️ Enterprise Integration Hub</Pill></motion.div>
          <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '1rem', background: 'linear-gradient(135deg,var(--text-primary) 40%,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Choose Your Path
          </motion.h1>
          <motion.p variants={fadeUp} style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: 500, margin: '0 auto', lineHeight: 1.75 }}>
            We'll show you the exact integration that fits your size and complexity.
          </motion.p>
        </motion.div>

        {/* SIZE PICKER — 3 cards side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: companySize ? '3rem' : '1rem' }}>
          {sizes.map(size => {
            const selected = companySize === size.id;
            return (
              <motion.button
                key={size.id}
                onClick={() => setCompanySize(selected ? null : size.id)}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: selected ? 'var(--card-bg)' : 'transparent',
                  border: `2px solid ${selected ? size.accentColor : 'var(--border-card)'}`,
                  borderRadius: 24, padding: '1.75rem', textAlign: 'left', cursor: 'pointer',
                  boxShadow: selected ? `0 20px 48px rgba(109,40,217,0.1)` : 'none',
                  transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  position: 'relative', overflow: 'hidden',
                }}>
                {selected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${size.accentColor},${size.accentColor}88)` }} />}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ fontSize: 34 }}>{size.emoji}</div>
                  <div style={{ fontSize: 9, fontWeight: 900, color: size.badgeColor, background: `${size.badgeColor}18`, padding: '3px 10px', borderRadius: 99, border: `1px solid ${size.badgeColor}30`, letterSpacing: '0.05em' }}>{size.badge}</div>
                </div>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: selected ? size.accentColor : 'var(--text-primary)', marginBottom: 3 }}>{size.label}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>{size.sub}</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65, margin: '0 0 14px' }}>{size.desc}</p>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', background: 'rgba(5,150,105,0.08)', padding: '6px 12px', borderRadius: 8, marginBottom: 12 }}>{size.savings}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: size.accentColor, display: 'flex', alignItems: 'center', gap: 4 }}>{size.cta} {selected ? '▲' : '▼'}</div>
              </motion.button>
            );
          })}
        </div>

        {/* Path content */}
        <AnimatePresence mode="wait">
          {companySize === 'small'  && <SmallPath  key="small"  />}
          {companySize === 'medium' && <MediumPath key="medium" />}
          {companySize === 'large'  && <LargePath  key="large"  />}
        </AnimatePresence>
      </main>

      <footer style={{ marginTop: '3rem', padding: '2.5rem 2rem', borderTop: '1px solid var(--nav-border)', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--text-hint)', margin: 0 }}>
          © {new Date().getFullYear()} EquiAI Inc. · Enterprise Algorithmic Fairness Platform · GDPR · SOC 2 · ISO 27001
        </p>
      </footer>
    </div>
  );
}
