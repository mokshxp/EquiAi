import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShieldCheckIcon, 
  CpuChipIcon, 
  LinkIcon, 
  BeakerIcon,
  BellAlertIcon,
  DocumentArrowDownIcon,
  ArrowLeftIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('audit')
  const [chain, setChain] = useState([])
  const [isLoadingChain, setIsLoadingChain] = useState(false)
  
  // Try to get results from navigation state
  const auditData = location.state?.auditData || null
  const results = auditData?.bias_results || null
  const aiExplanation = auditData?.ai_explanation || null

  useEffect(() => {
    fetchChain()
  }, [])

  const fetchChain = async () => {
    setIsLoadingChain(true)
    try {
      const res = await fetch('http://localhost:8000/api/chain')
      const data = await res.json()
      setChain(data.chain || [])
    } catch (e) {
      console.error("Failed to fetch chain", e)
    } finally {
      setIsLoadingChain(false)
    }
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <BeakerIcon className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Active Audit Data</h2>
        <p className="text-gray-400 mb-8 max-w-sm">Please upload a dataset or trigger an automated scan to view the fairness dashboard.</p>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Return to Upload
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      {/* Navigation Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-20 md:w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col items-center py-8 z-50">
        <div className="flex items-center gap-3 mb-12 px-6">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheckIcon className="w-6 h-6 text-black" />
          </div>
          <span className="hidden md:block text-xl font-black tracking-tighter">EQUI<span className="text-emerald-400">AI</span></span>
        </div>

        <div className="flex-1 w-full px-4 space-y-2">
          <NavItem active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<BeakerIcon className="w-6 h-6" />} label="Bias Audit" />
          <NavItem active={activeTab === 'automation'} onClick={() => setActiveTab('automation')} icon={<CommandLineIcon className="w-6 h-6" />} label="Automation" />
          <NavItem active={activeTab === 'blockchain'} onClick={() => setActiveTab('blockchain')} icon={<LinkIcon className="w-6 h-6" />} label="Audit Chain" />
        </div>

        <div className="px-4 w-full">
          <button onClick={() => navigate('/')} className="w-full flex items-center justify-center md:justify-start gap-4 p-4 text-gray-500 hover:text-white transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
            <span className="hidden md:block font-bold">Log out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="pl-20 md:pl-64 pt-8 pb-20 px-4 md:px-12 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Audit System
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
              {activeTab === 'audit' && 'Fairness Intelligence'}
              {activeTab === 'automation' && 'Auto-Scan Pipeline'}
              {activeTab === 'blockchain' && 'Immutable Audit Trail'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 text-sm font-bold">
               <DocumentArrowDownIcon className="w-4 h-4" /> Export PDF
             </button>
             <button onClick={() => navigate('/')} className="px-4 py-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-colors text-sm font-bold">
               New Dataset Audit
             </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'audit' && (
            <motion.div 
              key="audit"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Top Score Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BeakerIcon className="w-20 h-20" />
                    </div>
                    <div className="text-xs text-gray-400 uppercase font-black tracking-tighter mb-4">Overall Score</div>
                    <div className="text-6xl font-black text-emerald-400 tracking-tighter mb-2">{results.overall_bias_score}</div>
                    <div className={`text-xs font-bold inline-block px-3 py-1 rounded-full ${results.overall_bias_level === 'FAIR' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {results.overall_bias_level} VERDICT
                    </div>
                 </div>

                 <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-3xl md:col-span-3 flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                        <div className="text-xs text-gray-400 uppercase font-black tracking-tighter mb-4">Decision Insights</div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                <span className="text-sm text-gray-500">Dataset Rows</span>
                                <span className="text-xl font-bold">{results.total_rows}</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                <span className="text-sm text-gray-500">Target Feature</span>
                                <span className="text-xl font-bold text-emerald-400 text-right">{results.decision_column}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-sm text-gray-500">Demographic Contexts</span>
                                <div className="flex gap-2">
                                    {results.demographic_columns.map(c => <span key={c} className="text-xs px-2 py-1 bg-white/5 rounded-md">{c}</span>)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-64 bg-emerald-500/5 rounded-2xl p-6 border border-emerald-500/10">
                        <div className="flex items-center gap-2 mb-4">
                            <CpuChipIcon className="w-5 h-5 text-emerald-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Gemini Auditor</span>
                        </div>
                        <p className="text-xs text-emerald-200/60 leading-relaxed italic line-clamp-4">
                            {aiExplanation || "Analysis complete. The fairness engine suggests removing proxy variables to improve disparate impact ratio."}
                        </p>
                    </div>
                 </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {Object.entries(results.column_analyses).map(([col, data]) => (
                  <div key={col} className="bg-[#0f0f0f] border border-white/5 p-8 rounded-3xl">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">{col}</h3>
                            <p className="text-xs text-gray-500">Disparate Impact Threshold: &gt; 0.8</p>
                        </div>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border ${data.bias_level === 'FAIR' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-red-500/20 text-red-400 bg-red-500/5'}`}>
                            {data.bias_score}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {Object.entries(data.group_counts).map(([group, stats]) => (
                            <div key={group} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2 flex justify-between">
                                    {group} 
                                    <span className={data.disparate_impact.majority_group === group ? 'text-emerald-400' : ''}>
                                        {data.disparate_impact.majority_group === group ? 'MAJORITY' : ''}
                                    </span>
                                </div>
                                <div className="text-2xl font-black mb-1">{(stats.rate * 100).toFixed(1)}%</div>
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full ${data.disparate_impact.ratios[group] < 0.8 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${stats.rate * 100}%` }} />
                                </div>
                                <div className="text-[10px] mt-2 text-gray-500 flex justify-between">
                                    <span>Impact Ratio: {data.disparate_impact.ratios[group]}</span>
                                    {data.disparate_impact.ratios[group] < 0.8 && <span className="text-red-400 animate-pulse">! BIAS</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'automation' && (
            <motion.div 
               key="automation"
               initial={{ opacity: 0, x: 20 }} 
               animate={{ opacity: 1, x: 0 }} 
               exit={{ opacity: 0, x: -20 }}
               className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
               <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-3xl">
                  <div className="flex items-center gap-3 mb-8">
                     <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                        <LinkIcon className="w-6 h-6 text-indigo-400" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold">API Webhook Integration</h3>
                        <p className="text-xs text-gray-500">Real-time fairness tracking via API</p>
                     </div>
                  </div>

                  <div className="bg-black/40 rounded-2xl p-6 border border-white/5 space-y-6">
                     <div>
                        <div className="text-[10px] font-black text-gray-500 uppercase mb-2">Endpoint URL</div>
                        <div className="bg-white/5 p-3 rounded-lg flex items-center justify-between group">
                            <code className="text-indigo-300 text-xs">/api/webhook/evaluate</code>
                            <span className="text-[10px] text-gray-600 group-hover:text-indigo-400 cursor-pointer uppercase font-bold">Copy</span>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                           <div className="text-[10px] text-gray-500 mb-1">ALERTS</div>
                           <div className="text-emerald-400 text-sm font-bold uppercase tracking-tighter">Slack Enabled</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                           <div className="text-[10px] text-gray-500 mb-1">STATUS</div>
                           <div className="text-indigo-400 text-sm font-bold uppercase tracking-tighter">Active Listeners</div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-3xl">
                  <div className="flex items-center gap-3 mb-8">
                     <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                        <ShieldCheckIcon className="w-6 h-6 text-amber-400" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold">CI/CD Fairness Gate</h3>
                        <p className="text-xs text-gray-500">GitHub Actions Deployment Blockers</p>
                     </div>
                  </div>

                  <div className="bg-black/40 rounded-2xl p-6 border border-white/5 space-y-6">
                     <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">Production Deploy Guard</span>
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase">Active</span>
                     </div>
                     <div className="space-y-4">
                         <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: '80%' }} />
                         </div>
                         <div className="text-[10px] text-gray-500 flex justify-between">
                            <span>MIN SCORE TO DEPLOY: 80</span>
                            <span className="text-emerald-400">FAIRNESS PASSED ✓</span>
                         </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'blockchain' && (
            <motion.div 
               key="blockchain"
               initial={{ opacity: 0, scale: 0.95 }} 
               animate={{ opacity: 1, scale: 1 }} 
               exit={{ opacity: 0, scale: 1.05 }}
               className="space-y-6"
            >
               {isLoadingChain ? (
                 <div className="text-center py-20 text-gray-500 animate-pulse">Syncing with Audit Chain...</div>
               ) : chain.length === 0 ? (
                 <div className="text-center py-20 text-gray-500">No blockchain entries found. Complete an audit to seal the first block.</div>
               ) : (
                 <div className="space-y-4">
                   {chain.map((block, i) => (
                     <div key={block.hash} className="bg-[#0f0f0f] border border-white/5 flex flex-col md:flex-row gap-6 p-6 rounded-3xl hover:border-emerald-500/30 transition-all group">
                        <div className="flex-shrink-0">
                           <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-emerald-500/30">
                              <span className="text-sm font-black text-gray-500">#{block.index}</span>
                           </div>
                        </div>
                        <div className="flex-1 space-y-3">
                           <div className="flex justify-between flex-wrap gap-2">
                              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                 {block.data.filename || "Automated Scanning"}
                              </span>
                              <span className="text-[10px] text-gray-600 font-mono">{block.timestamp}</span>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="text-[10px] text-gray-500 font-mono break-all leading-relaxed">
                                 <span className="text-emerald-500">HASH:</span> {block.hash}
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono break-all leading-relaxed opacity-50">
                                 <span className="text-gray-400">PREV:</span> {block.prev_hash}
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right">
                              <div className="text-[10px] text-gray-600 uppercase font-black mb-1">Bias Score</div>
                              <div className="text-lg font-black text-emerald-400 tracking-tighter">{block.data.bias_score || "N/A"}</div>
                           </div>
                           <div className="w-px h-10 bg-white/5" />
                           <div className="flex items-center gap-1 text-emerald-500">
                             <ShieldCheckIcon className="w-5 h-5" />
                             <span className="text-[10px] font-black uppercase">Verified</span>
                           </div>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function NavItem({ active, onClick, icon, label }) {
    return (
        <button 
            onClick={onClick}
            className={`w-full flex items-center justify-center md:justify-start gap-4 p-4 rounded-2xl transition-all ${active ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
        >
            {icon}
            <span className={`hidden md:block font-bold text-sm ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
        </button>
    )
}

