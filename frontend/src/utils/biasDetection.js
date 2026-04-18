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
  const groups = {}
  rows.forEach(row => {
    const group = String(row[demographicCol] ?? 'Unknown')
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
  let biasScore = minRatio >= 1.0 ? 0 : minRatio >= 0.8 ? ((1.0 - minRatio) / 0.2) * 20 : 20 + ((0.8 - minRatio) / 0.3) * 50
  return { column: demographicCol, groups, groupRates, majorityGroup, majorityRate, ratios, minRatio, biasScore: Math.min(Math.round(biasScore), 100), biasLevel: minRatio < 0.8 ? 'BIASED' : minRatio < 0.9 ? 'WARNING' : 'FAIR' }
}

export function runBiasAnalysis(rows) {
  const { demographicCols, decisionCol } = detectColumns(rows)
  if (!decisionCol || demographicCols.length === 0) return { error: 'Missing columns' }
  const columnAnalyses = {}
  demographicCols.forEach(col => columnAnalyses[col] = analyzeColumn(rows, decisionCol, col))
  const allScores = Object.values(columnAnalyses).map(a => a.biasScore)
  const overallBiasScore = Math.max(...allScores)
  return { totalRows: rows.length, totalSelected: rows.filter(r => POSITIVE_VALUES.has(String(r[decisionCol]).toLowerCase().trim())).length, decisionCol, demographicCols, columnAnalyses, overallBiasScore, overallBiasLevel: overallBiasScore >= 40 ? 'BIASED' : overallBiasScore >= 20 ? 'WARNING' : 'FAIR' }
}
