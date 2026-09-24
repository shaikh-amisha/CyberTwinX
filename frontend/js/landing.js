const stateData = {
  normal: { label:'NORMAL', risk:12, confidence:'98.4%', findings:['No anomalous authentication','Expected process lineage','Integrity checks passing'], tone:'green' },
  suspicious: { label:'SUSPICIOUS', risk:61, confidence:'91.7%', findings:['Impossible-travel sign-in','New privileged shell','Unusual outbound connection'], tone:'amber' },
  critical: { label:'COMPROMISED', risk:88, confidence:'96.1%', findings:['Credential replay detected','Persistence mechanism found','C2 beacon confirmed'], tone:'red' },
  contained: { label:'CONTAINED', risk:22, confidence:'94.8%', findings:['Endpoint network isolated','Session revoked','Evidence preserved'], tone:'green' }
};

const featureCards = [
  { icon:'◈', title:'State Twin', body:'Live security state, not static alerts.', href:'#twin' },
  { icon:'⌁', title:'Incident Timeline', body:'Replay the incident as a connected sequence.', href:'#twin' },
  { icon:'⌘', title:'Attack Path', body:'Trace how activity moved through the system.', href:'#attack-path' },
  { icon:'▶', title:'What-If Simulation', body:'Model a response before you commit to it.', href:'#attack-path' },
  { icon:'▣', title:'Evidence Register', body:'Every finding, backed and verified.', href:'#evidence' },
  { icon:'✦', title:'AI Investigation', body:'Ask the model. Keep the receipts.', href:'#investigation' }
];

const productPages = [
  { id:'overview', nav:'overview', eyebrow:'OVERVIEW / ENDPOINT TWIN', title:'lx-prod-07',
    body:`<div class="endpoint-grid">
      <div class="endpoint"><span class="eyebrow">SECURITY STATE</span><strong class="amber">SUSPICIOUS</strong></div>
      <div class="endpoint"><span class="eyebrow">TELEMETRY</span><strong>14,208</strong></div>
      <div class="endpoint"><span class="eyebrow">FINDINGS</span><strong class="amber">07</strong></div>
    </div>` },
  { id:'investigation', nav:'investigation', eyebrow:'INVESTIGATION / EVIDENCE', title:'EV-8821 — EV-8824',
    body:`<div class="mini"><span class="eyebrow">EVENT STREAM</span><p>09:31:04 · AUTHENTICATION ANOMALY</p><p>09:32:18 · PRIVILEGED ACTIVITY</p><p>09:33:42 · OUTBOUND CONNECTION</p></div>` },
  { id:'attackpath', nav:'attackpath', eyebrow:'ATTACK PATH / PATH-04A', title:'6 nodes traced',
    body:`<div class="mini"><span class="eyebrow">PATH</span><p class="cyan">SRC → AUTH → SESSION → PRIV ESC → PROCESS → ENDPOINT</p><p>Impact: Elevated to COMPROMISED at 09:34:06</p></div>` },
  { id:'whatif', nav:'whatif', eyebrow:'WHAT-IF / COUNTERFACTUAL', title:'Isolate Endpoint',
    body:`<div class="mini"><span class="eyebrow">SIMULATED RESULT</span><p>SUSPICIOUS → CONTAINED</p><p>Risk 61 → 18 (−43)</p></div>` },
  { id:'integrity', nav:'integrity', eyebrow:'INTEGRITY / CHECKPOINT', title:'CP-00042',
    body:`<div class="mini"><span class="eyebrow">CHAIN</span><p>EVIDENCE → HASH → CHECKPOINT → PREVIOUS HASH → VERIFICATION</p><p class="green">● VERIFIED · matches CP-00041</p></div>` }
];

const tickerEvents = [
  ['09:31:04', 'AUTHENTICATION ANOMALY · lx-prod-07'],
  ['09:32:18', 'PRIVILEGED ACTIVITY DETECTED · www-data'],
  ['09:33:42', 'OUTBOUND CONNECTION · untrusted ASN'],
  ['09:34:06', 'PERSISTENCE MECHANISM · cron.d/.cache'],
  ['09:36:22', 'CHECKPOINT SEALED · CP-00042'],
  ['09:38:11', 'AI INVESTIGATION QUERY · analyst session'],
  ['09:41:03', 'EVIDENCE VERIFIED · EV-8821'],
  ['09:44:57', 'RISK SCORE UPDATED · 61 / 100']
];

function setupTicker() {
  const track = document.getElementById('ticker-track');
  const renderSet = () => tickerEvents.map(([t, e]) =>
    `<span class="ticker-item"><i></i><time>${t}</time>${e}</span>`
  ).join('');
  track.innerHTML = renderSet() + renderSet();
}

function animateNumber(el, target, duration = 850) {
  const from = Number(el.dataset.current || 0);
  const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const value = Math.round(from + (target - from) * eased);
    el.textContent = value.toLocaleString();
    el.dataset.current = value;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function setupCounter(el) {
  const target = Number(el.dataset.count);
  el.dataset.current = '0';
  const obs = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    animateNumber(el, target);
    obs.disconnect();
  }, { threshold: .35 });
  obs.observe(el);
}

function setupMarquee() {
  const track = document.getElementById('marquee-track');
  const renderSet = () => featureCards.map(c =>
    `<a class="feature-card" href="${c.href}"><div class="feature-icon">${c.icon}</div><h3>${c.title}</h3><p>${c.body}</p><span>Learn More →</span></a>`
  ).join('');
  track.innerHTML = renderSet() + renderSet();
}

function setupStateTwin() {
  const buttons = document.querySelectorAll('[data-state]');
  const label = document.querySelector('[data-state-label]');
  const heading = document.querySelector('[data-state-heading]');
  const risk = document.querySelector('[data-state-risk]');
  const confidence = document.querySelector('[data-state-confidence]');
  const findings = document.querySelector('[data-state-findings]');
  buttons.forEach(btn => btn.addEventListener('click', () => {
    const d = stateData[btn.dataset.state];
    buttons.forEach(b => b.classList.toggle('selected', b === btn));
    label.textContent = d.label;
    label.className = `risk-chip ${d.tone}`;
    heading.textContent = d.label;
    animateNumber(risk, d.risk, 650);
    confidence.textContent = d.confidence;
    findings.innerHTML = d.findings.map((f,i) => `<div><span class="cyan">0${i+1}</span> ${f}</div>`).join('');
  }));
  document.querySelector('[data-state="suspicious"]').click();
}

function setupAttackPath() {
  const nodes = [['EXTERNAL SOURCE','Initial access','09:31:04'],['AUTHENTICATION','Identity replay','09:31:17'],['USER SESSION','Context shift','09:32:18'],['PRIVILEGE ESC.','Elevation','09:32:21'],['SUSPICIOUS PROCESS','Execution','09:32:25'],['COMPROMISED ENDPOINT','Impact','09:34:06']];
  const chain = document.querySelector('[data-attack-chain]');
  const label = document.querySelector('[data-attack-label]');
  const event = document.querySelector('[data-attack-event]');
  const time = document.querySelector('[data-attack-time]');
  const impact = document.querySelector('[data-attack-impact]');
  nodes.forEach((n, i) => {
    const btn = document.createElement('button');
    btn.className = i === 4 ? 'active' : '';
    btn.innerHTML = `<small>0${i+1}</small><b>${n[0]}</b><small>${n[1]}</small>`;
    btn.addEventListener('click', () => {
      chain.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      label.textContent = n[0];
      event.textContent = i === 4 ? 'Process execution under anomalous parent' : 'Correlated event at attack path node';
      time.textContent = `${n[2]} UTC`;
      impact.textContent = i > 3 ? 'Elevated to COMPROMISED' : 'Raised confidence in SUSPICIOUS';
    });
    chain.appendChild(btn);
    if (i < nodes.length - 1) { const edge = document.createElement('div'); edge.className = 'attack-edge'; chain.appendChild(edge); }
  });
}

function setupWhatIf() {
  const results = [
    ['CONTAINED', 18, '−43', 'Network access severed while volatile evidence remains available.'],
    ['SUSPICIOUS', 37, '−24', 'Known C2 route blocked. Endpoint remains under observation.'],
    ['CONTAINED', 26, '−35', 'Identity sessions revoked. Host telemetry continues uninterrupted.'],
    ['SUSPICIOUS', 45, '−16', 'Active process terminated. Persistence investigation is still required.'],
    ['SUSPICIOUS', 58, '−3', 'Memory and disk artifacts queued. No response action taken.']
  ];
  const select = document.querySelector('#response-action');
  const button = document.querySelector('#simulate');
  const result = document.querySelector('#simulation-result');
  button.addEventListener('click', () => {
    const [state, risk, delta, detail] = results[select.selectedIndex];
    result.innerHTML = `<span class="eyebrow">SIMULATED RESULT</span><div class="result-card"><h3 class="${state === 'CONTAINED' ? 'green' : 'amber'}">● ${state}</h3><div class="result-risk"><span data-count="${risk}">${risk}</span><small>/100 · ${delta} RISK</small></div><p>${detail}</p><button class="button secondary" id="reset-simulation">Reset simulation</button></div>`;
    const counter = result.querySelector('[data-count]');
    counter.dataset.current = '0';
    animateNumber(counter, risk, 700);
    result.querySelector('#reset-simulation').addEventListener('click', () => {
      result.innerHTML = '<span class="eyebrow">SIMULATED RESULT</span><div class="empty">→ <span>Select an action<br />to model the outcome</span></div>';
    });
  });
}

function setupProductSlideshow() {
  const slidesEl = document.getElementById('product-slides');
  const asideEl = document.getElementById('product-aside');
  const dots = document.querySelector('.product-controls [data-dots]');
  const pauseBtn = document.querySelector('.product-controls [data-pause]');
  let index = 0, paused = false;

  slidesEl.innerHTML = productPages.map((p, i) =>
    `<div class="slide${i === 0 ? ' active' : ''}"><span class="eyebrow slide-eyebrow cyan">${p.eyebrow}</span><h3>${p.title}</h3>${p.body}</div>`
  ).join('');

  productPages.forEach((p, i) => {
    const dot = document.createElement('button');
    dot.setAttribute('aria-label', `Screen ${i + 1}`);
    dot.addEventListener('click', () => { index = i; draw(); });
    dots.appendChild(dot);
  });

  const draw = () => {
    slidesEl.querySelectorAll('.slide').forEach((s, i) => s.classList.toggle('active', i === index));
    dots.querySelectorAll('button').forEach((d, i) => d.classList.toggle('selected', i === index));
    asideEl.querySelectorAll('a[data-nav]').forEach(a => a.classList.toggle('selected', a.dataset.nav === productPages[index].nav));
  };

  pauseBtn.addEventListener('click', () => { paused = !paused; pauseBtn.textContent = paused ? '▶' : 'Ⅱ'; });
  document.querySelector('.product').addEventListener('mouseenter', () => { paused = true; });
  document.querySelector('.product').addEventListener('mouseleave', () => { paused = false; });
  window.setInterval(() => { if (!paused) { index = (index + 1) % productPages.length; draw(); } }, 6000);
  draw();
}

const bulletinItems = [
  '⌁ Actively exploited: a critical F5 BIG-IP APM flaw allows unauthenticated remote code execution. <a href="#attack-path">See how CyberTwinX traces exploitation paths →</a>',
  '⌁ New: Counterfactual analysis now models multi-step responses. <a href="#attack-path">See What-If →</a>',
  '⌁ Reported this week: a Chrome–Windows zero-day chain used to escape browser sandboxes. <a href="#evidence">See evidence correlation →</a>'
];

function setupAnnouncement() {
  const bar = document.getElementById('announce');
  const textEl = document.getElementById('announce-text');
  const closeBtn = document.getElementById('announce-close');
  if (!bar) return;
  try {
    if (localStorage.getItem('cx-announce-dismissed') === '1') { bar.classList.add('hidden'); return; }
  } catch (e) { /* storage unavailable, keep banner visible */ }

  let index = 0;
  textEl.innerHTML = bulletinItems[index];
  window.setInterval(() => {
    textEl.classList.add('fading');
    window.setTimeout(() => {
      index = (index + 1) % bulletinItems.length;
      textEl.innerHTML = bulletinItems[index];
      textEl.classList.remove('fading');
    }, 400);
  }, 7000);

  closeBtn.addEventListener('click', () => {
    bar.classList.add('hidden');
    try { localStorage.setItem('cx-announce-dismissed', '1'); } catch (e) { /* ignore */ }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-count]').forEach(setupCounter);
  document.querySelectorAll('.reveal').forEach(el => {
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) { el.classList.add('visible'); obs.disconnect(); } }, { rootMargin: '0px 0px -12% 0px' });
    obs.observe(el);
  });
  setupMarquee();
  setupTicker();
  setupAnnouncement();
  setupStateTwin();
  setupAttackPath();
  setupWhatIf();
  setupProductSlideshow();
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => document.querySelector('.nav-links').classList.remove('open')));
  document.querySelector('.menu-toggle').addEventListener('click', () => document.querySelector('.nav-links').classList.toggle('open'));
});