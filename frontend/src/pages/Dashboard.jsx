import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard({ results, aiExplanation, fileName }) {
  const navigate = useNavigate()
  if (!results) return <div className="p-20 text-center"><button onClick={() => navigate('/')}>Upload Data first</button></div>
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold font-display">Bias Audit Dashboard</h1>
        <button className="px-4 py-2 bg-white/10 rounded-lg" onClick={() => navigate('/')}>New Audit</button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card p-8 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Bias Score</div>
          <div className={`text-6xl font-black ${results.overallBiasLevel === 'BIASED' ? 'text-red-400' : 'text-emerald-400'}`}>{results.overallBiasScore}</div>
          <div className="mt-2 text-sm font-bold uppercase">{results.overallBiasLevel}</div>
        </div>
        <div className="md:col-span-2 glass-card p-8">
          <h3 className="font-bold mb-4">Demographic Coverage</h3>
          <div className="flex flex-wrap gap-2">
            {results.demographicCols.map(c => <span key={c} className="px-3 py-1 bg-violet-500/20 text-violet-300 rounded-full text-sm">{c}</span>)}
          </div>
          <div className="mt-6 text-sm text-gray-400">Decision Column: <span className="text-emerald-400">{results.decisionCol}</span></div>
        </div>
      </div>
      <div className="space-y-6">
        {Object.entries(results.columnAnalyses).map(([col, data]) => (
          <div key={col} className="glass-card p-6">
            <h4 className="font-bold text-lg mb-4">{col} Analysis</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(data.groupRates).map(([group, rate]) => (
                <div key={group} className="p-4 bg-white/5 rounded-xl">
                  <div className="text-xs text-gray-400 mb-1">{group}</div>
                  <div className="text-2xl font-bold">{(rate * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-gray-500">DI: {data.ratios[group].toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
