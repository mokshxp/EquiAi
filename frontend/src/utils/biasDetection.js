import { useState, useCallback } from 'react'
import Papa from 'papaparse'

const POSITIVE_VALUES = new Set(['yes', '1', 'true', 'approved', 'hired', 'selected', 'accepted', 'granted', 'passed', 'admitted', 'promoted'])
const DEMOGRAPHIC_KEYWORDS = ['gender', 'sex', 'race', 'ethnicity', 'age', 'religion', 'income', 'nationality', 'disability', 'marital', 'education']
const DECISION_KEYWORDS = ['selected', 'approved', 'hired', 'accepted', 'granted', 'outcome', 'decision', 'result', 'label', 'target', 'class']

export function detectColumns(rows) {
  if (!rows || rows.length === 0) return { demographicCols: [], decisionCol: null }
  const cols = Object.keys(rows[0])
  let decisionCol = null, demographicCols = []
  cols.forEach(col => {
    const lower = col.toLowerCase().trim()
    if (DECISION_KEYWORDS.some(k => lower.includes(k))) decisionCol = col
    else if (DEMOGRAPHIC_KEYWORDS.some(k => lower.includes(k))) demographicCols.push(col)
  })
  return { demographicCols, decisionCol }
}

export function analyzeColumn(rows, decisionCol, demographicCol) {
  const vals = rows.map(r => r[demographicCol]).filter(v => v !== null && v !== undefined && v !== '');
  const uniques = new Set(vals);
  
  let isNumeric = false;
  let median = 0;
  
  // Continuous Variable Bucketing Logic
  if (uniques.size > 10) {
    const numVals = vals.map(v => parseFloat(v)).filter(n => !isNaN(n));
    if (numVals.length > vals.length * 0.8) { 
      isNumeric = true;
      numVals.sort((a, b) => a - b);
      median = numVals[Math.floor(numVals.length / 2)];
    }
  }

  const groups = {}
  rows.forEach(row => {
    let rawVal = row[demographicCol];
    let group = String(rawVal ?? 'Unknown')
    
    if (isNumeric && rawVal !== null && rawVal !== undefined && rawVal !== '') {
      const num = parseFloat(rawVal);
      if (!isNaN(num)) {
        group = num < median ? `Low (Under ${median})` : `High (${median}+)`;
      }
    }
    if (!groups[group]) groups[group] = { total: 0, selected: 0 }
    groups[group].total++
    const isPos = POSITIVE_VALUES.has(String(row[decisionCol]).toLowerCase().trim())
    if (isPos) groups[group].selected++
  })
  const groupRates = {}
  Object.entries(groups).forEach(([g, d]) => groupRates[g] = d.total > 0 ? d.selected / d.total : 0)
  const majorityGroup = Object.entries(groupRates).reduce((a, b) => b[1] > a[1] ? b : a)[0]
  const majorityRate = groupRates[majorityGroup]
  const ratios = {}
  Object.entries(groupRates).forEach(([g, rate]) => ratios[g] = majorityRate > 0 ? rate / majorityRate : 1)
  const minRatio = Math.min(...Object.values(ratios))
  let biasScore = Math.min(minRatio, 1.0) * 100;
  return { column: demographicCol, groups, groupRates, majorityGroup, majorityRate, ratios, minRatio, biasScore: Math.round(biasScore), biasLevel: biasScore < 50 ? 'BIASED' : biasScore < 80 ? 'WARNING' : 'FAIR' }
}

export function runBiasAnalysis(rows) {
  const { demographicCols, decisionCol } = detectColumns(rows)
  if (!decisionCol || demographicCols.length === 0) return { error: 'Missing columns' }
  
  // Smart Auto-Detection for Use Case
  let predictedUseCase = 'Hiring'; // Default fallback
  let confidence = 'Low';
  
  const targetCol = String(decisionCol).toLowerCase().trim();
  
  // Sample up to 100 limit to keep it extremely fast
  const sampleRows = rows.slice(0, 100);
  const decisionValsStr = sampleRows.map(r => String(r[decisionCol]).toLowerCase()).join(' ');
  
  const isLoan = targetCol.includes('loan') || targetCol.includes('approve') || decisionValsStr.includes('approved') || decisionValsStr.includes('loan');
  const isCollege = targetCol.includes('admit') || targetCol.includes('admission') || decisionValsStr.includes('admitted');
  const isHiring = targetCol.includes('hire') || targetCol.includes('select') || decisionValsStr.includes('hired') || decisionValsStr.includes('selected');
  
  if (isLoan) {
    predictedUseCase = 'Loan';
    confidence = 'High';
  } else if (isCollege) {
    predictedUseCase = 'College';
    confidence = 'High';
  } else if (isHiring) {
    predictedUseCase = 'Hiring';
    confidence = 'High';
  }

  const columnAnalyses = {}
  demographicCols.forEach(col => columnAnalyses[col] = analyzeColumn(rows, decisionCol, col))
  const allScores = Object.values(columnAnalyses).map(a => a.biasScore)
  const overallBiasScore = Math.min(...allScores)
  return { predictedUseCase, confidence, totalRows: rows.length, totalSelected: rows.filter(r => POSITIVE_VALUES.has(String(r[decisionCol]).toLowerCase().trim())).length, decisionCol, demographicCols, columnAnalyses, overallBiasScore, overallBiasLevel: overallBiasScore < 50 ? 'BIASED' : overallBiasScore < 80 ? 'WARNING' : 'FAIR' }
}
