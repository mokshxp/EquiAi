import re

file_path = r"d:\Solution challenge\frontend\src\pages\Home.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
imports = """
import { getSessionId, getPlan, setPlan as savePlan } from '../utils/session';
import UpgradeModal from '../components/UpgradeModal';
import AuditCounter from '../components/AuditCounter';
import { openRazorpayCheckout } from '../utils/razorpay';
"""
content = content.replace("import FloatingLines from '../components/FloatingLines';", "import FloatingLines from '../components/FloatingLines';" + imports)

# 2. Add states to Home component
state_code = """
  const [plan, setPlanState] = useState(getPlan());
  const [auditsRemaining, setAuditsRemaining] = useState(3);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('limit_reached');

  useEffect(() => {
    fetch(`http://localhost:8000/plan/${getSessionId()}`)
      .then(r => r.json())
      .then(d => {
        setPlanState(d.plan);
        savePlan(d.plan);
        setAuditsRemaining(d.audits_remaining);
      })
      .catch(console.error);
  }, []);
"""
content = re.sub(
    r"(export default function Home\(\) \{)",
    r"\1" + state_code,
    content
)

# 3. Add to handleSampleUpload and handleFileUpload
# Replacing `formData.append('language', language);` to include session_id
content = content.replace("formData.append('language', language);", "formData.append('language', language);\n      formData.append('session_id', getSessionId());")

# 4. Handle 429 and 403
analyze_res_code = """
      const data = await response.json();
      if (response.status === 429) {
        setUpgradeReason('limit_reached');
        setShowUpgradeModal(true);
        return;
      }
      if (response.status === 403) {
        setUpgradeReason('jurisdiction_locked');
        setShowUpgradeModal(true);
        return;
      }
      if (response.ok) {"""
content = content.replace("const data = await response.json();\n      if (response.ok) {", analyze_res_code)

# 5. Handle update plan in analyze response
plan_update_code = """
        setBlockchainBlock(data?.blockchain_block);
        if (data.plan) { setPlanState(data.plan); savePlan(data.plan); }
        if (data.audits_remaining !== undefined) setAuditsRemaining(data.audits_remaining);
"""
content = content.replace("setBlockchainBlock(data?.blockchain_block);", plan_update_code)

# 6. downloadPDF block
pdf_check_code = """
  const downloadPDF = async () => {
    if (plan === 'free') {
      setUpgradeReason('pdf_locked');
      setShowUpgradeModal(true);
      return;
    }
"""
content = content.replace("const downloadPDF = async () => {", pdf_check_code)

# 7. Add modals just below Navbar
modals = """
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
"""
content = content.replace("<Navbar/>", "<Navbar/>" + modals)

# 8. Add AuditCounter
audit_counter = """
            <motion.div variants={fadeUp} style={{textAlign:'center',marginBottom:'2.5rem'}}>
              <Pill>Interactive Audit</Pill>
              <h2 style={{fontSize:'2rem',marginBottom:8}}>See Fairness in Real-Time</h2>
              <p style={{color:'#6b7280',fontSize:14, marginBottom: 16}}>Load our sample hiring dataset and watch the engine score it instantly.</p>
              <div style={{display:'flex', justifyContent:'center'}}>
                <AuditCounter 
                  plan={plan} 
                  remaining={auditsRemaining} 
                  onUpgradeClick={() => {
                    setUpgradeReason('limit_reached');
                    setShowUpgradeModal(true);
                  }}
                />
              </div>
            </motion.div>
"""
content = re.sub(
    r"<motion\.div variants=\{fadeUp\} style=\{\{textAlign:'center',marginBottom:'2\.5rem'\}\}>\s*<Pill>Interactive Audit</Pill>\s*<h2[^>]*>See Fairness in Real-Time</h2>\s*<p[^>]*>Load our sample hiring dataset and watch the engine score it instantly\.</p>\s*</motion\.div>",
    audit_counter,
    content
)

# 9. Update Pricing section
old_pricing = r"\{\[\s*\{name:'Free'.*?sel:true\},\s*\]\.map\(\(plan,i\)=>\("

new_pricing = """{[
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
                action: () => scrollTo('demo')
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
            ].map((plan,i)=>("""

content = re.sub(old_pricing, new_pricing, content, flags=re.DOTALL)

# Also fix the features rendering since it now has {text, ok}
old_feature_render = r"\{plan\.features\.map\(f=>\(\s*<div key=\{f\} style=\{\{display:'flex',alignItems:'center',gap:9,fontSize:13\}\}>\s*<span style=\{\{color:plan\.tagColor,fontWeight:700,flexShrink:0\}\}>✓</span>\s*<span style=\{\{color:'var\(--text-primary\)'\}\}>\{f\}</span>\s*</div>\s*\)\)\}"
new_feature_render = """{plan.features.map(f=>(
                    <div key={f.text} style={{display:'flex',alignItems:'center',gap:9,fontSize:13, opacity: f.ok ? 1 : 0.5}}>
                      <span style={{color:f.ok ? plan.tagColor : '#9ca3af',fontWeight:700,flexShrink:0}}>{f.ok ? '✓' : '✗'}</span>
                      <span style={{color:'var(--text-primary)', textDecoration: f.ok ? 'none' : 'line-through'}}>{f.text}</span>
                    </div>
                  ))}"""
content = re.sub(old_feature_render, new_feature_render, content)

# And fix the CTA button to use plan.action
old_button = r"<button className=\"btn-glow\" style=\{\{width:'100%',padding:'11px',background:plan\.ctaBg,color:plan\.ctaColor,border:`1\.5px solid \$\{plan\.ctaBorder\}`"
new_button = r"<button onClick={plan.action} className=\"btn-glow\" style={{width:'100%',padding:'11px',background:plan.ctaBg,color:plan.ctaColor,border:`1.5px solid ${plan.ctaBorder}`"
content = re.sub(old_button, new_button, content)

# Remove "Need enterprise features" note under pricing
content = content.replace("</div>\n        </div>\n      </section>", """</div>
          <div style={{textAlign:'center', marginTop: '3rem', fontSize: 14, color: 'var(--text-muted)'}}>
            Need enterprise features? Email us: hello@equiai.com
          </div>
        </div>
      </section>""")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patch complete.")
