/* ─────────────────────────────────────────────
   StuFin – app.js  (MySQL / Node.js version)
   All data comes from the Express REST API.
───────────────────────────────────────────── */
'use strict';

// ─── API HELPER ──────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch('/api' + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

// ─── STATE ────────────────────────────────────────────────────────────────────
let state = {
  user:         null,
  transactions: [],
  categories:   [],
  budgets:      [],
  goals:        [],
  reminders:    [],
};

// ─── AUTH ────────────────────────────────────────────────────────────────────
function showRegister() {
  document.getElementById('loginForm').style.display    = 'none';
  document.getElementById('registerForm').style.display = 'block';
}
function showLogin() {
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display    = 'block';
}

async function handleRegister() {
  const name   = document.getElementById('regName').value.trim();
  const email  = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const budget = document.getElementById('regBudget').value;
  const err    = document.getElementById('regError');
  try {
    const data = await api('POST', '/auth/register', { name, email, password, budget });
    err.textContent = '';
    await loadAllData(data.user);
    launchApp(data.user);
  } catch (e) { err.textContent = e.message; }
}

async function handleLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const err      = document.getElementById('loginError');
  try {
    const data = await api('POST', '/auth/login', { email, password });
    err.textContent = '';
    await loadAllData(data.user);
    launchApp(data.user);
  } catch (e) { err.textContent = e.message; }
}

async function handleLogout() {
  await api('POST', '/auth/logout');
  state = { user: null, transactions: [], categories: [], budgets: [], goals: [], reminders: [] };
  document.getElementById('appShell').style.display    = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  showLogin();
}

// ─── LOAD ALL DATA FROM API ───────────────────────────────────────────────────
async function loadAllData(user) {
  state.user = user;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [txns, cats, budgets, goals, reminders] = await Promise.all([
    api('GET', '/transactions'),
    api('GET', '/categories'),
    api('GET', `/budgets?month=${thisMonth}`),
    api('GET', '/goals'),
    api('GET', '/reminders'),
  ]);
  state.transactions = txns;
  state.categories   = cats;
  state.budgets      = budgets;
  state.goals        = goals;
  state.reminders    = reminders;
}

// ─── APP LAUNCH ──────────────────────────────────────────────────────────────
function launchApp(user) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display    = 'flex';

  document.getElementById('sbAvatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('sbName').textContent   = user.name.split(' ')[0];

  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dashGreeting').textContent = `${greet}, ${user.name.split(' ')[0]} 👋`;
  document.getElementById('dashMonth').textContent    = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  populateCategoryFilters();
  renderAll();
  navigate('dashboard');
}

function renderAll() {
  updateKPIs();
  renderPulseBar();
  renderCharts();
  renderRecentTransactions();
  renderTransactions();
  renderBudgets();
  renderGoals();
  renderReminders();
  renderAdminPanel();
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`.sb-link[data-page="${page}"]`)?.classList.add('active');
  if (page === 'reports') renderTrendChart();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.body.classList.toggle('collapsed');
}

// ─── KPIs ────────────────────────────────────────────────────────────────────
function updateKPIs() {
  const txns   = state.transactions.filter(t => isThisMonth(t.txn_date));
  const income  = txns.filter(t => t.type === 'income').reduce((s, t)  => s + +t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + +t.amount, 0);
  const balance = income - expense;
  const budgetLeft = (state.user?.budget || 0) - expense;

  document.getElementById('kpiIncome').textContent     = fmt(income);
  document.getElementById('kpiExpense').textContent    = fmt(expense);
  document.getElementById('kpiBalance').textContent    = fmt(balance);
  document.getElementById('kpiBudgetLeft').textContent = fmt(budgetLeft);
}

// ─── PULSE BAR ───────────────────────────────────────────────────────────────
function renderPulseBar() {
  const txns    = state.transactions.filter(t => isThisMonth(t.txn_date) && t.type === 'expense');
  const expense = txns.reduce((s, t) => s + +t.amount, 0);
  const budget  = state.user?.budget || 5000;
  const pct     = budget > 0 ? Math.min(100, Math.round((expense / budget) * 100)) : 0;
  const left    = 100 - pct;

  document.getElementById('pulsePercent').textContent = left + '% budget remaining';
  const fill = document.getElementById('pulseFill');
  fill.style.width = pct + '%';
  fill.className = 'pulse-fill' + (pct >= 90 ? ' danger' : pct >= 70 ? ' warn' : '');

  const hint = pct === 0 ? 'No expenses recorded yet.'
    : pct < 50 ? `₹${fmt2(budget - expense)} remaining — you're doing great!`
    : pct < 75 ? `₹${fmt2(budget - expense)} remaining — watch your spending.`
    : pct < 90 ? `Only ₹${fmt2(budget - expense)} left — slow down!`
    : `Budget almost exhausted! ₹${fmt2(budget - expense)} left.`;
  document.getElementById('pulseHint').textContent = hint;
}

// ─── CHARTS ──────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#2563EB','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#F97316','#84CC16','#EC4899','#6366F1'];

function renderCharts() {
  const period = document.getElementById('chartPeriod')?.value || 'month';
  const txns   = state.transactions.filter(t =>
    t.type === 'expense' && (period === 'all' || isThisMonth(t.txn_date))
  );
  const grouped = {};
  txns.forEach(t => {
    const cat = t.category_name || 'Other';
    grouped[cat] = (grouped[cat] || 0) + +t.amount;
  });
  drawBarChart('catChart', Object.keys(grouped), Object.values(grouped));
  drawPieChart('pieChart', state.transactions.filter(t => isThisMonth(t.txn_date)));
}

function drawBarChart(id, labels, values) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || canvas.width;
  const H = canvas.height;
  canvas.width = W;
  ctx.clearRect(0, 0, W, H);

  if (!values.length) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No expense data yet', W / 2, H / 2);
    return;
  }

  const pad = { top: 20, right: 20, bottom: 50, left: 54 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const maxVal = Math.max(...values);
  const barW   = Math.min(42, (chartW / values.length) * 0.65);
  const spacing = chartW / values.length;

  ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH - (i / 4) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#94A3B8'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('₹' + fmt2((maxVal * i) / 4), pad.left - 6, y + 4);
  }

  values.forEach((v, i) => {
    const bH  = maxVal > 0 ? (v / maxVal) * chartH : 0;
    const x   = pad.left + i * spacing + (spacing - barW) / 2;
    const y   = pad.top + chartH - bH;
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const grad = ctx.createLinearGradient(0, y, 0, y + bH);
    grad.addColorStop(0, color); grad.addColorStop(1, color + '88');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(x, y, barW, bH, [4, 4, 0, 0]); ctx.fill();
    ctx.fillStyle = '#64748B'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    const lbl = labels[i].length > 9 ? labels[i].slice(0, 8) + '…' : labels[i];
    ctx.fillText(lbl, x + barW / 2, H - pad.bottom + 16);
    ctx.fillStyle = color; ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('₹' + fmt2(v), x + barW / 2, y - 4);
  });
}

function drawPieChart(id, txns) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  const size = Math.min(canvas.offsetWidth || canvas.width, canvas.height);
  canvas.width = size; canvas.height = size;
  ctx.clearRect(0, 0, size, size);

  const income  = txns.filter(t => t.type === 'income').reduce((s, t)  => s + +t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + +t.amount, 0);
  const total   = income + expense;
  const legend  = document.getElementById('pieLegend');

  if (total === 0) {
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath(); ctx.arc(size/2, size/2, size/2 - 10, 0, Math.PI*2); ctx.fill();
    if (legend) legend.innerHTML = '<div class="pie-legend-item"><span style="color:#94A3B8;font-size:.82rem">No data yet</span></div>';
    return;
  }

  const slices = [{ label: 'Income', value: income, color: '#10B981' }, { label: 'Expense', value: expense, color: '#EF4444' }];
  let startAngle = -Math.PI / 2;
  const cx = size/2, cy = size/2, r = size/2 - 12, innerR = r * 0.55;

  slices.forEach(s => {
    if (!s.value) return;
    const sweep = (s.value / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, startAngle, startAngle + sweep); ctx.closePath();
    ctx.fillStyle = s.color; ctx.fill();
    startAngle += sweep;
  });
  ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI*2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.fillStyle = '#1E293B'; ctx.font = `bold 13px Plus Jakarta Sans, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('₹' + fmt2(total), cx, cy);

  if (legend) {
    legend.innerHTML = slices.map(s =>
      `<div class="pie-legend-item"><span class="pie-legend-dot" style="background:${s.color}"></span>
       <span>${s.label}: <strong>₹${fmt2(s.value)}</strong></span></div>`
    ).join('');
  }
}

async function renderTrendChart() {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;
  try {
    const data = await api('GET', '/transactions/summary/monthly');
    const months = data.map(r => r.month.slice(5));
    const incomeData  = data.map(r => +r.income);
    const expenseData = data.map(r => +r.expense);

    const W = canvas.offsetWidth || 700;
    const H = canvas.height;
    canvas.width = W;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const pad = { top: 24, right: 24, bottom: 44, left: 60 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top  - pad.bottom;
    const maxVal = Math.max(...incomeData, ...expenseData, 1);
    const step   = chartW / Math.max(data.length - 1, 1);

    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#94A3B8'; ctx.font = '11px Inter'; ctx.textAlign = 'right';
      ctx.fillText('₹' + fmt2(maxVal * (1 - i/4)), pad.left - 6, y + 4);
    }

    const drawLine = (dArr, color) => {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      dArr.forEach((v, i) => {
        const x = pad.left + i * step;
        const y = pad.top + chartH - (v / maxVal) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      dArr.forEach((v, i) => {
        const x = pad.left + i * step;
        const y = pad.top + chartH - (v / maxVal) * chartH;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2);
        ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
      });
    };

    drawLine(incomeData, '#10B981');
    drawLine(expenseData, '#EF4444');

    months.forEach((m, i) => {
      ctx.fillStyle = '#64748B'; ctx.font = '12px Inter'; ctx.textAlign = 'center';
      ctx.fillText(m, pad.left + i * step, H - 8);
    });

    ctx.fillStyle = '#10B981'; ctx.fillRect(W-140, 10, 12, 12);
    ctx.fillStyle = '#1E293B'; ctx.font = '12px Inter'; ctx.textAlign = 'left'; ctx.fillText('Income', W-122, 21);
    ctx.fillStyle = '#EF4444'; ctx.fillRect(W-70, 10, 12, 12);
    ctx.fillStyle = '#1E293B'; ctx.fillText('Expense', W-52, 21);
  } catch (e) { console.error(e); }
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
function renderRecentTransactions() {
  const txns = [...state.transactions]
    .sort((a,b) => new Date(b.txn_date) - new Date(a.txn_date))
    .slice(0, 5);
  document.getElementById('recentTxns').innerHTML = txnsHTML(txns) || emptyState('💸','No transactions yet.');
}

function renderTransactions() {
  const search = (document.getElementById('txnSearch')?.value || '').toLowerCase();
  const cat    = document.getElementById('txnFilterCat')?.value  || '';
  const type   = document.getElementById('txnFilterType')?.value || '';

  let txns = [...state.transactions]
    .filter(t => !cat  || t.category_id === cat)
    .filter(t => !type || t.type === type)
    .filter(t => !search || (t.note || '').toLowerCase().includes(search) || (t.category_name || '').toLowerCase().includes(search))
    .sort((a,b) => new Date(b.txn_date) - new Date(a.txn_date));

  document.getElementById('allTxnsList').innerHTML = txnsHTML(txns) || emptyState('🔍','No transactions match your filters.');
}

function txnsHTML(txns) {
  if (!txns.length) return '';
  return txns.map(t => {
    const sign = t.type === 'income' ? '+' : '–';
    return `
      <div class="txn-item">
        <div class="txn-icon" style="background:${t.type==='income'?'var(--green-lt)':'var(--red-lt)'}">
          ${t.emoji || '📦'}
        </div>
        <div class="txn-info">
          <div class="txn-name">${t.note || t.category_name}</div>
          <div class="txn-meta">${t.category_name} · ${formatDate(t.txn_date)}</div>
        </div>
        <div class="txn-amount ${t.type}">${sign}₹${fmt2(t.amount)}</div>
        <button class="btn-danger txn-del" onclick="deleteTxn('${t.id}')">✕</button>
      </div>`;
  }).join('');
}

async function deleteTxn(id) {
  if (!confirm('Delete this transaction?')) return;
  try {
    await api('DELETE', `/transactions/${id}`);
    state.transactions = state.transactions.filter(t => t.id !== id);
    renderAll();
    toast('Transaction deleted');
  } catch (e) { toast('Error: ' + e.message); }
}

function populateCategoryFilters() {
  const el = document.getElementById('txnFilterCat');
  if (!el) return;
  el.innerHTML = '<option value="">All Categories</option>' +
    state.categories.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('');
}

// ─── ADD TRANSACTION MODAL ────────────────────────────────────────────────────
function openAddTxn() {
  const expCats = state.categories.filter(c => c.type === 'expense').map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('');
  const incCats = state.categories.filter(c => c.type === 'income').map(c  => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('');
  window._txnCatOpts = { expense: expCats, income: incCats };

  showModal(`
    <div class="modal-title">Add Transaction</div>
    <div class="modal-field"><label>Type</label>
      <select id="mTxnType" onchange="updateCatOptions()">
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
    </div>
    <div class="modal-field"><label>Category</label><select id="mTxnCat">${expCats}</select></div>
    <div class="modal-field"><label>Amount (₹)</label><input type="number" id="mTxnAmt" placeholder="0.00" min="0" step="0.01" /></div>
    <div class="modal-field"><label>Date</label><input type="date" id="mTxnDate" value="${todayStr()}" /></div>
    <div class="modal-field"><label>Note (optional)</label><input type="text" id="mTxnNote" placeholder="e.g. Mess fee…" /></div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="saveTxn()">Save</button>
    </div>
  `);
}

function updateCatOptions() {
  const type = document.getElementById('mTxnType')?.value;
  const el   = document.getElementById('mTxnCat');
  if (el && window._txnCatOpts) el.innerHTML = window._txnCatOpts[type] || '';
}

async function saveTxn() {
  const type        = document.getElementById('mTxnType').value;
  const category_id = document.getElementById('mTxnCat').value;
  const amount      = parseFloat(document.getElementById('mTxnAmt').value);
  const txn_date    = document.getElementById('mTxnDate').value;
  const note        = document.getElementById('mTxnNote').value.trim();

  if (!amount || amount <= 0) { alert('Enter a valid amount.'); return; }
  if (!txn_date)              { alert('Select a date.');        return; }

  try {
    const newTxn = await api('POST', '/transactions', { type, category_id, amount, txn_date, note });
    state.transactions.unshift(newTxn);
    closeModalDirect();
    populateCategoryFilters();
    renderAll();
    toast(`${type === 'income' ? 'Income' : 'Expense'} of ₹${fmt2(amount)} added`);
  } catch (e) { alert('Error: ' + e.message); }
}

// ─── BUDGETS ─────────────────────────────────────────────────────────────────
function renderBudgets() {
  const txns = state.transactions.filter(t => t.type === 'expense' && isThisMonth(t.txn_date));

  const rows = state.budgets.map(b => {
    const spent = txns.filter(t => t.category_id === b.category_id).reduce((s,t) => s + +t.amount, 0);
    const pct   = Math.min(100, Math.round((spent / b.budget) * 100));
    const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#10B981';
    return `
      <div class="budget-row">
        <div class="budget-row-head">
          <div class="budget-cat-name">${b.emoji} ${b.category_name}</div>
          <div class="budget-amounts">Spent: <span>₹${fmt2(spent)}</span> / Budget: <span>₹${fmt2(b.budget)}</span></div>
        </div>
        <div class="budget-bar"><div class="budget-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:6px">
          <small style="color:var(--text-3);font-size:.78rem">${pct}% used</small>
          <button class="btn-danger" style="font-size:.76rem;padding:3px 8px" onclick="deleteBudget('${b.id}')">Remove</button>
        </div>
      </div>`;
  }).join('');

  document.getElementById('budgetList').innerHTML = rows || emptyState('📊','No budgets set.');
}

function openAddBudget() {
  const cats = state.categories.filter(c => c.type === 'expense');
  showModal(`
    <div class="modal-title">Set Category Budget</div>
    <div class="modal-field"><label>Category</label>
      <select id="mBudCat">${cats.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('')}</select>
    </div>
    <div class="modal-field"><label>Monthly Limit (₹)</label><input type="number" id="mBudAmt" placeholder="1000" min="1" /></div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="saveBudget()">Save</button>
    </div>
  `);
}

async function saveBudget() {
  const category_id = document.getElementById('mBudCat').value;
  const amount      = parseFloat(document.getElementById('mBudAmt').value);
  if (!amount || amount <= 0) { alert('Enter a valid amount.'); return; }
  try {
    await api('POST', '/budgets', { category_id, amount });
    // Refresh budgets from server
    const thisMonth = new Date().toISOString().slice(0, 7);
    state.budgets = await api('GET', `/budgets?month=${thisMonth}`);
    closeModalDirect();
    renderBudgets();
    toast('Budget saved');
  } catch (e) { alert('Error: ' + e.message); }
}

async function deleteBudget(id) {
  try {
    await api('DELETE', `/budgets/${id}`);
    state.budgets = state.budgets.filter(b => b.id !== id);
    renderBudgets();
    toast('Budget removed');
  } catch (e) { toast('Error: ' + e.message); }
}

// ─── SAVINGS GOALS ────────────────────────────────────────────────────────────
function renderGoals() {
  const cards = state.goals.map(g => {
    const pct  = Math.min(100, Math.round((+g.saved / +g.target) * 100));
    const left = +g.target - +g.saved;
    return `
      <div class="goal-card">
        <div class="goal-emoji">${g.emoji}</div>
        <div class="goal-name">${g.name}</div>
        <div class="goal-amounts">₹${fmt2(g.saved)} of ₹${fmt2(g.target)} · ₹${fmt2(left)} to go</div>
        <div class="goal-bar"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
        <div class="goal-pct">${pct}% reached${g.deadline ? ' · Due ' + formatDate(g.deadline) : ''}</div>
        <div class="goal-footer">
          <button class="btn-primary goal-add-btn" onclick="addToGoal('${g.id}')">+ Add Savings</button>
          <button class="btn-danger" onclick="deleteGoal('${g.id}')">Delete</button>
        </div>
      </div>`;
  }).join('');
  document.getElementById('goalsList').innerHTML = cards || emptyState('⭐','No savings goals yet.');
}

function openAddGoal() {
  showModal(`
    <div class="modal-title">New Savings Goal</div>
    <div class="modal-field"><label>Goal Name</label><input type="text" id="mGName" placeholder="New Laptop, Trip…" /></div>
    <div class="modal-field"><label>Emoji</label><input type="text" id="mGEmoji" value="🎯" maxlength="2" style="width:70px" /></div>
    <div class="modal-field"><label>Target Amount (₹)</label><input type="number" id="mGTarget" placeholder="10000" /></div>
    <div class="modal-field"><label>Already Saved (₹)</label><input type="number" id="mGSaved" placeholder="0" /></div>
    <div class="modal-field"><label>Deadline (optional)</label><input type="date" id="mGDead" /></div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="saveGoal()">Create</button>
    </div>
  `);
}

async function saveGoal() {
  const name     = document.getElementById('mGName').value.trim();
  const emoji    = document.getElementById('mGEmoji').value || '🎯';
  const target   = parseFloat(document.getElementById('mGTarget').value);
  const saved    = parseFloat(document.getElementById('mGSaved').value) || 0;
  const deadline = document.getElementById('mGDead').value;
  if (!name || !target) { alert('Enter name and target.'); return; }
  try {
    const goal = await api('POST', '/goals', { name, emoji, target, saved, deadline });
    state.goals.push(goal);
    closeModalDirect();
    renderGoals();
    toast('Goal created!');
  } catch (e) { alert(e.message); }
}

function addToGoal(id) {
  showModal(`
    <div class="modal-title">Add to Savings</div>
    <div class="modal-field"><label>Amount to add (₹)</label><input type="number" id="mAddAmt" placeholder="500" /></div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="confirmAddToGoal('${id}')">Add</button>
    </div>
  `);
}

async function confirmAddToGoal(id) {
  const amount = parseFloat(document.getElementById('mAddAmt').value);
  if (!amount || amount <= 0) { alert('Enter valid amount.'); return; }
  try {
    const updated = await api('PATCH', `/goals/${id}/add`, { amount });
    state.goals = state.goals.map(g => g.id === id ? updated : g);
    closeModalDirect();
    renderGoals();
    toast('Savings updated!');
  } catch (e) { alert(e.message); }
}

async function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  try {
    await api('DELETE', `/goals/${id}`);
    state.goals = state.goals.filter(g => g.id !== id);
    renderGoals();
    toast('Goal deleted');
  } catch (e) { toast('Error: ' + e.message); }
}

// ─── REMINDERS ────────────────────────────────────────────────────────────────
function renderReminders() {
  const today = new Date(); today.setHours(0,0,0,0);

  const cards = state.reminders.map(r => {
    const due  = new Date(r.due_date); due.setHours(0,0,0,0);
    const diff = Math.round((due - today) / 86400000);
    let badge, label;
    if (diff < 0)      { badge = 'badge-urgent'; label = `Overdue by ${-diff}d`; }
    else if (diff <= 3){ badge = 'badge-urgent'; label = diff === 0 ? 'Due today!' : `Due in ${diff}d`; }
    else if (diff <= 7){ badge = 'badge-soon';   label = `Due in ${diff}d`; }
    else               { badge = 'badge-ok';     label = `Due in ${diff}d`; }
    return `
      <div class="reminder-card">
        <div class="reminder-icon">🔔</div>
        <div class="reminder-info">
          <div class="reminder-title">${r.title}</div>
          <div class="reminder-meta">₹${fmt2(r.amount)} · ${formatDate(r.due_date)}</div>
        </div>
        <span class="reminder-badge ${badge}">${label}</span>
        <button class="btn-danger" style="margin-left:10px" onclick="deleteReminder('${r.id}')">✕</button>
      </div>`;
  }).join('');
  document.getElementById('remindersList').innerHTML = cards || emptyState('🔔','No reminders yet.');
}

function openAddReminder() {
  showModal(`
    <div class="modal-title">Add Bill Reminder</div>
    <div class="modal-field"><label>Title</label><input type="text" id="mRTitle" placeholder="Hostel Fee, Library Fine…" /></div>
    <div class="modal-field"><label>Amount (₹)</label><input type="number" id="mRAmt" placeholder="500" /></div>
    <div class="modal-field"><label>Due Date</label><input type="date" id="mRDate" value="${todayStr()}" /></div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="saveReminder()">Save</button>
    </div>
  `);
}

async function saveReminder() {
  const title    = document.getElementById('mRTitle').value.trim();
  const amount   = parseFloat(document.getElementById('mRAmt').value);
  const due_date = document.getElementById('mRDate').value;
  if (!title || !amount || !due_date) { alert('Fill all fields.'); return; }
  try {
    const rem = await api('POST', '/reminders', { title, amount, due_date });
    state.reminders.push(rem);
    closeModalDirect();
    renderReminders();
    toast('Reminder added');
  } catch (e) { alert(e.message); }
}

async function deleteReminder(id) {
  try {
    await api('DELETE', `/reminders/${id}`);
    state.reminders = state.reminders.filter(r => r.id !== id);
    renderReminders();
    toast('Reminder deleted');
  } catch (e) { toast('Error: ' + e.message); }
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
async function renderAdminPanel() {
  // Categories list
  document.getElementById('catList').innerHTML = state.categories.map(c => `
    <div class="cat-item">
      <span>${c.emoji} ${c.name}</span>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="cat-badge" style="background:${c.type==='income'?'var(--green-lt)':'var(--red-lt)'};color:${c.type==='income'?'var(--green)':'var(--red)'}">
          ${c.type}
        </span>
        ${c.is_default ? '' : `<button class="btn-danger" onclick="deleteCat('${c.id}')">✕</button>`}
      </div>
    </div>
  `).join('');

  // Stats from API
  try {
    const stats = await api('GET', '/admin/stats');
    document.getElementById('adminStats').innerHTML = `
      <div class="admin-stat"><div class="val">${stats.total_students}</div><div class="lbl">Registered Users</div></div>
      <div class="admin-stat"><div class="val">${stats.total_transactions}</div><div class="lbl">Total Transactions</div></div>
      <div class="admin-stat"><div class="val">${stats.total_categories}</div><div class="lbl">Categories</div></div>
      <div class="admin-stat"><div class="val">₹${fmt2(stats.total_volume)}</div><div class="lbl">Total Volume</div></div>
    `;
  } catch (e) {}
}

async function addCategory() {
  const name = document.getElementById('newCatName').value.trim();
  const type = document.getElementById('newCatType').value;
  if (!name) { alert('Enter a category name.'); return; }
  try {
    const cat = await api('POST', '/categories', { name, type });
    state.categories.push(cat);
    document.getElementById('newCatName').value = '';
    renderAdminPanel();
    populateCategoryFilters();
    toast('Category added');
  } catch (e) { alert(e.message); }
}

async function deleteCat(id) {
  try {
    await api('DELETE', `/categories/${id}`);
    state.categories = state.categories.filter(c => c.id !== id);
    renderAdminPanel();
    populateCategoryFilters();
    toast('Category removed');
  } catch (e) { alert(e.message); }
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────
function exportCSV() {
  const rows = [['Date','Type','Category','Amount (₹)','Note']];
  state.transactions.forEach(t => rows.push([t.txn_date, t.type, t.category_name, t.amount, t.note||'']));
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'StuFin_Transactions.csv'; a.click();
  toast('CSV exported!');
}

function exportPDF() {
  const user    = state.user;
  const txns    = state.transactions.filter(t => isThisMonth(t.txn_date));
  const income  = txns.filter(t => t.type==='income').reduce((s,t)=>s+ +t.amount,0);
  const expense = txns.filter(t => t.type==='expense').reduce((s,t)=>s+ +t.amount,0);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>StuFin Report</title>
  <style>body{font-family:Arial,sans-serif;margin:32px;color:#1E293B;}h1{font-size:22px;color:#2563EB;}
  table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #E2E8F0;}
  th{background:#F7F9FC;font-weight:600;font-size:12px;text-transform:uppercase;}
  .income{color:#10B981}.expense{color:#EF4444}.summary{display:flex;gap:32px;margin:20px 0;}</style></head>
  <body><h1>StuFin – Financial Report</h1>
  <p>Student: <strong>${user.name}</strong> &nbsp;|&nbsp; Month: <strong>${new Date().toLocaleString('default',{month:'long',year:'numeric'})}</strong></p>
  <div class="summary">
    <div>💵 Income: <strong class="income">₹${fmt2(income)}</strong></div>
    <div>💸 Expenses: <strong class="expense">₹${fmt2(expense)}</strong></div>
    <div>💰 Net: <strong>₹${fmt2(income-expense)}</strong></div>
  </div>
  <table><thead><tr><th>Date</th><th>Category</th><th>Note</th><th>Amount</th></tr></thead><tbody>
  ${txns.map(t=>`<tr><td>${formatDate(t.txn_date)}</td><td>${t.category_name}</td><td>${t.note||'–'}</td>
  <td class="${t.type}">${t.type==='income'?'+':'-'}₹${fmt2(t.amount)}</td></tr>`).join('')}
  </tbody></table></body></html>`;
  const win = window.open('','_blank');
  win.document.write(html); win.document.close();
  setTimeout(() => win.print(), 600);
  toast('PDF report generated!');
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function showModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modal').classList.add('open');
}
function closeModal(e) { if (e.target.id === 'modal') closeModalDirect(); }
function closeModalDirect() { document.getElementById('modal').classList.remove('open'); }

// ─── TOAST ────────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function fmt(n)  { return '₹' + fmt2(n); }
function fmt2(n) { return Number(n||0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function formatDate(d) {
  if (!d) return '';
  const s = typeof d === 'string' ? d.slice(0,10) : new Date(d).toISOString().slice(0,10);
  const [y,m,day] = s.split('-');
  return `${parseInt(day)} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]} ${y}`;
}
function isThisMonth(d) {
  if (!d) return false;
  const s = typeof d === 'string' ? d.slice(0,7) : new Date(d).toISOString().slice(0,7);
  return s === new Date().toISOString().slice(0,7);
}
function emptyState(icon, msg) {
  return `<div class="empty-state"><span>${icon}</span>${msg}</div>`;
}

// ─── INIT ────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const data = await api('GET', '/auth/session');
    if (data.user) {
      await loadAllData(data.user);
      launchApp(data.user);
    }
  } catch (e) {
    // Not logged in — show login screen (already visible by default)
  }
});
