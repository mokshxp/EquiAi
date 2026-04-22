import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { runBiasAnalysis } from '../utils/biasDetection';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { getSessionId, getPlan, setPlan as savePlan } from '../utils/session';
import UpgradeModal from '../components/UpgradeModal';
import AuditCounter from '../components/AuditCounter';
import Navbar from '../components/Navbar';

const fadeUp = { 
  initial: { opacity: 0, y: 10 }, 
  animate: { opacity: 1, y: 0 }, 
  transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } 
};

export default function Audit() {
  const [plan, setPlanState] = useState(getPlan());
  const [auditsRemaining, setAuditsRemaining] = useState(3);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('limit_reached');
  
  const [results, setResults] = useState(null);
  const [selectedCol, setSelectedCol] = useState('');
  const [useCase, setUseCase] = useState('Hiring');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jurisdiction, setJurisdiction] = useState('US_EEOC');
  const [language, setLanguage] = useState('English');
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [blockchainBlock, setBlockchainBlock] = useState(null);
  const [lastUploadedFile, setLastUploadedFile] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  
  const { isDark } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://localhost:8000/plan/${getSessionId()}`)
      .then(r => r.json())
      .then(d => {
        setPlanState(d.plan);
        savePlan(d.plan);
        setAuditsRemaining(d.audits_remaining);
      })
      .catch(console.error);

    const history = JSON.parse(localStorage.getItem('equiai_audit_history') || '[]');
    setAuditHistory(history);
  }, []);

  const saveAuditToHistory = (auditData) => {
    const history = JSON.parse(localStorage.getItem('equiai_audit_history') || '[]');
    const newAudit = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      filename: auditData.filename,
      score: auditData.score,
      verdict: auditData.verdict,
      hash: auditData.hash,
      jurisdiction: auditData.jurisdiction
    };
    const updatedHistory = [newAudit, ...history];
    localStorage.setItem('equiai_audit_history', JSON.stringify(updatedHistory));
    setAuditHistory(updatedHistory);
  };

  const fetchAIExplanation = useCallback(async (biasResults, jurisdictionInfo, lang) => {
    setAiLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bias_results: biasResults, jurisdiction_info: jurisdictionInfo, language: lang }),
      });
      const d = await res.json();
      if (d.explanation) setAiExplanation(d.explanation);
    } catch {
    } finally {
      setAiLoading(false);
    }
  }, []);

  const downloadPDF = async (filename, file) => {
    if (plan === 'free') {
      setUpgradeReason('pdf_locked');
      setShowUpgradeModal(true);
      return;
    }
    const targetFile = file || lastUploadedFile;
    if (!targetFile) return alert("File source not found.");
    
    const formData = new FormData();
    formData.append('file', targetFile);
    try {
      const res = await fetch('http://localhost:8000/api/export/pdf', { method: 'POST', body: formData });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `equiai_report_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
    } catch (e) { alert("PDF export failed."); }
  };

  const handleAnalysisResponse = (data, file) => {
    const allCols = [data?.bias_results?.decision_column || '', ...(data?.bias_results?.demographic_columns || [])].join(' ').toLowerCase();
    let autoUseCase = 'Hiring';
    if (allCols.includes('loan') || allCols.includes('credit') || allCols.includes('default') || allCols.includes('approve') || allCols.includes('status')) autoUseCase = 'Loan';
    else if (allCols.includes('gpa') || allCols.includes('admit') || allCols.includes('college') || allCols.includes('student') || allCols.includes('accept')) autoUseCase = 'College';

    const mappedResults = {
        demographicCols: data?.bias_results?.demographic_columns || [],
        columnAnalyses: Object.fromEntries(
            Object.entries(data?.bias_results?.column_analyses || {}).map(([col, an]) => [
                col,
                {
                    groupRates: an?.group_rates || {},
                    groupCounts: an?.group_counts || {},
                    biasScore: an?.bias_score ?? 0,
                    minRatio: an?.min_ratio ?? 1,
                    majorityGroup: an?.disparate_impact?.majority_group || "Unknown",
                    biasLevel: an?.bias_level || "FAIR",
                    isSmartBucketed: an?.is_smart_bucketed || false
                }
            ])
        ),
        predictedUseCase: autoUseCase,
        confidence: '95%'
    };
    setResults(mappedResults);
    setUseCase(autoUseCase);
    setBlockchainBlock(data?.blockchain_block);
    if (data.plan) { setPlanState(data.plan); savePlan(data.plan); }
    if (data.audits_remaining !== undefined) setAuditsRemaining(data.audits_remaining);
    setLastUploadedFile(file);
    setAiExplanation(data?.ai_explanation || '');
    
    const allScores = Object.values(mappedResults.columnAnalyses).map(a => a.biasScore);
    const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a,b)=>a+b, 0) / allScores.length) : 100;
    
    saveAuditToHistory({
      filename: file.name,
      score: avgScore,
      verdict: avgScore >= 80 ? 'Fair' : avgScore >= 60 ? 'Moderate' : 'High Bias',
      hash: data.blockchain_block?.hash?.substring(0, 10) || 'N/A',
      jurisdiction: jurisdiction
    });

    fetchAIExplanation(data?.bias_results, data?.jurisdiction_info || 'Global Standard', data?.language || language);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('jurisdiction', jurisdiction);
      formData.append('language', language);
      formData.append('session_id', getSessionId());
      
      const response = await fetch('http://localhost:8000/api/analyze', { method: 'POST', body: formData });
      const data = await response.json();
      
      if (response.status === 429) { setUpgradeReason('limit_reached'); setShowUpgradeModal(true); return; }
      if (response.status === 403) { setUpgradeReason('jurisdiction_locked'); setShowUpgradeModal(true); return; }
      
      if (response.ok) {
        handleAnalysisResponse(data, file);
      } else {
        alert("Analysis Failed: " + (data.detail || "Unknown error"));
      }
    } catch (error) {
      alert("Error connecting to backend.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSampleUpload = async () => {
    setIsAnalyzing(true);
    try {
      const csvContent = ['Name,Gender,Race,Selected','Alice,Female,Asian,No','Bob,Male,White,Yes','Carol,Female,Black,No','David,Male,White,Yes','Eva,Female,Hispanic,No','Frank,Male,Asian,Yes','Grace,Female,White,No','Henry,Male,Black,Yes','Isabella,Female,Asian,No','James,Male,Hispanic,Yes','Karen,Female,White,Yes','Leo,Male,Black,No','Maria,Female,Hispanic,No','Nathan,Male,White,Yes','Olivia,Female,Black,No','Paul,Male,Asian,Yes'].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], "sample_data.csv", { type: 'text/csv' });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('jurisdiction', jurisdiction);
      formData.append('language', language);
      formData.append('session_id', getSessionId());
      
      const response = await fetch('http://localhost:8000/api/analyze', { method: 'POST', body: formData });
      const data = await response.json();
      
      if (response.status === 429) { setUpgradeReason('limit_reached'); setShowUpgradeModal(true); return; }
      if (response.ok) {
        handleAnalysisResponse(data, file);
      }
    } catch (error) {
    } finally {
      setIsAnalyzing(false);
    }
  };

  const useCaseMap = { 'Hiring': ['gender', 'age', 'education', 'race', 'ethnicity'], 'Loan': ['gender', 'age', 'income', 'race', 'ethnicity', 'marital'], 'College': ['gender', 'age', 'education', 'race', 'ethnicity', 'nationality'] };
  const allowedCols = useCaseMap[useCase] || [];
  const filteredCols = results ? results.demographicCols.filter(c => allowedCols.some(ac => c.toLowerCase().includes(ac))) : [];

  useEffect(() => {
    if (results && filteredCols.length > 0 && !filteredCols.includes(selectedCol)) {
      setSelectedCol(filteredCols[0]);
    }
  }, [results, useCase, selectedCol, filteredCols]);

  const displayedHistory = plan === 'pro' ? auditHistory : auditHistory.slice(0, 3);

  // Styles
  const containerStyle = {
    background: 'var(--bg)',
    minHeight: '100vh',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--text-primary)',
    paddingBottom: '4rem'
  };

  const mainStyle = {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '3rem 1.5rem'
  };

  const cardStyle = {
    background: 'var(--card-bg)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
    overflow: 'hidden'
  };

  const sectionHeadingStyle = {
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#7c3aed',
    marginBottom: '1rem',
    display: 'block'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    cursor: 'pointer'
  };

  return (
    <div style={containerStyle}>
      {showUpgradeModal && (
        <UpgradeModal 
          reason={upgradeReason} 
          onClose={() => setShowUpgradeModal(false)}
          onSuccess={() => { setPlanState('pro'); savePlan('pro'); }}
        />
      )}
      <Navbar />

      <main style={mainStyle}>
        {/* Header */}
        <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Audit Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Comprehensive bias analysis for enterprise-ready AI models.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
             <AuditCounter plan={plan} remaining={auditsRemaining} onUpgradeClick={() => { setUpgradeReason('limit_reached'); setShowUpgradeModal(true); }} />
          </div>
        </header>

        {/* Audit Controls & Upload */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
          {/* Upload Box */}
          <section style={{ ...cardStyle, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <span style={sectionHeadingStyle}>Data Source</span>
            <div 
              onClick={() => document.getElementById('file-upload-input').click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#7c3aed'; }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; handleFileUpload({ target: { files: e.dataTransfer.files } }); }}
              style={{
                flex: 1,
                border: '2px dashed var(--border)',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 2rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
              }}
            >
              <input type="file" id="file-upload-input" hidden onChange={handleFileUpload} accept=".csv" />
              <div style={{ fontSize: '2.5rem', marginBottom: '1.5rem', opacity: isAnalyzing ? 0.5 : 1 }}>
                {isAnalyzing ? '◌' : '↑'}
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                {isAnalyzing ? 'Analyzing Data...' : 'Upload Dataset'}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                Drop your CSV file here or click to browse. <br/> Secure, local-first analysis.
              </p>
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button 
                onClick={handleSampleUpload}
                disabled={isAnalyzing}
                style={{ 
                  flex: 1, 
                  padding: '0.75rem', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border)', 
                  background: 'transparent', 
                  color: 'var(--text-primary)', 
                  fontWeight: '600', 
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Use Sample Data
              </button>
            </div>
          </section>

          {/* Configuration */}
          <section style={{ ...cardStyle, padding: '2rem' }}>
            <span style={sectionHeadingStyle}>Configuration</span>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Compliance Framework</label>
              <select value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} style={inputStyle}>
                <option value="US_EEOC">US (EEOC 4/5ths Rule)</option>
                <option value="EU_AI_ACT">EU (AI Act Safety)</option>
                <option value="UK_EQUALITY">UK (Equality Act)</option>
                <option value="INDIA_CONSTITUTION">India (Article 15/16)</option>
                <option value="GLOBAL_STANDARD">Global (Parity Standard)</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Report Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} style={inputStyle}>
                <option>English</option>
                <option>Hindi</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>

            <div style={{ padding: '1rem', borderRadius: '8px', background: '#7c3aed10', border: '1px solid #7c3aed20' }}>
              <p style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: '500', lineHeight: '1.4' }}>
                <b>Note:</b> Your data is processed locally. We only store the final audit metadata for your history.
              </p>
            </div>
          </section>
        </div>

        {/* Results Area */}
        <AnimatePresence>
          {results && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              style={{ marginBottom: '4rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Analysis Results</h2>
                <button 
                  onClick={() => downloadPDF()} 
                  style={{ 
                    padding: '0.6rem 1.25rem', 
                    borderRadius: '8px', 
                    background: '#7c3aed', 
                    color: 'white', 
                    border: 'none', 
                    fontWeight: '600', 
                    fontSize: '0.9rem',
                    cursor: 'pointer' 
                  }}
                >
                  Export PDF Report
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ ...cardStyle, padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Fidelity Score</span>
                  <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#7c3aed', marginTop: '0.5rem' }}>
                    {results.columnAnalyses[filteredCols[0] || Object.keys(results.columnAnalyses)[0]]?.biasScore || 100}<span style={{ fontSize: '1rem', fontWeight: '600' }}>%</span>
                  </div>
                </div>
                <div style={{ ...cardStyle, padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Compliance Status</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#10b981', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>✓</span> FAIR
                  </div>
                </div>
                <div style={{ ...cardStyle, padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Confidence Interval</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.75rem' }}>
                    {results.confidence}
                  </div>
                </div>
              </div>

              {aiExplanation && (
                <div style={{ ...cardStyle, padding: '2rem', background: isDark ? 'rgba(255,255,255,0.02)' : '#fafafa', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7c3aed' }}></div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7c3aed' }}>Legal Compliance Narrative</span>
                  </div>
                  <p style={{ fontSize: '1rem', lineHeight: '1.7', color: 'var(--text-primary)', opacity: 0.9 }}>
                    {aiExplanation}
                  </p>
                </div>
              )}

              {/* Detailed Data Visualization */}
              <div style={{ ...cardStyle, padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem' }}>Group Selection Rates</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Comparison of positive outcome rates across demographic categories.</p>
                  </div>
                  {filteredCols.length > 1 && (
                    <select 
                      value={selectedCol} 
                      onChange={(e) => setSelectedCol(e.target.value)}
                      style={{ ...inputStyle, width: 'auto', minWidth: '150px' }}
                    >
                      {filteredCols.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={{ height: '350px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(results.columnAnalyses[selectedCol || filteredCols[0]]?.groupRates || {}).map(([name, groupData]) => {
                        const rateVal = typeof groupData === 'object' && groupData !== null ? (groupData.rate ?? 0) : (typeof groupData === 'number' ? groupData : 0);
                        return {
                          name: name.length > 15 ? name.substring(0, 12) + '...' : name,
                          rate: Math.round(rateVal * 100),
                          fullName: name
                        };
                      })}
                      margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#eee'} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                        unit="%"
                      />
                      <Tooltip 
                        cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                        contentStyle={{ 
                          background: 'var(--card-bg)', 
                          border: '1px solid var(--border)', 
                          borderRadius: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value) => [`${value}%`, 'Selection Rate']}
                        labelStyle={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}
                      />
                      <Bar 
                        dataKey="rate" 
                        radius={[6, 6, 0, 0]} 
                        barSize={40}
                      >
                        {Object.entries(results.columnAnalyses[selectedCol || filteredCols[0]]?.groupRates || {}).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === 0 ? '#7c3aed' : '#a78bfa'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {Object.entries(results.columnAnalyses[selectedCol || filteredCols[0]]?.groupRates || {}).map(([name, groupData], idx) => {
                    // Extract rate, selected, and total with extreme prejudice for numbers
                    const getVal = (val, key) => {
                      if (typeof val === 'object' && val !== null) return val[key] ?? val;
                      return val;
                    };

                    const rateVal = getVal(groupData, 'rate');
                    const rawSelected = typeof groupData === 'object' && groupData !== null ? groupData.selected : (results.columnAnalyses[selectedCol || filteredCols[0]]?.groupCounts[name] || 0);
                    const rawTotal = typeof groupData === 'object' && groupData !== null ? groupData.total : null;

                    const selectedCount = typeof rawSelected === 'object' && rawSelected !== null ? (rawSelected.selected ?? rawSelected.rate ?? 0) : rawSelected;
                    const totalCount = typeof rawTotal === 'object' && rawTotal !== null ? (rawTotal.total ?? rawTotal.rate ?? 0) : rawTotal;
                    
                    return (
                      <div key={name} style={{ padding: '1rem', borderRadius: '8px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{name}</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: idx === 0 ? '#7c3aed' : 'var(--text-primary)' }}>
                          {Math.round((typeof rateVal === 'number' ? rateVal : 0) * 100)}%
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Selected: {typeof selectedCount === 'number' ? selectedCount : '0'} {typeof totalCount === 'number' ? `/ ${totalCount}` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Audit History */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Recent Audits</h2>
            {plan === 'free' && auditHistory.length > 3 && (
                <button 
                  onClick={() => setShowUpgradeModal(true)}
                  style={{ color: '#7c3aed', fontWeight: '600', fontSize: '0.9rem', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  View full history →
                </button>
            )}
          </div>
          
          <div style={{ ...cardStyle }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: isDark ? 'rgba(255,255,255,0.02)' : '#fcfcfc' }}>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Details</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dataset</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Score</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verdict</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Blockchain</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedHistory.length > 0 ? displayedHistory.map(audit => (
                  <tr key={audit.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{audit.date}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{audit.time}</div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{audit.filename}</div>
                      <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: '500' }}>{audit.jurisdiction.replace('_', ' ')}</div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: '700', color: audit.score >= 80 ? '#10b981' : '#f59e0b' }}>
                        {audit.score}%
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ 
                        display: 'inline-flex', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '99px', 
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        background: audit.verdict === 'Fair' ? '#dcfce7' : '#fef3c7',
                        color: audit.verdict === 'Fair' ? '#166534' : '#92400e'
                      }}>
                        {audit.verdict.toUpperCase()}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <code style={{ fontSize: '0.75rem', background: 'var(--bg)', padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border)' }}>{audit.hash}</code>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <button 
                        onClick={() => downloadPDF(audit.filename)}
                        style={{ 
                          padding: '0.4rem 0.8rem', 
                          borderRadius: '6px', 
                          border: '1px solid var(--border)', 
                          background: 'white', 
                          color: '#374151', 
                          fontSize: '0.75rem', 
                          fontWeight: '600', 
                          cursor: 'pointer' 
                        }}
                      >
                        PDF
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      No audit history found. Start your first analysis above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
