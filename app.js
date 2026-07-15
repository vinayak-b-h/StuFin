/* ─────────────────────────────────────────────
   StuFin – app.js
   All client-side logic (auth, CRUD, charts, export)
   Uses localStorage to simulate a SQL-backed server
───────────────────────────────────────────── */

'use strict';

// ─── DATA LAYER (localStorage → simulates SQL tables) ───────────────────────

const DB = {
  get: (key) => JSON.parse(localStorage.getItem('stufin_' + key) || 'null'),
  set: (key, val) => localStorage.setItem('stufin_' + key, JSON.stringify(val)),
  del: (key) => localStorage.removeItem('stufin_' + key),
};

function getUsers()       { return DB.get('users')       || []; }
function getTransactions(){ return DB.get('transactions') || []; }
function getCategories()  { return DB.get('categories')  || defaultCategories(); }
function getBudgets()     { return DB.get('budgets')      || []; }
function getGoals()       { return DB.get('goals')        || []; }
function getReminders()   { return DB.get('reminders')    || []; }
function currentUser()    { return DB.get('session');             }

function defaultCategories() {
  return [
    { id: 'c1',  name: 'Food & Dining',    type: 'expense', emoji: '🍽️' },
    { id: 'c2',  name: 'Travel',           type: 'expense', emoji: '🚌' },
    { id: 'c3',  name: 'Academics',        type: 'expense', emoji: '📚' },
    { id: 'c4',  name: 'Entertainment',    type: 'expense', emoji: '🎮' },
    { id: 'c5',  name: 'Stationery',       type: 'expense', emoji: '✏️' },
    { id: 'c6',  name: 'Health',           type: 'expense', emoji: '💊' },
    { id: 'c7',  name: 'Clothing',         type: 'expense', emoji: '👕' },
    { id: 'c8',  name: 'Utilities',        type: 'expense', emoji: '💡' },
    { id: 'c9',  name: 'Stipend',          type: 'income',  emoji: '💼' },
    { id: 'c10', name: 'Pocket Money',     type: 'income',  emoji: '💰' },
    { id: 'c11', name: 'Freelance',        type: 'income',  emoji: '🖥️' },
    { id: 'c12', name: 'Scholarship',      type: 'income',  emoji: '🎓' },
    { id: 'c13', name: 'Other',            type: 'expense', emoji: '📦' },
  ];
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

function showRegister() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
}
function showLogin() {
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
}

function handleRegister() {
  const name   = document.getElementById('regName').value.trim();
  const email  = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass   = document.getElementById('regPassword').value;
  const budget = parseFloat(document.getElementById('regBudget').value) || 5000;
  const err    = document.getElementById('regError');

  if (!name)                { err.textContent = 'Please enter your name.';  return; }
  if (!email.includes('@')) { err.textContent = 'Enter a valid email.';     return; }
  if (pass.length < 6)      { err.textContent = 'Password min 6 chars.';   return; }

  const users = getUsers();
  if (users.find(u => u.email === email)) { err.textContent = 'Email already registered.'; return; }

  const user = { id: uid(), name, email, password: pass, budget, createdAt: now() };
  users.push(user);
  DB.set('users', users);
  DB.set('session', user);

  err.textContent = '';
  launchApp(user);
}

function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('loginPassword').value;
  const err   = document.getElementById('loginError');

  const users = getUsers();
  const user  = users.find(u => u.email === email && u.password === pass);
  if (!user) { err.textContent = 'Invalid email or password.'; return; }

  err.textContent = '';
  DB.set('session', user);
  launchApp(user);
}

function handleLogout() {
  DB.del('session');
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  showLogin();
}

function initSampleData(userId) {
  const cats = getCategories();
  const catIds = cats.reduce((m, c) => { m[c.name] = c.id; return m; }, {});
  const thisMonth = new Date();
  const m = thisMonth.getMonth() + 1;
  const y = thisMonth.getFullYear();
  const d = (day) => `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  const txns = [
    { id: uid(), userId, type: 'income',  category: catIds['Pocket Money'],  amount: 3000, note: 'Monthly pocket money',     date: d(1)  },
    { id: uid(), userId, type: 'income',  category: catIds['Stipend'],       amount: 2000, note: 'Internship stipend',        date: d(3)  },
    { id: uid(), userId, type: 'expense', category: catIds['Food & Dining'], amount: 420,  note: 'Mess fee top-up',          date: d(4)  },
    { id: uid(), userId, type: 'expense', category: catIds['Travel'],        amount: 160,  note: 'Bus pass recharge',        date: d(5)  },
    { id: uid(), userId, type: 'expense', category: catIds['Academics'],     amount: 350,  note: 'Reference books',         date: d(7)  },
    { id: uid(), userId, type: 'expense', category: catIds['Entertainment'], amount: 199,  note: 'Streaming subscription',  date: d(9)  },
    { id: uid(), userId, type: 'expense', category: catIds['Stationery'],    amount: 120,  note: 'Pens and notebooks',      date: d(10) },
    { id: uid(), userId, type: 'expense', category: catIds['Food & Dining'], amount: 280,  note: 'Canteen and snacks',      date: d(12) },
    { id: uid(), userId, type: 'income',  category: catIds['Freelance'],     amount: 800,  note: 'Logo design project',     date: d(14) },
    { id: uid(), userId, type: 'expense', category: catIds['Health'],        amount: 230,  note: 'Pharmacy',                date: d(15) },
  ];

  const existing = getTransactions().filter(t => t.userId !== userId);
  DB.set('transactions', [...existing, ...txns]);

  const budgets = getBudgets().filter(b => b.userId !== userId);
  budgets.push(
    { id: uid(), userId, category: catIds['Food & Dining'], amount: 1200 },
    { id: uid(), userId, category: catIds['Travel'],        amount: 500  },
    { id: uid(), userId, category: catIds['Academics'],     amount: 600  },
    { id: uid(), userId, category: catIds['Entertainment'], amount: 300  },
  );
  DB.set('budgets', budgets);

  const goals = getGoals().filter(g => g.userId !== userId);
  goals.push(
    { id: uid(), userId, name: 'New Laptop',    emoji: '💻', target: 45000, saved: 8000,  deadline: `${y+1}-03-01` },
    { id: uid(), userId, name: 'Goa Trip',      emoji: '🏖️', target: 10000, saved: 3200,  deadline: `${y}-12-15`   },
    { id: uid(), userId, name: 'Emergency Fund',emoji: '🛡️', target: 15000, saved: 5500,  deadline: `${y+1}-01-01` },
  );
  DB.set('goals', goals);

  const reminders = getReminders().filter(r => r.userId !== userId);
  reminders.push(
    { id: uid(), userId, title: 'Hostel Fee',        amount: 8500, dueDate: `${y}-${String(m).padStart(2,'0')}-20` },
    { id: uid(), userId, title: 'Internet Bill',     amount: 599,  dueDate: `${y}-${String(m).padStart(2,'0')}-25` },
    { id: uid(), userId, title: 'Library Fine',      amount: 50,   dueDate: `${y}-${String(m+1>12?1:m+1).padStart(2,'0')}-05` },
  );
  DB.set('reminders', reminders);
}

// ─── APP LAUNCH ──────────────────────────────────────────────────────────────

function launchApp(user) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';

  // Profile
  document.getElementById('sbAvatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('sbName').textContent   = user.name.split(' ')[0];

  // Greeting
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dashGreeting').textContent = `${greet}, ${user.name.split(' ')[0]} 👋`;
  document.getElementById('dashMonth').textContent = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

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
  if (page === 'admin')   renderAdminPanel();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.body.classList.toggle('collapsed');
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

function updateKPIs() {
  const user  = currentUser();
  const txns  = getTransactions().filter(t => t.userId === user.id && isThisMonth(t.date));
  const income  = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const budgetLeft = user.budget - expense;

  document.getElementById('kpiIncome').textContent    = fmt(income);
  document.getElementById('kpiExpense').textContent   = fmt(expense);
  document.getElementById('kpiBalance').textContent   = fmt(balance);
  document.getElementById('kpiBudgetLeft').textContent = fmt(budgetLeft);
}

// ─── PULSE BAR ───────────────────────────────────────────────────────────────

function renderPulseBar() {
  const user    = currentUser();
  const txns    = getTransactions().filter(t => t.userId === user.id && isThisMonth(t.date));
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const budget  = user.budget;
  const pct     = budget > 0 ? Math.min(100, Math.round((expense / budget) * 100)) : 0;
  const left    = 100 - pct;

  document.getElementById('pulsePercent').textContent = left + '% budget remaining';
  const fill = document.getElementById('pulseFill');
  fill.style.width = pct + '%';
  fill.className = 'pulse-fill' + (pct >= 90 ? ' danger' : pct >= 70 ? ' warn' : '');

  const hint = pct === 0
    ? 'No expenses recorded yet.'
    : pct < 50 ? `₹${fmt2(budget - expense)} remaining — you're doing great!`
    : pct < 75 ? `₹${fmt2(budget - expense)} remaining — watch your spending.`
    : pct < 90 ? `Only ₹${fmt2(budget - expense)} left — slow down!`
    : `Budget almost exhausted! ₹${fmt2(budget - expense)} left.`;
  document.getElementById('pulseHint').textContent = hint;
}

// ─── CHARTS ──────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#2563EB','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#F97316','#84CC16','#EC4899','#6366F1'];

function renderCharts() {
  const user  = currentUser();
  const period = document.getElementById('chartPeriod')?.value || 'month';
  const txns  = getTransactions().filter(t =>
    t.userId === user.id &&
    t.type === 'expense' &&
    (period === 'all' || isThisMonth(t.date))
  );

  const cats = getCategories();
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]));
  const grouped = {};
  txns.forEach(t => {
    const cat = catMap[t.category]?.name || 'Other';
    grouped[cat] = (grouped[cat] || 0) + t.amount;
  });

  const labels = Object.keys(grouped);
  const values = Object.values(grouped);

  drawBarChart('catChart', labels, values);
  drawPieChart('pieChart', getTransactions().filter(t => t.userId === user.id && isThisMonth(t.date)));
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

  // Y axis grid
  const steps = 4;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= steps; i++) {
    const y = pad.top + chartH - (i / steps) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('₹' + fmt2((maxVal * i) / steps), pad.left - 6, y + 4);
  }

  // Bars
  values.forEach((v, i) => {
    const bH  = maxVal > 0 ? (v / maxVal) * chartH : 0;
    const x   = pad.left + i * spacing + (spacing - barW) / 2;
    const y   = pad.top + chartH - bH;
    const color = CHART_COLORS[i % CHART_COLORS.length];

    const grad = ctx.createLinearGradient(0, y, 0, y + bH);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '88');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, bH, [4, 4, 0, 0]);
    ctx.fill();

    // Label
    ctx.fillStyle = '#64748B';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    const lbl = labels[i].length > 9 ? labels[i].slice(0, 8) + '…' : labels[i];
    ctx.fillText(lbl, x + barW / 2, H - pad.bottom + 16);

    // Value on top
    ctx.fillStyle = color;
    ctx.font = 'bold 11px Inter, sans-serif';
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

  const income  = txns.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const total   = income + expense;
  const legend  = document.getElementById('pieLegend');

  if (total === 0) {
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath(); ctx.arc(size/2, size/2, size/2 - 10, 0, Math.PI*2); ctx.fill();
    if (legend) legend.innerHTML = '<div class="pie-legend-item"><span style="color:#94A3B8;font-size:.82rem">No data yet</span></div>';
    return;
  }

  const slices = [
    { label: 'Income',  value: income,  color: '#10B981' },
    { label: 'Expense', value: expense, color: '#EF4444' },
  ];

  let startAngle = -Math.PI / 2;
  const cx = size / 2, cy = size / 2, r = size / 2 - 12, innerR = r * 0.55;

  slices.forEach(s => {
    if (!s.value) return;
    const sweep = (s.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + sweep);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    startAngle += sweep;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Center text
  ctx.fillStyle = '#1E293B';
  ctx.font = `bold 13px Plus Jakarta Sans, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('₹' + fmt2(total), cx, cy);

  if (legend) {
    legend.innerHTML = slices.map(s => `
      <div class="pie-legend-item">
        <span class="pie-legend-dot" style="background:${s.color}"></span>
        <span>${s.label}: <strong>₹${fmt2(s.value)}</strong></span>
      </div>
    `).join('');
  }
}

function renderTrendChart() {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;
  const user = currentUser();
  const all  = getTransactions().filter(t => t.userId === user.id);

  // Last 6 months
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({ label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const incomeData  = months.map(m => all.filter(t => t.type==='income'  && sameMonth(t.date, m.year, m.month)).reduce((s,t)=>s+t.amount,0));
  const expenseData = months.map(m => all.filter(t => t.type==='expense' && sameMonth(t.date, m.year, m.month)).reduce((s,t)=>s+t.amount,0));

  const W = canvas.offsetWidth || 700;
  const H = canvas.height;
  canvas.width = W;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const pad = { top: 24, right: 24, bottom: 44, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;
  const maxVal = Math.max(...incomeData, ...expenseData, 1);
  const step   = chartW / (months.length - 1);

  // Grid
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('₹' + fmt2(maxVal * (1 - i/4)), pad.left - 6, y + 4);
  }

  // Lines
  const drawLine = (data, color) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    data.forEach((v, i) => {
      const x = pad.left + i * step;
      const y = pad.top + chartH - (v / maxVal) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    data.forEach((v, i) => {
      const x = pad.left + i * step;
      const y = pad.top + chartH - (v / maxVal) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI*2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  drawLine(incomeData,  '#10B981');
  drawLine(expenseData, '#EF4444');

  // Month labels
  months.forEach((m, i) => {
    ctx.fillStyle = '#64748B';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.label, pad.left + i * step, H - 8);
  });

  // Legend
  ctx.fillStyle = '#10B981'; ctx.fillRect(W - 140, 10, 12, 12);
  ctx.fillStyle = '#1E293B'; ctx.font = '12px Inter'; ctx.textAlign = 'left'; ctx.fillText('Income', W - 122, 21);
  ctx.fillStyle = '#EF4444'; ctx.fillRect(W - 70, 10, 12, 12);
  ctx.fillStyle = '#1E293B'; ctx.fillText('Expense', W - 52, 21);
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

function renderRecentTransactions() {
  const user = currentUser();
  const txns = getTransactions()
    .filter(t => t.userId === user.id)
    .sort((a,b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  document.getElementById('recentTxns').innerHTML = txnsHTML(txns) || emptyState('💸','No transactions yet. Add your first one!');
}

function renderTransactions() {
  const user   = currentUser();
  const search = (document.getElementById('txnSearch')?.value || '').toLowerCase();
  const cat    = document.getElementById('txnFilterCat')?.value  || '';
  const type   = document.getElementById('txnFilterType')?.value || '';
  const cats   = getCategories();
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]));

  let txns = getTransactions()
    .filter(t => t.userId === user.id)
    .filter(t => !cat  || t.category === cat)
    .filter(t => !type || t.type === type)
    .filter(t => !search || (t.note || '').toLowerCase().includes(search) || (catMap[t.category]?.name || '').toLowerCase().includes(search))
    .sort((a,b) => new Date(b.date) - new Date(a.date));

  document.getElementById('allTxnsList').innerHTML = txnsHTML(txns) || emptyState('🔍','No transactions match your filters.');
}

function txnsHTML(txns) {
  if (!txns.length) return '';
  const cats  = getCategories();
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]));
  return txns.map(t => {
    const cat  = catMap[t.category] || { emoji: '📦', name: 'Other' };
    const sign = t.type === 'income' ? '+' : '–';
    return `
      <div class="txn-item">
        <div class="txn-icon" style="background:${t.type === 'income' ? 'var(--green-lt)' : 'var(--red-lt)'}">
          ${cat.emoji}
        </div>
        <div class="txn-info">
          <div class="txn-name">${t.note || cat.name}</div>
          <div class="txn-meta">${cat.name} · ${formatDate(t.date)}</div>
        </div>
        <div class="txn-amount ${t.type}">${sign}₹${fmt2(t.amount)}</div>
        <button class="btn-danger txn-del" onclick="deleteTxn('${t.id}')">✕</button>
      </div>`;
  }).join('');
}

function deleteTxn(id) {
  if (!confirm('Delete this transaction?')) return;
  DB.set('transactions', getTransactions().filter(t => t.id !== id));
  renderAll();
  toast('Transaction deleted');
}

function populateCategoryFilters() {
  const cats = getCategories();
  const selects = ['txnFilterCat'];
  selects.forEach(sid => {
    const el = document.getElementById(sid);
    if (!el) return;
    el.innerHTML = '<option value="">All Categories</option>' +
      cats.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('');
  });
}

// ─── ADD TRANSACTION MODAL ────────────────────────────────────────────────────

function openAddTxn() {
  const cats = getCategories();
  const optionsExpense = cats.filter(c => c.type === 'expense').map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('');
  const optionsIncome  = cats.filter(c => c.type === 'income').map(c  => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('');

  showModal(`
    <div class="modal-title">Add Transaction</div>
    <div class="modal-field">
      <label>Type</label>
      <select id="mTxnType" onchange="updateCatOptions()">
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
    </div>
    <div class="modal-field">
      <label>Category</label>
      <select id="mTxnCat">${optionsExpense}</select>
    </div>
    <div class="modal-field">
      <label>Amount (₹)</label>
      <input type="number" id="mTxnAmt" placeholder="0.00" min="0" step="0.01" />
    </div>
    <div class="modal-field">
      <label>Date</label>
      <input type="date" id="mTxnDate" value="${today()}" />
    </div>
    <div class="modal-field">
      <label>Note (optional)</label>
      <input type="text" id="mTxnNote" placeholder="e.g. Mess fee, Amazon order…" />
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="saveTxn()">Save</button>
    </div>
  `);

  // cache options
  window._txnCatOpts = { expense: optionsExpense, income: optionsIncome };
}

function updateCatOptions() {
  const type = document.getElementById('mTxnType')?.value;
  const el   = document.getElementById('mTxnCat');
  if (el && window._txnCatOpts) el.innerHTML = window._txnCatOpts[type] || '';
}

function saveTxn() {
  const user = currentUser();
  const type = document.getElementById('mTxnType').value;
  const cat  = document.getElementById('mTxnCat').value;
  const amt  = parseFloat(document.getElementById('mTxnAmt').value);
  const date = document.getElementById('mTxnDate').value;
  const note = document.getElementById('mTxnNote').value.trim();

  if (!amt || amt <= 0) { alert('Enter a valid amount.'); return; }
  if (!date)            { alert('Select a date.'); return; }

  const txn = { id: uid(), userId: user.id, type, category: cat, amount: amt, date, note };
  DB.set('transactions', [...getTransactions(), txn]);
  closeModalDirect();
  populateCategoryFilters();
  renderAll();
  toast(`${type === 'income' ? 'Income' : 'Expense'} of ₹${fmt2(amt)} added`);
}

// ─── BUDGETS ─────────────────────────────────────────────────────────────────

function renderBudgets() {
  const user    = currentUser();
  const budgets = getBudgets().filter(b => b.userId === user.id);
  const cats    = getCategories();
  const catMap  = Object.fromEntries(cats.map(c => [c.id, c]));
  const txns    = getTransactions().filter(t => t.userId === user.id && t.type === 'expense' && isThisMonth(t.date));

  const rows = budgets.map(b => {
    const cat     = catMap[b.category] || { emoji: '📦', name: 'Other', id: b.category };
    const spent   = txns.filter(t => t.category === b.category).reduce((s,t) => s+t.amount, 0);
    const pct     = Math.min(100, Math.round((spent / b.amount) * 100));
    const color   = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#10B981';
    return `
      <div class="budget-row">
        <div class="budget-row-head">
          <div class="budget-cat-name">${cat.emoji} ${cat.name}</div>
          <div class="budget-amounts">Spent: <span>₹${fmt2(spent)}</span> / Budget: <span>₹${fmt2(b.amount)}</span></div>
        </div>
        <div class="budget-bar">
          <div class="budget-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px">
          <small style="color:var(--text-3);font-size:.78rem">${pct}% used</small>
          <button class="btn-danger" style="font-size:.76rem;padding:3px 8px" onclick="deleteBudget('${b.id}')">Remove</button>
        </div>
      </div>`;
  }).join('');

  document.getElementById('budgetList').innerHTML = rows || emptyState('📊','No budgets set. Add one to track category spending.');
}

function openAddBudget() {
  const cats = getCategories().filter(c => c.type === 'expense');
  showModal(`
    <div class="modal-title">Set Category Budget</div>
    <div class="modal-field">
      <label>Category</label>
      <select id="mBudCat">${cats.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('')}</select>
    </div>
    <div class="modal-field">
      <label>Monthly Limit (₹)</label>
      <input type="number" id="mBudAmt" placeholder="1000" min="1" />
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="saveBudget()">Save</button>
    </div>
  `);
}

function saveBudget() {
  const user = currentUser();
  const cat  = document.getElementById('mBudCat').value;
  const amt  = parseFloat(document.getElementById('mBudAmt').value);
  if (!amt || amt <= 0) { alert('Enter a valid amount.'); return; }

  const budgets = getBudgets().filter(b => !(b.userId === user.id && b.category === cat));
  budgets.push({ id: uid(), userId: user.id, category: cat, amount: amt });
  DB.set('budgets', budgets);
  closeModalDirect();
  renderBudgets();
  toast('Budget saved');
}

function deleteBudget(id) {
  DB.set('budgets', getBudgets().filter(b => b.id !== id));
  renderBudgets();
  toast('Budget removed');
}

// ─── SAVINGS GOALS ────────────────────────────────────────────────────────────

function renderGoals() {
  const user  = currentUser();
  const goals = getGoals().filter(g => g.userId === user.id);

  const cards = goals.map(g => {
    const pct  = Math.min(100, Math.round((g.saved / g.target) * 100));
    const left = g.target - g.saved;
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

  document.getElementById('goalsList').innerHTML = cards || emptyState('⭐','No savings goals yet. Create your first goal!');
}

function openAddGoal() {
  showModal(`
    <div class="modal-title">New Savings Goal</div>
    <div class="modal-field"><label>Goal Name</label><input type="text" id="mGName" placeholder="New Laptop, Trip, etc." /></div>
    <div class="modal-field"><label>Emoji</label><input type="text" id="mGEmoji" value="🎯" maxlength="2" style="width:70px" /></div>
    <div class="modal-field"><label>Target Amount (₹)</label><input type="number" id="mGTarget" placeholder="10000" /></div>
    <div class="modal-field"><label>Already Saved (₹)</label><input type="number" id="mGSaved" placeholder="0" /></div>
    <div class="modal-field"><label>Deadline (optional)</label><input type="date" id="mGDead" /></div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="saveGoal()">Create Goal</button>
    </div>
  `);
}

function saveGoal() {
  const user   = currentUser();
  const name   = document.getElementById('mGName').value.trim();
  const emoji  = document.getElementById('mGEmoji').value || '🎯';
  const target = parseFloat(document.getElementById('mGTarget').value);
  const saved  = parseFloat(document.getElementById('mGSaved').value) || 0;
  const deadline = document.getElementById('mGDead').value;
  if (!name || !target) { alert('Enter name and target.'); return; }
  const goals = getGoals();
  goals.push({ id: uid(), userId: user.id, name, emoji, target, saved, deadline });
  DB.set('goals', goals);
  closeModalDirect();
  renderGoals();
  toast('Goal created!');
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

function confirmAddToGoal(id) {
  const amt = parseFloat(document.getElementById('mAddAmt').value);
  if (!amt || amt <= 0) { alert('Enter valid amount.'); return; }
  const goals = getGoals().map(g => g.id === id ? { ...g, saved: Math.min(g.target, g.saved + amt) } : g);
  DB.set('goals', goals);
  closeModalDirect();
  renderGoals();
  toast('Savings updated!');
}

function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  DB.set('goals', getGoals().filter(g => g.id !== id));
  renderGoals();
  toast('Goal deleted');
}

// ─── REMINDERS ────────────────────────────────────────────────────────────────

function renderReminders() {
  const user  = currentUser();
  const items = getReminders().filter(r => r.userId === user.id)
    .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
  const today  = new Date(); today.setHours(0,0,0,0);

  const cards = items.map(r => {
    const due  = new Date(r.dueDate); due.setHours(0,0,0,0);
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
          <div class="reminder-meta">₹${fmt2(r.amount)} · ${formatDate(r.dueDate)}</div>
        </div>
        <span class="reminder-badge ${badge}">${label}</span>
        <button class="btn-danger" style="margin-left:10px" onclick="deleteReminder('${r.id}')">✕</button>
      </div>`;
  }).join('');

  document.getElementById('remindersList').innerHTML = cards || emptyState('🔔','No reminders. Add a bill or fee deadline.');
}

function openAddReminder() {
  showModal(`
    <div class="modal-title">Add Bill Reminder</div>
    <div class="modal-field"><label>Title</label><input type="text" id="mRTitle" placeholder="Hostel Fee, Library Fine…" /></div>
    <div class="modal-field"><label>Amount (₹)</label><input type="number" id="mRAmt" placeholder="500" /></div>
    <div class="modal-field"><label>Due Date</label><input type="date" id="mRDate" value="${today()}" /></div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="saveReminder()">Save</button>
    </div>
  `);
}

function saveReminder() {
  const user  = currentUser();
  const title = document.getElementById('mRTitle').value.trim();
  const amt   = parseFloat(document.getElementById('mRAmt').value);
  const date  = document.getElementById('mRDate').value;
  if (!title || !amt || !date) { alert('Fill all fields.'); return; }
  const rem = getReminders();
  rem.push({ id: uid(), userId: user.id, title, amount: amt, dueDate: date });
  DB.set('reminders', rem);
  closeModalDirect();
  renderReminders();
  toast('Reminder added');
}

function deleteReminder(id) {
  DB.set('reminders', getReminders().filter(r => r.id !== id));
  renderReminders();
  toast('Reminder deleted');
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────

function renderAdminPanel() {
  const cats  = getCategories();
  const users = getUsers();
  const txns  = getTransactions();

  document.getElementById('catList').innerHTML = cats.map(c => `
    <div class="cat-item">
      <span>${c.emoji} ${c.name}</span>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="cat-badge" style="background:${c.type==='income'?'var(--green-lt)':'var(--red-lt)'};color:${c.type==='income'?'var(--green)':'var(--red)'}">
          ${c.type}
        </span>
        ${c.id.startsWith('c') && parseInt(c.id.slice(1)) <= 13 ? '' : `<button class="btn-danger" onclick="deleteCat('${c.id}')">✕</button>`}
      </div>
    </div>
  `).join('');

  document.getElementById('adminStats').innerHTML = `
    <div class="admin-stat"><div class="val">${users.length}</div><div class="lbl">Registered Users</div></div>
    <div class="admin-stat"><div class="val">${txns.length}</div><div class="lbl">Total Transactions</div></div>
    <div class="admin-stat"><div class="val">${cats.length}</div><div class="lbl">Categories</div></div>
    <div class="admin-stat"><div class="val">₹${fmt2(txns.reduce((s,t)=>s+t.amount,0))}</div><div class="lbl">Total Volume</div></div>
  `;
}

function addCategory() {
  const name = document.getElementById('newCatName').value.trim();
  const type = document.getElementById('newCatType').value;
  if (!name) { alert('Enter a category name.'); return; }
  const cats = getCategories();
  if (cats.find(c => c.name.toLowerCase() === name.toLowerCase())) { alert('Category already exists.'); return; }
  cats.push({ id: uid(), name, type, emoji: type === 'income' ? '💵' : '💸' });
  DB.set('categories', cats);
  document.getElementById('newCatName').value = '';
  renderAdminPanel();
  populateCategoryFilters();
  toast('Category added');
}

function deleteCat(id) {
  DB.set('categories', getCategories().filter(c => c.id !== id));
  renderAdminPanel();
  populateCategoryFilters();
  toast('Category removed');
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────

function exportCSV() {
  const user = currentUser();
  const cats = getCategories();
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]));
  const txns = getTransactions().filter(t => t.userId === user.id)
    .sort((a,b) => new Date(b.date) - new Date(a.date));

  const rows = [['Date','Type','Category','Amount (₹)','Note']];
  txns.forEach(t => rows.push([
    t.date, t.type, catMap[t.category]?.name || 'Other', t.amount, t.note || ''
  ]));

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadFile('StuFin_Transactions.csv', 'text/csv', csv);
  toast('CSV exported!');
}

function exportPDF() {
  const user = currentUser();
  const txns = getTransactions().filter(t => t.userId === user.id && isThisMonth(t.date));
  const cats = getCategories();
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]));
  const income  = txns.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>StuFin Report</title>
  <style>body{font-family:Arial,sans-serif;margin:32px;color:#1E293B;}h1{font-size:22px;color:#2563EB;}
  table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #E2E8F0;}
  th{background:#F7F9FC;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.05em;}
  .income{color:#10B981}.expense{color:#EF4444}.summary{display:flex;gap:32px;margin:20px 0;}</style></head>
  <body><h1>StuFin – Financial Report</h1>
  <p>Student: <strong>${user.name}</strong> &nbsp;|&nbsp; Month: <strong>${new Date().toLocaleString('default',{month:'long',year:'numeric'})}</strong></p>
  <div class="summary">
    <div>💵 Total Income: <strong class="income">₹${fmt2(income)}</strong></div>
    <div>💸 Total Expenses: <strong class="expense">₹${fmt2(expense)}</strong></div>
    <div>💰 Net Balance: <strong>₹${fmt2(income-expense)}</strong></div>
  </div>
  <table><thead><tr><th>Date</th><th>Category</th><th>Note</th><th>Amount</th></tr></thead><tbody>
  ${txns.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t=>`
    <tr><td>${formatDate(t.date)}</td><td>${catMap[t.category]?.name||'Other'}</td>
    <td>${t.note||'–'}</td><td class="${t.type}">${t.type==='income'?'+':'-'}₹${fmt2(t.amount)}</td></tr>`).join('')}
  </tbody></table></body></html>`;

  const win = window.open('','_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 600);
  toast('PDF report generated!');
}

function downloadFile(filename, type, content) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ─── MODAL HELPERS ────────────────────────────────────────────────────────────

function showModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modal').classList.add('open');
}
function closeModal(e) {
  if (e.target.id === 'modal') closeModalDirect();
}
function closeModalDirect() {
  document.getElementById('modal').classList.remove('open');
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

function uid()  { return '_' + Math.random().toString(36).slice(2,11); }
function now()  { return new Date().toISOString(); }
function today(){ return new Date().toISOString().split('T')[0]; }
function fmt(n) { return '₹' + fmt2(n); }
function fmt2(n){ return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
function formatDate(d) {
  if (!d) return '';
  const [y,m,day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
}
function isThisMonth(d) {
  if (!d) return false;
  const now = new Date();
  return sameMonth(d, now.getFullYear(), now.getMonth() + 1);
}
function sameMonth(d, y, m) {
  if (!d) return false;
  const [dy, dm] = d.split('-').map(Number);
  return dy === y && dm === m;
}
function emptyState(icon, msg) {
  return `<div class="empty-state"><span>${icon}</span>${msg}</div>`;
}

// ─── INIT ────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  const session = currentUser();
  if (session) {
    launchApp(session);
  }
});
