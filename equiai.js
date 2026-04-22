#!/usr/bin/env node

/**
 * EquiAI Enterprise CLI v2.0
 * ─────────────────────────────────────────────
 * Commands:
 *   equiai init              - Setup wizard
 *   equiai start             - Start background daemon
 *   equiai stop              - Stop daemon
 *   equiai status            - Show daemon status
 *   equiai audit <file>      - Manual audit on CSV
 *   equiai audit-all <dir>   - Audit all CSVs in folder
 *   equiai connect-db        - Connect to database
 *   equiai watch <dir>       - Watch folder for new CSVs (alias for start)
 *   equiai history           - View past audit table
 *   equiai report            - Info about PDF export
 *   equiai dashboard         - Open web dashboard
 *   equiai config            - Update settings
 *   equiai uninstall         - Remove all config
 */

const fs       = require('fs');
const path     = require('path');
const http     = require('http');
const os       = require('os');
const readline = require('readline');

// ─── CONFIG PATHS ────────────────────────────────────────────────────────────
const CONFIG_DIR   = path.join(os.homedir(), '.equiai');
const CONFIG_FILE  = path.join(CONFIG_DIR, 'config.json');
const PID_FILE     = path.join(CONFIG_DIR, 'daemon.pid');
const HISTORY_FILE = path.join(CONFIG_DIR, 'history.json');
const API_ROOT     = 'http://localhost:8000';

// ─── TERMINAL COLORS ─────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m',
};
const clr  = (col, txt) => `${c[col]}${txt}${c.reset}`;
const bold = (txt) => `${c.bold}${txt}${c.reset}`;
const dim  = (txt) => `${c.dim}${txt}${c.reset}`;
const line = (char = '─', n = 54) => char.repeat(n);

function banner() {
  console.log(clr('magenta', `
╔══════════════════════════════════════════════╗
║  EquiAI  Enterprise CLI  v2.0                ║
║  Global Algorithmic Fairness Platform        ║
╚══════════════════════════════════════════════╝`));
}

function printHelp() {
  banner();
  console.log(`\n${bold('USAGE')}\n  node equiai.js <command> [options]\n`);
  console.log(bold('COMMANDS'));
  const cmds = [
    ['init',                'Setup wizard — company ID, auth, schedule, Slack'],
    ['start',               'Start background daemon (runs forever)'],
    ['stop',                'Stop background daemon'],
    ['status',              'Show daemon status + last audit result'],
    ['audit <file.csv>',    'Manual audit on a specific CSV file'],
    ['audit-all <folder/>', 'Audit every CSV in a folder at once'],
    ['connect-db [flags]',  '--type --host --database --table --schedule'],
    ['watch <folder/>',     'Watch folder — auto-audit any new CSV dropped in'],
    ['history',             'Table of all past audits: date, file, score, verdict'],
    ['report',              'Info: reports auto-generated on every audit'],
    ['dashboard',           'Open http://localhost:5173 in browser'],
    ['config [flags]',      'Update settings: --jurisdiction --threshold --schedule'],
    ['uninstall --clean',   'Remove all config files + stop daemon'],
  ];
  cmds.forEach(([cmd, desc]) =>
    console.log(`  ${clr('cyan', `equiai ${cmd.padEnd(26)}`)} ${dim(desc)}`));
  console.log(`\n${dim('Example: node equiai.js audit ./hiring_data.csv --jurisdiction EU_AI_ACT')}\n`);
}

// ─── CONFIG MANAGEMENT ───────────────────────────────────────────────────────
function ensureDir()   { if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true }); }
function loadConfig()  { try { if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE,'utf8')); } catch{} return null; }
function saveConfig(c) { ensureDir(); fs.writeFileSync(CONFIG_FILE, JSON.stringify(c, null, 2)); }
function loadHistory() { try { if (fs.existsSync(HISTORY_FILE)) return JSON.parse(fs.readFileSync(HISTORY_FILE,'utf8')); } catch{} return []; }
function appendHistory(entry) {
  const h = loadHistory();
  h.unshift({ ...entry, timestamp: new Date().toISOString() });
  ensureDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(h.slice(0, 200), null, 2));
}

// ─── HTTP HELPERS ─────────────────────────────────────────────────────────────
function apiPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = http.request({
      hostname: 'localhost', port: 8000, path: endpoint, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => { let raw = ''; res.on('data', d => raw += d); res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({ _raw: raw }); } }); });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

function apiGet(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`${API_ROOT}${endpoint}`, res => {
      let raw = ''; res.on('data', d => raw += d);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({ _raw: raw }); } });
    }).on('error', reject);
  });
}

function uploadCsv(filePath, jurisdiction, config = {}) {
  return new Promise((resolve, reject) => {
    const boundary   = '----EquiAIBoundary' + Date.now().toString(16);
    const fileData   = fs.readFileSync(filePath);
    const fileName   = path.basename(filePath);
    const jur        = jurisdiction || config.jurisdiction || 'GLOBAL_MIN';
    const jPart      = `--${boundary}\r\nContent-Disposition: form-data; name="jurisdiction"\r\n\r\n${jur}\r\n`;
    const fHead      = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: text/csv\r\n\r\n`;
    const tail       = `\r\n--${boundary}--\r\n`;
    const body       = Buffer.concat([Buffer.from(jPart + fHead), fileData, Buffer.from(tail)]);
    const req        = http.request({
      hostname: 'localhost', port: 8000, path: '/api/analyze', method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
    }, res => {
      let raw = ''; res.on('data', d => raw += d);
      res.on('end', () => { try { resolve({ ok: res.statusCode === 200, data: JSON.parse(raw) }); } catch { resolve({ ok: false, data: null }); } });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

// ─── PRETTY PRINTERS ──────────────────────────────────────────────────────────
function printResult(data, filePath) {
  const res   = data.bias_results || data;
  const score = res.overall_bias_score;
  const level = res.overall_bias_level;
  const block = data.blockchain_block;
  const col   = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
  const verd  = { FAIR:'✅ FAIR', MODERATE:'⚠  MODERATE BIAS', HIGH_BIAS:'🟠 HIGH BIAS', SEVERE:'🚨 SEVERE BIAS' }[level] || level;

  console.log('\n' + clr('cyan', line('━')));
  console.log(bold('  📊 EQUIAI FAIRNESS AUDIT REPORT'));
  console.log(clr('cyan', line('━')));
  if (filePath) console.log(`  ${dim('File:     ')} ${path.basename(filePath)}`);
  console.log(`  ${dim('Score:    ')} ${clr(col, bold(`${score}/100`))}`);
  console.log(`  ${dim('Verdict:  ')} ${verd}`);
  console.log(`  ${dim('Rows:     ')} ${res.total_rows}`);
  console.log(`  ${dim('Target:   ')} ${res.decision_column}`);
  console.log(`  ${dim('Standard:')} ${res.jurisdiction_standard || 'Global Baseline'}`);

  if (res.column_analyses && Object.keys(res.column_analyses).length) {
    console.log('\n' + clr('cyan', '  ATTRIBUTE BREAKDOWN'));
    console.log('  ' + line('─', 50));
    Object.entries(res.column_analyses).forEach(([col2, an]) => {
      const sc2 = an.bias_score;
      const lv2 = an.bias_level;
      const cc  = lv2 === 'FAIR' ? 'green' : lv2 === 'MODERATE' ? 'yellow' : 'red';
      const bar = '█'.repeat(Math.round(sc2/5)) + '░'.repeat(20 - Math.round(sc2/5));
      console.log(`  ${col2.padEnd(14)} ${clr(cc, `${sc2}/100`)} ${dim(bar)} ${dim(lv2)}`);
      if (an.group_counts) {
        Object.entries(an.group_counts).forEach(([g, s]) => {
          const pct = (s.rate * 100).toFixed(1);
          const maj = an.disparate_impact?.majority_group === g;
          console.log(`  ${maj ? clr('cyan','  ★') : '   '} ${dim(g.padEnd(16))} ${pct}% (${s.selected}/${s.total})`);
        });
      }
    });
  }

  if (block) {
    console.log('\n' + clr('cyan', '  🔗 BLOCKCHAIN SEAL'));
    console.log(`  Block #${block.index}  Hash: ${clr('blue', block.hash.slice(0,20))}...`);
    console.log(`  Sealed: ${dim(block.timestamp)}`);
  }

  if (data.ai_explanation) {
    console.log('\n' + clr('cyan', '  🧠 AI ANALYSIS'));
    data.ai_explanation.replace(/\*\*/g,'').split('\n').slice(0,6).forEach(l => console.log(`  ${dim(l)}`));
  }

  console.log('\n' + clr('cyan', line('━')) + '\n');
}

function printHistoryTable(history) {
  if (!history.length) { console.log(dim('  No history yet. Run: equiai audit <file>\n')); return; }
  console.log('\n' + clr('cyan', line('━', 72)));
  console.log(bold('  AUDIT HISTORY'));
  console.log(clr('cyan', line('━', 72)));
  console.log(dim(`  ${'DATE'.padEnd(20)} ${'FILE'.padEnd(22)} ${'SCORE'.padEnd(8)} ${'VERDICT'.padEnd(14)} HASH`));
  console.log('  ' + line('─', 68));
  history.slice(0, 20).forEach(e => {
    const date = new Date(e.timestamp).toLocaleString().slice(0,18);
    const file = (e.filename || 'CLI Audit').slice(0, 20);
    const sc   = String(e.score || 0).padEnd(6);
    const v    = (e.verdict || '—').slice(0,12).padEnd(14);
    const h    = (e.hash || '—').slice(0,12);
    const cc   = (e.score||0) >= 80 ? 'green' : (e.score||0) >= 60 ? 'yellow' : 'red';
    console.log(`  ${dim(date.padEnd(20))} ${file.padEnd(22)} ${clr(cc, sc)} ${dim(v)} ${dim(h)}...`);
  });
  console.log(clr('cyan', line('━', 72)) + '\n');
}

// ─── PROMPT HELPER ────────────────────────────────────────────────────────────
function ask(question, def = '') {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`  ${question}${def ? dim(` [${def}]`) : ''}: `, ans => { rl.close(); resolve(ans.trim() || def); });
  });
}

// ─── COMMANDS ─────────────────────────────────────────────────────────────────

async function cmdInit() {
  banner();
  console.log(clr('cyan', '\n  🚀 EquiAI Setup Wizard\n'));
  console.log(dim('  Your data stays on this machine. Only scores + hashes are sent to the hub.\n'));

  const company_id   = await ask('Company ID (from equiai.com)', 'my_company');
  const jurisdiction = await ask('Jurisdiction (US_EEOC / EU_AI_ACT / UK_EQUALITY / INDIA / GLOBAL_MIN)', 'GLOBAL_MIN');
  const alert_email  = await ask('Alert email', 'compliance@company.com');
  const slack_hook   = await ask('Slack webhook URL (optional, press Enter to skip)', '');
  const watch_folder = await ask('Dataset folder to watch', path.join(os.homedir(), 'Documents', 'datasets'));
  const schedule     = await ask('Scan schedule (daily / weekly / monthly)', 'weekly');
  const threshold    = parseInt(await ask('Bias alert threshold (0–100, lower = stricter)', '80'), 10) || 80;

  const cfg = { company_id, jurisdiction, alert_email, slack_webhook: slack_hook || null, watch_folder, schedule, threshold, version: '2.0', created_at: new Date().toISOString() };
  saveConfig(cfg);

  try {
    await apiPost(`/policies/${company_id}`, { company_id, schedule, threshold, jurisdiction, slack_webhook: slack_hook || null, alert_email });
    console.log(clr('green', '\n  ✅ Config saved and synced to EquiAI hub.'));
  } catch {
    console.log(clr('yellow', '\n  ✅ Config saved locally (hub sync retries when daemon starts).'));
  }

  console.log(`\n  ${dim('Config file:')} ${clr('cyan', CONFIG_FILE)}`);
  console.log(`\n${bold('  Next steps:')}`);
  console.log(`  ${clr('cyan', 'equiai start')}          — Start background daemon`);
  console.log(`  ${clr('cyan', 'equiai status')}         — Check daemon status`);
  console.log(`  ${clr('cyan', 'equiai audit <file>)}  — Run manual audit\n`);
}

async function cmdStart() {
  const cfg = loadConfig();
  if (!cfg) { console.log(clr('red', '  ✗ Not initialized. Run: equiai init')); process.exit(1); }

  if (fs.existsSync(PID_FILE)) {
    const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
    try { process.kill(Number(pid), 0); console.log(clr('yellow', `  ⚠  Daemon already running (PID ${pid}). Use: equiai status`)); process.exit(0); } catch {}
  }

  console.log(clr('cyan', '\n  🚀 Starting EquiAI Daemon...\n'));
  console.log(`  ${dim('Company:    ')} ${bold(cfg.company_id)}`);
  console.log(`  ${dim('Schedule:   ')} ${cfg.schedule}`);
  console.log(`  ${dim('Watching:   ')} ${cfg.watch_folder}`);
  console.log(`  ${dim('Threshold:  ')} ${cfg.threshold}/100`);
  console.log(`  ${dim('Jurisdiction:')} ${cfg.jurisdiction}\n`);

  ensureDir();
  fs.writeFileSync(PID_FILE, String(process.pid));
  console.log(clr('green', '  ✅ EquiAI Daemon Active — running in background'));
  console.log(dim('  Run: equiai stop  to halt\n'));

  let lastRunDate = null;
  const watching  = new Set();

  const runScheduledAudit = async () => {
    if (!fs.existsSync(cfg.watch_folder)) {
      console.log(clr('yellow', `\n  ⚠  Watch folder missing: ${cfg.watch_folder}`));
      return;
    }
    const files = fs.readdirSync(cfg.watch_folder).filter(f => f.endsWith('.csv'));
    for (const file of files) {
      const fp = path.join(cfg.watch_folder, file);
      process.stdout.write(`\n  ↳ Auditing: ${clr('cyan', file)}  `);
      try {
        const { ok, data } = await uploadCsv(fp, cfg.jurisdiction, cfg);
        if (ok && data.bias_results) {
          const sc = data.bias_results.overall_bias_score;
          const vd = data.bias_results.overall_bias_level;
          const cc = sc >= 80 ? 'green' : sc >= 60 ? 'yellow' : 'red';
          console.log(clr(cc, `${sc}/100 [${vd}]`));
          appendHistory({ filename: file, score: sc, verdict: vd, hash: data.blockchain_block?.hash, jurisdiction: cfg.jurisdiction });
          // Post metadata (only) to hub
          apiPost('/audit-result', { company_id: cfg.company_id, score: sc, verdict: vd, hash: data.blockchain_block?.hash || '', timestamp: new Date().toISOString(), jurisdiction: cfg.jurisdiction, filename: file }).catch(() => {});
          // Fire Slack alert if biased
          if (sc < cfg.threshold && cfg.slack_webhook) {
            apiPost('/send-slack-alert', { webhook_url: cfg.slack_webhook, score: sc, verdict: vd, details: `File: ${file}`, blockchain_hash: data.blockchain_block?.hash }).catch(() => {});
            console.log(clr('yellow', '    📣 Slack alert fired.'));
          }
        } else {
          console.log(clr('red', 'FAILED'));
        }
      } catch (e) {
        console.log(clr('red', `ERROR: ${e.message}`));
      }
    }
  };

  const tick = async () => {
    const now      = new Date();
    const todayStr = now.toDateString();
    const day      = now.getDay();

    // Silently sync policies from hub
    try { const p = await apiGet(`/policies/${cfg.company_id}`); if (p.threshold) cfg.threshold = p.threshold; } catch {}

    const shouldRun = (
      (cfg.schedule === 'daily'   && lastRunDate !== todayStr) ||
      (cfg.schedule === 'weekly'  && day === 1 && lastRunDate !== todayStr) ||
      (cfg.schedule === 'monthly' && now.getDate() === 1 && lastRunDate !== todayStr)
    );

    if (shouldRun) {
      console.log(clr('cyan', `\n  [${now.toLocaleTimeString()}] Scheduled ${cfg.schedule} audit triggered.`));
      await runScheduledAudit();
      lastRunDate = todayStr;
    }

    // Heartbeat
    process.stdout.write(`\r  ${dim(`[${now.toLocaleTimeString()}] Daemon active ● schedule: ${cfg.schedule}`)}`);
  };

  // File watcher — detect new CSVs
  const watchInterval = setInterval(() => {
    if (!fs.existsSync(cfg.watch_folder)) return;
    try {
      fs.readdirSync(cfg.watch_folder).filter(f => f.endsWith('.csv')).forEach(async file => {
        const fp  = path.join(cfg.watch_folder, file);
        const key = `${file}-${fs.statSync(fp).mtime.getTime()}`;
        if (!watching.has(key)) {
          watching.add(key);
          if (watching.size > 1) {
            console.log(clr('cyan', `\n\n  📁 New file detected: ${file} — auto-auditing...`));
            const { ok, data } = await uploadCsv(fp, cfg.jurisdiction, cfg).catch(() => ({ ok: false }));
            if (ok) console.log(clr('green', `  ✔ Auto-audit: ${data.bias_results?.overall_bias_score}/100`));
          }
        }
      });
    } catch {}
  }, 5000);

  await tick();
  setInterval(tick, 60000);
}

async function cmdStop() {
  if (!fs.existsSync(PID_FILE)) { console.log(dim('  Daemon is not running.')); return; }
  const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
  try {
    process.kill(Number(pid), 'SIGTERM');
    fs.unlinkSync(PID_FILE);
    console.log(clr('green', `  ✅ Daemon stopped (PID ${pid}).`));
  } catch {
    fs.existsSync(PID_FILE) && fs.unlinkSync(PID_FILE);
    console.log(clr('yellow', '  ⚠  Daemon was not running. PID file cleaned.'));
  }
}

async function cmdStatus() {
  const cfg     = loadConfig();
  const history = loadHistory();
  const last    = history[0];
  let running   = false;
  if (fs.existsSync(PID_FILE)) { try { process.kill(Number(fs.readFileSync(PID_FILE,'utf8').trim()), 0); running = true; } catch {} }

  console.log('\n' + clr('cyan', line('━')));
  console.log(bold('  EQUIAI DAEMON STATUS'));
  console.log(clr('cyan', line('━')));
  console.log(`  Status:       ${running ? clr('green','● RUNNING') : clr('red','○ STOPPED')}`);
  if (cfg) {
    console.log(`  Company:      ${bold(cfg.company_id)}`);
    console.log(`  Schedule:     ${cfg.schedule}`);
    console.log(`  Jurisdiction: ${cfg.jurisdiction}`);
    console.log(`  Threshold:    ${cfg.threshold}/100`);
    console.log(`  Watch Folder: ${dim(cfg.watch_folder)}`);
  }
  console.log(`  Total Audits: ${bold(String(history.length))}`);
  if (last) {
    const cc = (last.score||0) >= 80 ? 'green' : (last.score||0) >= 60 ? 'yellow' : 'red';
    console.log(`  Last Audit:   ${new Date(last.timestamp).toLocaleString()}`);
    console.log(`  Last Score:   ${clr(cc, `${last.score}/100 [${last.verdict}]`)}`);
  }
  console.log(clr('cyan', line('━')) + '\n');
  if (!running) console.log(`  To start: ${clr('cyan', 'equiai start')}\n`);
}

async function cmdAudit(filePath, jurisdiction) {
  if (!filePath) { console.log(clr('red', '  Error: Provide a CSV path.\n  Example: node equiai.js audit ./data.csv\n')); process.exit(1); }
  const cfg     = loadConfig() || {};
  const jur     = jurisdiction || cfg.jurisdiction || 'GLOBAL_MIN';
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) { console.log(clr('red', `  Error: File not found: ${absPath}`)); process.exit(1); }

  console.log(clr('cyan', `\n  ⚙  Auditing: ${path.basename(absPath)}...`));

  try {
    const { ok, data } = await uploadCsv(absPath, jur, cfg);
    if (!ok || !data)   { console.log(clr('red', '  ✗ Audit failed. Is the backend running?\n  Start: uvicorn main:app --reload')); process.exit(1); }
    if (data.detail)    { console.log(clr('red', `  ✗ ${data.detail}`)); process.exit(1); }

    printResult(data, absPath);

    const sc = data.bias_results?.overall_bias_score;
    const vd = data.bias_results?.overall_bias_level;
    appendHistory({ filename: path.basename(absPath), score: sc, verdict: vd, hash: data.blockchain_block?.hash, jurisdiction: jur });

    if (cfg.company_id) {
      apiPost('/audit-result', { company_id: cfg.company_id, score: sc, verdict: vd, hash: data.blockchain_block?.hash || '', timestamp: new Date().toISOString(), jurisdiction: jur, filename: path.basename(absPath) }).catch(() => {});
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log(clr('red', '\n  ✗ Cannot reach backend.\n  Start it: uvicorn main:app --reload --port 8000\n'));
    } else {
      console.log(clr('red', `  ✗ ${err.message}`));
    }
    process.exit(1);
  }
}

async function cmdAuditAll(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) { console.log(clr('red', `  Error: Folder not found: ${folderPath}`)); process.exit(1); }
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.csv'));
  if (!files.length) { console.log(clr('yellow', `  No CSV files in: ${folderPath}`)); return; }

  console.log(clr('cyan', `\n  Batch-auditing ${files.length} file(s) in ${path.resolve(folderPath)}...\n`));
  const cfg = loadConfig() || {};
  for (const file of files) {
    const fp = path.join(folderPath, file);
    process.stdout.write(`  ↳ ${file.padEnd(40)}`);
    try {
      const { ok, data } = await uploadCsv(fp, null, cfg);
      if (ok && data.bias_results) {
        const sc = data.bias_results.overall_bias_score;
        const cc = sc >= 80 ? 'green' : sc >= 60 ? 'yellow' : 'red';
        console.log(clr(cc, `${sc}/100 [${data.bias_results.overall_bias_level}]`));
        appendHistory({ filename: file, score: sc, verdict: data.bias_results.overall_bias_level, hash: data.blockchain_block?.hash });
      } else {
        console.log(clr('red', 'FAILED'));
      }
    } catch { console.log(clr('red', 'CONNECTION ERROR')); }
  }
  console.log();
}

async function cmdConnectDB(args) {
  const flags = {};
  for (let i = 0; i < args.length - 1; i++) if (args[i].startsWith('--')) flags[args[i].slice(2)] = args[i+1];
  const cfg    = loadConfig() || {};
  const dbType = flags.type     || 'postgres';
  const host   = flags.host     || 'localhost';
  const db     = flags.database || 'hr_db';
  const table  = flags.table    || 'decisions';
  const attrs  = (flags['protected-attr'] || 'gender,race,age').split(',');
  const decCol = flags['decision-col'] || 'hired';
  const sched  = flags.schedule || 'daily';
  const uri    = `${dbType}://user:password@${host}/${db}`;

  console.log(clr('cyan', '\n  🗄  Connecting to database...\n'));
  console.log(`  Type:           ${dbType}\n  Host:           ${host}\n  Database:       ${db}`);
  console.log(`  Table:          ${table}\n  Protected cols: ${attrs.join(', ')}\n  Schedule:       ${sched}\n`);

  try {
    const r = await apiPost('/connect-db', { connection_uri: uri, company_id: cfg.company_id || 'cli_user', schedule: sched, protected_attrs: attrs, decision_col: decCol });
    if (r.status === 'success') {
      const m = r.metadata || {};
      console.log(clr('green', '  ✅ Database connected!\n'));
      console.log(`  Rows detected:   ${clr('cyan', String(m.rows_found || 0))}`);
      console.log(`  PII masked:      ${(m.pii_ignored || []).join(', ')}`);
      console.log(`  Audit columns:   ${(m.audit_ready_cols || []).join(', ')}`);
      console.log(`  Next scan:       ${m.next_scan || sched}\n`);
      console.log(dim(`  Security note: ${m.security_note || 'Zero raw data leaves your database.'}\n`));
    } else {
      console.log(clr('red', `  ✗ ${r.detail || 'Connection failed.'}`));
    }
  } catch (e) {
    console.log(clr('red', `  ✗ ${e.message}`));
  }
}

async function cmdHistory() {
  const cfg = loadConfig();
  if (cfg?.company_id) {
    try {
      const r = await apiGet(`/audit-history/${cfg.company_id}`);
      if (r.history?.length) { printHistoryTable(r.history); return; }
    } catch {}
  }
  printHistoryTable(loadHistory());
}

async function cmdConfig(args) {
  const cfg = loadConfig() || {};
  for (let i = 0; i < args.length - 1; i += 2) {
    const key = (args[i] || '').replace('--','');
    const val = args[i+1];
    if (key && val) {
      cfg[key] = key === 'threshold' ? Number(val) : val;
      console.log(clr('green', `  ✅ ${key} = ${val}`));
    }
  }
  saveConfig(cfg);
  console.log(clr('cyan', `\n  Config saved: ${CONFIG_FILE}\n`));
}

async function cmdDashboard() {
  const { exec } = require('child_process');
  const url  = 'http://localhost:5173';
  const open = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${open} ${url}`);
  console.log(clr('cyan', `\n  🌐 Opening: ${url}\n`));
}

async function cmdUninstall(args) {
  if (!args.includes('--clean')) { console.log(dim('  Add --clean to confirm: equiai uninstall --clean')); return; }
  await cmdStop();
  if (fs.existsSync(CONFIG_DIR)) { fs.rmSync(CONFIG_DIR, { recursive: true }); console.log(clr('green', `  ✅ Removed: ${CONFIG_DIR}`)); }
  console.log(clr('yellow', '  EquiAI CLI uninstalled. Audit history preserved in the hub.\n'));
}

// ─── ENTRYPOINT ───────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const command = args[0];
const rest    = args.slice(1);

// Parse --jurisdiction / -j flag from anywhere in args
const jurIdx = args.findIndex(a => a === '--jurisdiction' || a === '-j');
const jurVal = jurIdx !== -1 ? args[jurIdx + 1] : undefined;

(async () => {
  switch (command) {
    case 'init':        await cmdInit(); break;
    case 'start':
    case 'watch':       await cmdStart(); break;
    case 'stop':        await cmdStop(); break;
    case 'status':      await cmdStatus(); break;
    case 'audit':       await cmdAudit(rest[0], jurVal); break;
    case 'audit-all':   await cmdAuditAll(rest[0]); break;
    case 'connect-db':  await cmdConnectDB(rest); break;
    case 'history':     await cmdHistory(); break;
    case 'dashboard':   await cmdDashboard(); break;
    case 'config':      await cmdConfig(rest); break;
    case 'uninstall':   await cmdUninstall(rest); break;
    case 'report':
      console.log(dim('\n  PDF reports are auto-generated on every audit and saved locally.\n  To manually export: node equiai.js audit <file.csv>\n'));
      break;
    default: printHelp();
  }
})().catch(err => {
  console.error(clr('red', `\n  Fatal: ${err.message}\n`));
  process.exit(1);
});
