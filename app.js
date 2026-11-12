(() => {
'use strict';

/* ============ Datos y constantes ============ */
const KEY = 'bolsillo.v1';
const ZERO_DEC = new Set(['COP', 'CLP']);
const LOCALES = { USD: 'es-US', COP: 'es-CO', MXN: 'es-MX', EUR: 'es-ES', PEN: 'es-PE', CLP: 'es-CL', ARS: 'es-AR', BRL: 'pt-BR' };
const CATS = {
  mercado:       { n: 'Mercado',       i: 'cart',     k: 'need' },
  vivienda:      { n: 'Vivienda',      i: 'home',     k: 'need' },
  servicios:     { n: 'Servicios',     i: 'bolt',     k: 'need' },
  transporte:    { n: 'Transporte',    i: 'bus',      k: 'need' },
  salud:         { n: 'Salud',         i: 'heart',    k: 'need' },
  educacion:     { n: 'Educación',     i: 'book',     k: 'need' },
  comida:        { n: 'Comida fuera',  i: 'utensils', k: 'want' },
  ocio:          { n: 'Ocio',          i: 'ticket',   k: 'want' },
  compras:       { n: 'Compras',       i: 'bag',      k: 'want' },
  suscripciones: { n: 'Suscripciones', i: 'repeat',   k: 'want' },
  otros:         { n: 'Otros',         i: 'dots',     k: 'want' },
};
const INC = {
  salario:   { n: 'Salario',        i: 'briefcase' },
  extra:     { n: 'Ingreso extra',  i: 'plus' },
  inversion: { n: 'Inversiones',    i: 'trend' },
  otros:     { n: 'Otros',          i: 'dots' },
};

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const defState = () => ({ tx: [], settings: { currency: 'USD', goal: 0, topic: '', hintDismissed: false } });
let S = load();
const ui = { tab: 'home', filter: 'all', lOff: 0, rKind: 'month', rOff: 0, first: true };

function load() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY));
    if (r && Array.isArray(r.tx)) return { tx: r.tx, settings: { ...defState().settings, ...r.settings } };
  } catch (e) {}
  return defState();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

/* ============ Utilidades ============ */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const cur = () => S.settings.currency;
const fmt = (n) => {
  const c = cur(), r = Math.round(n * 100) / 100, z = ZERO_DEC.has(c) || Number.isInteger(r);
  return new Intl.NumberFormat(LOCALES[c] || 'es', { style: 'currency', currency: c, minimumFractionDigits: z ? 0 : 2, maximumFractionDigits: z ? 0 : 2 }).format(r);
};
const fmtPlain = (n) => new Intl.NumberFormat(LOCALES[cur()] || 'es', { maximumFractionDigits: ZERO_DEC.has(cur()) ? 0 : 2 }).format(n);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const diffDays = (a, b) => Math.round((b - a) / 864e5);
const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const monthName = (d) => { const t = d.toLocaleDateString('es', { month: 'long', year: 'numeric' }); return t[0].toUpperCase() + t.slice(1); };
const shortDay = (d) => d.toLocaleDateString('es', { day: 'numeric', month: 'short' });

function parseAmount(str) {
  let s = String(str).replace(/[^\d.,]/g, '');
  if (!s) return 0;
  if (ZERO_DEC.has(cur())) return Number(s.replace(/[.,]/g, '')) || 0;
  const i = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  if (i >= 0 && s.length - i - 1 <= 2) {
    return Number(s.slice(0, i).replace(/[.,]/g, '') + '.' + s.slice(i + 1)) || 0;
  }
  return Number(s.replace(/[.,]/g, '')) || 0;
}

/* ============ Períodos y agregados ============ */
function period(kind, off) {
  const t = today();
  let start, end, full, pStart, pEnd, label;
  if (kind === 'month') {
    start = new Date(t.getFullYear(), t.getMonth() + off, 1);
    const last = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    end = off === 0 ? t : last; full = off < 0;
    const n = diffDays(start, end) + 1;
    pStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    const pLast = new Date(pStart.getFullYear(), pStart.getMonth() + 1, 0);
    pEnd = addDays(pStart, n - 1); if (pEnd > pLast) pEnd = pLast;
    label = monthName(start);
  } else {
    const dow = (t.getDay() + 6) % 7;
    start = addDays(t, -dow + off * 7);
    end = off === 0 ? t : addDays(start, 6); full = off < 0;
    const n = diffDays(start, end) + 1;
    pStart = addDays(start, -7); pEnd = addDays(pStart, n - 1);
    label = `${shortDay(start)} – ${shortDay(addDays(start, 6))}`;
  }
  return { kind, off, start, end, full, pStart, pEnd, label, n: diffDays(start, end) + 1 };
}
const inRange = (t, a, b) => t.date >= ymd(a) && t.date <= ymd(b);
const txIn = (a, b, type) => S.tx.filter((t) => (!type || t.type === type) && inRange(t, a, b));
const total = (arr) => arr.reduce((s, t) => s + t.amount, 0);
function byCat(arr) {
  const m = {};
  arr.forEach((t) => { m[t.cat] = (m[t.cat] || 0) + t.amount; });
  return m;
}

/* ============ Motor de recomendaciones ============ */
function insights(p) {
  const out = [];
  const cat = (c) => CATS[c]?.n || c;
  const exp = txIn(p.start, p.end, 'expense');
  const inc = txIn(p.start, p.end, 'income');
  const prevExp = txIn(p.pStart, p.pEnd, 'expense');
  const spent = total(exp), prevSpent = total(prevExp);
  const income = total(inc);
  const goal = Number(S.settings.goal) || 0;
  const cats = byCat(exp), pCats = byCat(prevExp);
  const factor = p.kind === 'week' ? 52 / 12 : 1; // para proyectar a mes
  const push = (tone, title, body, w = 0) => out.push({ tone, title, body, w });

  if (!exp.length) {
    push('info', 'Aún no hay gastos en este periodo', 'Registra cada gasto apenas ocurra: es lo que permite que las recomendaciones sean reales.');
    return out;
  }

  // 1. Ahorro / tope de gasto
  const t = today();
  const mFirst = new Date(t.getFullYear(), t.getMonth() + (p.kind === 'month' ? p.off : 0), 1);
  const dim = daysInMonth(mFirst.getFullYear(), mFirst.getMonth());
  if (p.kind === 'month') {
    if (goal > 0 && income === 0) {
      push('info', 'Agrega tus ingresos para medir tu ahorro', `Tu meta es ahorrar ${fmt(goal)} al mes, pero este mes no hay ingresos registrados, así que no puedo calcular cuánto puedes gastar.`, 5);
    } else if (goal > 0) {
      const saved = income - spent;
      if (p.full) {
        if (saved >= goal) push('good', 'Cumpliste tu meta de ahorro', `Ahorraste ${fmt(saved)} y tu meta era ${fmt(goal)}. ${saved > goal ? `Te sobraron ${fmt(saved - goal)}.` : ''}`, 6);
        else push('warn', 'No llegaste a tu meta de ahorro', `Ahorraste ${fmt(Math.max(saved, 0))} de ${fmt(goal)}. Revisa abajo en qué categorías puedes ajustar el próximo mes.`, 6);
      } else {
        const elapsed = p.n;
        const projSpent = spent / elapsed * dim;
        const projSave = income - projSpent;
        const daysLeft = dim - elapsed + 1;
        const cap = income - goal;
        const left = cap - spent;
        if (left < 0) push('warn', 'Ya superaste el tope que protege tu ahorro', `Para ahorrar ${fmt(goal)} podías gastar hasta ${fmt(cap)} y llevas ${fmt(spent)}. Cada gasto extra sale directamente de tu ahorro; evita gastos no esenciales lo que resta del mes.`, 6);
        else if (projSave < goal) push('warn', 'A este ritmo no llegas a tu meta', `Proyectas ahorrar ${fmt(Math.max(projSave, 0))} y tu meta es ${fmt(goal)}. Para lograrla, gasta como máximo ${fmt(left / daysLeft)} por día durante los próximos ${daysLeft} días.`, 6);
        else push('good', 'Vas en camino a tu meta de ahorro', `Con tu ritmo actual ahorrarías cerca de ${fmt(projSave)}, por encima de tu meta de ${fmt(goal)}. Te quedan ${fmt(left)} para gastar este mes.`, 3);
      }
    } else if (income > 0) {
      const rate = (income - spent) / income;
      push('info', 'Define una meta de ahorro mensual', `Hoy estás ahorrando el ${Math.round(rate * 100)}% de tus ingresos. Una meta concreta (muchos expertos sugieren al menos 20%) te da un tope de gasto claro. Puedes fijarla en Ajustes.`, 4);
    }
  } else {
    // semana: ritmo sostenible semanal
    const mInc = total(txIn(mFirst, new Date(mFirst.getFullYear(), mFirst.getMonth() + 1, 0), 'income'));
    if (goal > 0 && mInc > 0) {
      const weekly = (mInc - goal) / (dim / 7);
      if (spent > weekly) push('warn', 'Esta semana superó tu ritmo sostenible', `Para cumplir tu ahorro mensual de ${fmt(goal)}, tu gasto semanal ideal es de unos ${fmt(weekly)}. Llevas ${fmt(spent)}.`, 6);
      else push('good', 'Tu gasto semanal es compatible con tu meta', `Tu límite semanal para ahorrar ${fmt(goal)} al mes es de unos ${fmt(weekly)} y vas en ${fmt(spent)}.`, 3);
    }
  }

  // 2. Comparación con el periodo anterior
  if (prevSpent > 0) {
    const ch = (spent - prevSpent) / prevSpent;
    const same = p.kind === 'month' ? 'mismo punto del mes pasado' : 'mismo punto de la semana anterior';
    if (ch >= 0.15) push('warn', `Gastas ${Math.round(ch * 100)}% más que antes`, `${fmt(spent)} frente a ${fmt(prevSpent)} en el ${same}. Identifica qué cambió: suele ser una o dos categorías.`, 5);
    else if (ch <= -0.15) push('good', `Gastas ${Math.round(-ch * 100)}% menos que antes`, `${fmt(spent)} frente a ${fmt(prevSpent)} en el ${same}. Buen control; mantén lo que está funcionando.`, 2);
  }

  // 3. Categoría dominante
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const [topC, topV] = sorted[0];
  const share = topV / spent;
  if (share >= 0.35 && sorted.length > 1) {
    push('info', `${cat(topC)} concentra el ${Math.round(share * 100)}% de tus gastos`, `Recortar apenas un 10% ahí liberaría unos ${fmt(topV * 0.1 * factor)} al mes. Empieza por esa categoría antes que por las pequeñas.`, 4);
  }

  // 4. Mayor aumento por categoría
  let worst = null, best = null;
  for (const [c, v] of sorted) {
    const pv = pCats[c] || 0;
    if (pv <= 0) continue;
    const d = v - pv, r = d / pv;
    if (r >= 0.2 && d >= spent * 0.03 && (!worst || d > worst.d)) worst = { c, d, r };
    if (r <= -0.25 && -d >= spent * 0.03 && (!best || d < best.d)) best = { c, d, r };
  }
  if (worst) push('warn', `${cat(worst.c)} subió ${Math.round(worst.r * 100)}%`, `Son ${fmt(worst.d)} más que en el periodo anterior. Revisa si fue algo puntual o un hábito nuevo.`, 5);
  if (best) push('good', `Redujiste ${cat(best.c)}`, `Gastaste ${fmt(-best.d)} menos que en el periodo anterior (${Math.round(-best.r * 100)}% menos).`, 1);

  // 5. Regla 50/30/20
  if (income > 0 && p.kind === 'month') {
    const needs = exp.filter((t) => CATS[t.cat]?.k === 'need').reduce((s, t) => s + t.amount, 0);
    const wants = spent - needs;
    if (wants / income > 0.3) push('warn', `Gastos de gusto en ${Math.round(wants / income * 100)}% de tus ingresos`, `La regla 50/30/20 sugiere no pasar de 30% en ocio, compras, comida fuera y suscripciones. Estás ${fmt(wants - income * 0.3)} por encima de ese referente.`, 4);
    else if (needs / income > 0.5) push('info', `Tus necesidades suman ${Math.round(needs / income * 100)}% de tus ingresos`, 'Superan el 50% de referencia. Si no puedes recortarlas, intenta renegociar servicios o buscar ingresos adicionales.', 3);
  }

  // 6. Gastos hormiga
  const amounts = exp.map((t) => t.amount).sort((a, b) => a - b);
  const median = amounts[Math.floor(amounts.length / 2)];
  const small = exp.filter((t) => CATS[t.cat]?.k === 'want' && t.amount <= median);
  if (small.length >= 4 && total(small) / spent >= 0.12) {
    push('info', `${small.length} gastos pequeños suman ${fmt(total(small))}`, `Son compras de gusto de poco valor (café, snacks, antojos). Pequeñas por separado, pero proyectadas llegan a ${fmt(total(small) * factor * (p.kind === 'week' ? 1 : 30 / p.n))} al mes.`, 3);
  }

  // 7. Fin de semana
  if (p.n >= 7 && exp.length >= 6) {
    const wk = exp.filter((t) => { const g = pd(t.date).getDay(); return g === 0 || g === 6; });
    const ws = total(wk) / spent;
    if (ws >= 0.45) push('info', `El ${Math.round(ws * 100)}% de tu gasto cae en fin de semana`, 'Dos días concentran casi la mitad. Planear un tope para sábado y domingo suele ser la forma más fácil de recortar.', 2);
  }

  // 8. Suscripciones
  if (cats.suscripciones) push('info', `Suscripciones: ${fmt(cats.suscripciones * factor)} al mes`, `Eso son unos ${fmt(cats.suscripciones * factor * 12)} al año. Cancela las que no usaste en las últimas semanas.`, 2);

  // 9. Gasto individual grande
  const big = [...exp].sort((a, b) => b.amount - a.amount)[0];
  if (big.amount / spent >= 0.3 && exp.length >= 4) push('info', `Un solo gasto pesa el ${Math.round(big.amount / spent * 100)}%`, `${fmt(big.amount)} en ${cat(big.cat).toLowerCase()}${big.note ? ` («${big.note}»)` : ''}. Los gastos grandes conviene planearlos con un fondo aparte.`, 1);

  // 9b. Día de la semana dominante
  if (p.kind === 'month' && p.n >= 14) {
    const wd = [0, 0, 0, 0, 0, 0, 0]; exp.forEach((t) => { wd[pd(t.date).getDay()] += t.amount; });
    const i = wd.indexOf(Math.max(...wd)); const sh = wd[i] / spent;
    if (sh >= 0.25 && i !== 0 && i !== 6) push('info', `Los ${DIAS[i]} concentran el ${Math.round(sh * 100)}% de tu gasto`, `Un solo día de la semana pesa más que cualquier otro. Si identificas por qué (compras recurrentes, salidas), es el punto más fácil de ajustar.`, 2);
  }
  // 9c. Tasa de ahorro
  if (income > 0 && p.kind === 'month') {
    const rate = (income - spent) / income;
    if (rate < 0.1) push('warn', `Tu tasa de ahorro es de ${Math.round(rate * 100)}%`, 'Por debajo de 10% queda poco margen ante imprevistos. Apunta primero a un fondo de emergencia de 3 meses de gastos.', 5);
    else if (rate >= 0.2 && !goal) push('good', `Estás ahorrando el ${Math.round(rate * 100)}% de tus ingresos`, 'Superas el referente de 20%. Convierte esto en una meta mensual en Ajustes para protegerlo.', 2);
  }

  // 10. Hábito de registro
  const days = new Set(exp.map((t) => t.date)).size;
  if (p.n >= 5 && days / p.n < 0.5) push('info', `Registraste gastos en ${days} de ${p.n} días`, 'Si olvidas anotar, el reporte subestima tu gasto. Activa el recordatorio diario en Ajustes.', 1);

  out.sort((a, b) => ({ warn: 0, info: 1, good: 2 }[a.tone] - { warn: 0, info: 1, good: 2 }[b.tone]) || b.w - a.w);
  return out.slice(0, 6);
}

/* ============ Números clave del periodo ============ */
function stats(p) {
  const exp = txIn(p.start, p.end, 'expense'), inc = txIn(p.start, p.end, 'income');
  const spent = total(exp), income = total(inc);
  const rows = [];
  if (!spent) return rows;
  const byDay = {}; exp.forEach((t) => { byDay[t.date] = (byDay[t.date] || 0) + t.amount; });
  const top = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  const wd = [0, 0, 0, 0, 0, 0, 0]; exp.forEach((t) => { wd[pd(t.date).getDay()] += t.amount; });
  rows.push(['Promedio diario', fmt(spent / p.n)]);
  rows.push(['Día de mayor gasto', `${shortDay(pd(top[0]))} · ${fmt(top[1])}`]);
  rows.push(['Día de la semana más caro', DIAS[wd.indexOf(Math.max(...wd))]]);
  rows.push(['Movimientos de gasto', String(exp.length)]);
  if (income > 0) rows.push(['Tasa de ahorro', `${Math.round(((income - spent) / income) * 100)}% de tus ingresos`]);
  if (p.kind === 'month' && !p.full) {
    const t = today(); const dim = daysInMonth(t.getFullYear(), t.getMonth());
    rows.push(['Gasto proyectado al cierre', fmt((spent / p.n) * dim)]);
  }
  return rows;
}

/* ============ Vistas ============ */
const view = $('#view');

function render() {
  document.querySelectorAll('.tab').forEach((b) => { if (b.dataset.tab === ui.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  view.innerHTML = { home: homeView, list: listView, report: reportView, settings: settingsView }[ui.tab]();
  if (ui.first) { view.classList.add('enter'); ui.first = false; setTimeout(() => view.classList.remove('enter'), 900); }
}

function itemRow(t) {
  const isInc = t.type === 'income';
  const def = isInc ? INC[t.cat] : CATS[t.cat];
  return `<button class="item" data-action="edit" data-id="${t.id}">
    <span class="chip-ic ${isInc ? 'inc' : ''}">${icon(def?.i || 'dots')}</span>
    <span style="min-width:0"><div class="t">${esc(def?.n || t.cat)}</div>${t.note ? `<div class="s">${esc(t.note)}</div>` : ''}</span>
    <span class="a num ${isInc ? 'in' : ''}">${isInc ? '+' : '−'}${fmt(t.amount)}</span>
  </button>`;
}

function homeView() {
  const p = period('month', 0);
  const income = total(txIn(p.start, p.end, 'income'));
  const spent = total(txIn(p.start, p.end, 'expense'));
  const goal = Number(S.settings.goal) || 0;
  const t = today();
  const dim = daysInMonth(t.getFullYear(), t.getMonth());
  const daysLeft = dim - t.getDate() + 1;
  let headline, sub, over = false;
  if (income > 0) {
    const cap = income - goal;
    const left = cap - spent;
    if (left >= 0) {
      headline = `Te quedan <b class="num">${fmt(left)}</b> para gastar este mes`;
      sub = `Unos ${fmt(left / daysLeft)} por día durante ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}${goal > 0 ? ', sin tocar tu ahorro' : ''}.`;
    } else {
      over = true;
      headline = `Te pasaste por <b class="num">${fmt(-left)}</b> del tope de este mes`;
      sub = goal > 0 ? 'Ese exceso se descuenta de tu meta de ahorro.' : 'Estás gastando más de lo que ingresó este mes.';
    }
  } else {
    headline = `Este mes llevas gastado <b class="num">${fmt(spent)}</b>`;
    sub = 'Agrega tus ingresos para calcular cuánto puedes gastar.';
  }
  const saved = income - spent;
  const pct = goal > 0 ? Math.max(0, Math.min(100, (saved / goal) * 100)) : 0;
  const goalBlock = goal > 0
    ? `<div class="panel stack">
        <div class="goal-head"><span class="label">Ahorro del mes</span><span class="num"><strong>${fmt(Math.max(saved, 0))}</strong> <span class="muted">de ${fmt(goal)}</span></span></div>
        <div class="bar ${saved < 0 ? 'warn' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="Progreso de ahorro"><i style="--w:${pct}%"></i></div>
        <p class="help">${income === 0 ? 'Registra tus ingresos para medir tu avance.' : saved >= goal ? 'Meta cumplida este mes.' : saved < 0 ? 'Vas en negativo: gastaste más de lo que ingresó.' : `Faltan ${fmt(goal - saved)} para tu meta.`}</p>
      </div>`
    : `<div class="note">${icon('target')}<p>Define cuánto quieres ahorrar cada mes y te calculo cuánto puedes gastar por día.</p><button class="link go" data-action="tab" data-tab="settings">Definir meta</button></div>`;

  const hasToday = S.tx.some((x) => x.date === ymd(t));
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const nudges = [];
  if (ios && !standalone && !S.settings.hintDismissed) nudges.push(`<div class="note">${icon('share')}<p>Instala Bolsillo: toca <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>.</p><button class="x" data-action="dismiss-hint" aria-label="Cerrar">${icon('x', 'sm')}</button></div>`);
  if (!hasToday) nudges.push(`<div class="note">${icon('bell')}<p>Hoy no has registrado nada. ¿Gastaste o recibiste algo?</p><button class="link go" data-action="new">Registrar ahora</button></div>`);

  const recent = [...S.tx].sort((a, b) => (b.date + b.ts).localeCompare(a.date + a.ts)).slice(0, 5);
  const tips = S.tx.length ? insights(p) : [];
  const tip = tips[0];

  return `
    <div class="top"><h1>${esc(monthName(t))}</h1></div>
    <section class="lead"><p class="big ${over ? 'over' : ''}">${headline}</p><p class="sub">${sub}</p></section>
    ${goalBlock}
    <section class="panel"><div class="ledger num">
      <div><span class="muted">Ingresos del mes</span><span class="in">+${fmt(income)}</span></div>
      <div><span class="muted">Gastos del mes</span><span class="out">−${fmt(spent)}</span></div>
    </div></section>
    ${nudges.join('')}
    ${tip ? `<section class="tips"><div class="tip ${tip.tone}"><span class="chip-ic">${icon(tip.tone === 'warn' ? 'warn' : tip.tone === 'good' ? 'ok' : 'bulb')}</span><div><h3>${esc(tip.title)}</h3><p>${esc(tip.body)}</p></div></div><button class="link" style="justify-self:start" data-action="tab" data-tab="report">Ver reporte completo</button></section>` : ''}
    <section>
      <div class="section-head"><h2>Últimos movimientos</h2>${S.tx.length > 5 ? `<button class="link" data-action="tab" data-tab="list">Ver todo</button>` : ''}</div>
      ${recent.length ? `<div class="list">${recent.map(itemRow).join('')}</div>` : `<div class="empty"><p>Aún no hay movimientos. Registra tu primer gasto o ingreso.</p><button class="btn" data-action="new">${icon('plus', 'sm')}Agregar movimiento</button></div>`}
    </section>`;
}

function listView() {
  const p = period('month', ui.lOff);
  const mEnd = new Date(p.start.getFullYear(), p.start.getMonth() + 1, 0);
  let arr = txIn(p.start, mEnd).sort((a, b) => (b.date + b.ts).localeCompare(a.date + a.ts));
  const income = total(arr.filter((t) => t.type === 'income'));
  const spent = total(arr.filter((t) => t.type === 'expense'));
  if (ui.filter !== 'all') arr = arr.filter((t) => t.type === ui.filter);
  const groups = [];
  arr.forEach((t) => {
    const g = groups[groups.length - 1];
    if (g && g.date === t.date) g.items.push(t); else groups.push({ date: t.date, items: [t] });
  });
  const t0 = ymd(today()), t1 = ymd(addDays(today(), -1));
  const dayLabel = (d) => d === t0 ? 'Hoy' : d === t1 ? 'Ayer' : pd(d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' });
  return `
    <div class="top"><h1>Movimientos</h1></div>
    <div class="nav"><button data-action="l-prev" aria-label="Mes anterior">${icon('chev-l')}</button><span class="lbl">${esc(p.label)}</span><button data-action="l-next" aria-label="Mes siguiente" ${ui.lOff >= 0 ? 'disabled' : ''}>${icon('chev-r')}</button></div>
    <div class="panel"><div class="ledger num"><div><span class="muted">Ingresos</span><span class="in">+${fmt(income)}</span></div><div><span class="muted">Gastos</span><span class="out">−${fmt(spent)}</span></div></div></div>
    <div class="seg" role="group" aria-label="Filtrar">
      ${[['all', 'Todo'], ['expense', 'Gastos'], ['income', 'Ingresos']].map(([k, l]) => `<button data-action="filter" data-f="${k}" aria-pressed="${ui.filter === k}">${l}</button>`).join('')}
    </div>
    ${groups.length ? `<div>${groups.map((g) => `<div class="day">${esc(dayLabel(g.date))}</div><div class="list">${g.items.map(itemRow).join('')}</div>`).join('')}</div>` : `<div class="empty"><p>No hay movimientos en este mes.</p><button class="btn" data-action="new">${icon('plus', 'sm')}Agregar movimiento</button></div>`}`;
}

function reportView() {
  const p = period(ui.rKind, ui.rOff);
  const exp = txIn(p.start, p.end, 'expense');
  const inc = txIn(p.start, p.end, 'income');
  const prevExp = txIn(p.pStart, p.pEnd, 'expense');
  const spent = total(exp), income = total(inc), prevSpent = total(prevExp);
  const cats = byCat(exp), pCats = byCat(prevExp);
  const rows = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] || 1;
  const deltaTag = (v, pv) => {
    if (!pv) return '';
    const r = Math.round(((v - pv) / pv) * 100);
    if (r === 0) return '<span class="faint">sin cambio</span>';
    return `<span class="delta ${r > 0 ? 'up' : 'down'}">${icon(r > 0 ? 'up' : 'down')}${Math.abs(r)}%</span>`;
  };
  const tips = insights(p);
  return `
    <div class="top"><h1>Reporte</h1></div>
    <div class="seg" role="group" aria-label="Tipo de reporte">
      <button data-action="r-kind" data-k="week" aria-pressed="${ui.rKind === 'week'}">Semanal</button>
      <button data-action="r-kind" data-k="month" aria-pressed="${ui.rKind === 'month'}">Mensual</button>
    </div>
    <div class="nav"><button data-action="r-prev" aria-label="Periodo anterior">${icon('chev-l')}</button><span class="lbl">${esc(p.label)}</span><button data-action="r-next" aria-label="Periodo siguiente" ${ui.rOff >= 0 ? 'disabled' : ''}>${icon('chev-r')}</button></div>
    <div class="two"><button class="btn ghost sm" data-action="share-report">${icon('share', 'sm')}Compartir</button><button class="btn sm" data-action="download-report">${icon('download', 'sm')}Descargar</button></div>
    <section class="panel"><div class="ledger num">
      <div><span class="muted">Ingresos</span><span class="in">+${fmt(income)}</span></div>
      <div><span class="muted">Gastos ${prevSpent ? deltaTag(spent, prevSpent) : ''}</span><span class="out">−${fmt(spent)}</span></div>
      <div><span class="muted">Balance</span><span class="${income - spent >= 0 ? 'in' : 'out'}">${income - spent >= 0 ? '+' : '−'}${fmt(Math.abs(income - spent))}</span></div>
    </div>${prevSpent ? `<p class="help" style="margin-top:8px">Comparado con el ${p.kind === 'month' ? 'mismo punto del mes anterior' : 'mismo punto de la semana anterior'} (${fmt(prevSpent)}).</p>` : ''}</section>
    ${stats(p).length ? `<section><div class="section-head"><h2>Tus números</h2></div><div class="panel"><div class="ledger">${stats(p).map(([k, v]) => `<div><span class="muted">${k}</span><span class="num" style="font-weight:600;text-align:right">${esc(v)}</span></div>`).join('')}</div></div></section>` : ''}
    <section>
      <div class="section-head"><h2>Recomendaciones</h2></div>
      <div class="tips">${tips.map((t) => `<div class="tip ${t.tone}"><span class="chip-ic">${icon(t.tone === 'warn' ? 'warn' : t.tone === 'good' ? 'ok' : 'bulb')}</span><div><h3>${esc(t.title)}</h3><p>${esc(t.body)}</p></div></div>`).join('')}</div>
    </section>
    <section>
      <div class="section-head"><h2>En qué se fue</h2></div>
      ${rows.length ? `<div class="panel" style="padding-block:6px">${rows.map(([c, v]) => `
        <div class="cat"><span class="chip-ic">${icon(CATS[c]?.i || 'dots')}</span><span class="name">${esc(CATS[c]?.n || c)}</span><span class="val num">${fmt(v)}</span>
          <div class="bar"><i style="--w:${(v / max) * 100}%"></i></div>
          <div class="meta num"><span>${Math.round((v / spent) * 100)}% del gasto</span>${deltaTag(v, pCats[c])}</div></div>`).join('')}</div>` : `<div class="empty"><p>Sin gastos en este periodo.</p></div>`}
    </section>`;
}

function settingsView() {
  const s = S.settings;
  return `
    <div class="top"><h1>Ajustes</h1></div>
    <section class="panel group">
      <div class="field"><label for="goal">Meta de ahorro mensual</label>
        <input class="input num" id="goal" inputmode="decimal" autocomplete="off" placeholder="0" value="${s.goal ? esc(fmtPlain(s.goal)) : ''}" data-change="goal">
        <p class="help">Lo que quieres guardar cada mes. Con tus ingresos, calculo cuánto puedes gastar por día.</p></div>
      <div class="field"><label for="cur">Moneda</label>
        <select class="input" id="cur" data-change="currency">${Object.keys(LOCALES).map((c) => `<option value="${c}" ${c === s.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    </section>

    <section class="panel group">
      <div><h2>Recordatorios al celular y al correo</h2>
      <p class="muted" style="margin-top:6px">Te avisamos a diario para registrar tus gastos, cada domingo para ver tu reporte semanal y el día 1 para el mensual. Es gratis y funciona con la app cerrada.</p></div>
      <div class="field"><span class="label">Tu código privado de recordatorios</span>
        ${s.topic ? `<div class="code"><code id="topic">${esc(s.topic)}</code><button class="btn ghost sm" data-action="copy-topic" aria-label="Copiar código">${icon('copy', 'sm')}</button></div>`
          : `<button class="btn ghost" data-action="gen-topic">Generar mi código</button>`}
      </div>
      ${s.topic ? `<ol class="steps">
        <li>Instala la app gratuita <b>ntfy</b> en tu iPhone y toca <b>+</b> para suscribirte al código de arriba.</li>
        <li>En tu repositorio de GitHub, ve a <b>Settings → Secrets and variables → Actions</b> y crea <b>NTFY_TOPIC</b> con ese código.</li>
        <li>Para recibir también correo, crea <b>NOTIFY_EMAIL</b> con tu dirección.</li>
      </ol>
      <div class="two"><button class="btn ghost sm" data-action="test-topic">${icon('bell', 'sm')}Probar</button><button class="btn ghost sm" data-action="gen-topic">Generar otro</button></div>
      <p class="help" id="test-msg" aria-live="polite"></p>` : ''}
    </section>

    <section class="panel group">
      <h2>Tus datos</h2>
      <p class="muted">Todo se guarda solo en este dispositivo. Haz una copia de vez en cuando.</p>
      <div class="two"><button class="btn ghost sm" data-action="export">${icon('download', 'sm')}Exportar</button><label class="btn ghost sm" style="cursor:pointer">${icon('upload', 'sm')}Importar<input type="file" accept="application/json" hidden data-change="import"></label></div>
      <button class="btn danger sm" data-action="wipe">${icon('trash', 'sm')}Borrar todos los datos</button>
    </section>
    <p class="help" style="text-align:center">Bolsillo · funciona sin conexión</p>`;
}

/* ============ Informe descargable ============ */
function reportHtml(p) {
  const exp = txIn(p.start, p.end, 'expense'), inc = txIn(p.start, p.end, 'income');
  const spent = total(exp), income = total(inc), cats = byCat(exp);
  const rows = Object.entries(cats).sort((a, b) => b[1] - a[1]); const max = rows[0]?.[1] || 1;
  const kind = p.kind === 'month' ? 'mensual' : 'semanal';
  const tone = { warn: '#B4400E', good: '#0E6B4D', info: '#4B5851' };
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informe ${kind} · ${esc(p.label)}</title>
<style>body{margin:0;background:#F4F1E8;color:#14201A;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}main{max-width:640px;margin:0 auto;padding:32px 20px 48px}h1{font-size:28px;line-height:1.15;margin:0 0 4px;letter-spacing:-.02em}h2{font-size:18px;margin:32px 0 10px}.sub{color:#4B5851;margin:0 0 24px}.card{background:#fff;border-radius:16px;padding:6px 18px}.r{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-top:1px solid #E6E1D2}.r:first-child{border-top:0}.in{color:#0E6B4D;font-weight:600}.tip{background:#fff;border-radius:16px;padding:14px 18px;margin-bottom:10px}.tip b{display:block;margin-bottom:2px}.tip span{color:#4B5851;font-size:15px}.bar{height:7px;border-radius:9px;background:#ECE8DC;margin:6px 0 2px}.bar i{display:block;height:100%;border-radius:9px;background:#0E6B4D}.foot{margin-top:36px;color:#6E7A73;font-size:13px}@media print{body{background:#fff}.card,.tip{border:1px solid #ddd}}</style></head><body><main>
<h1>Informe ${kind}</h1><p class="sub">${esc(p.label)}</p>
<div class="card"><div class="r"><span>Ingresos</span><span class="in">+${esc(fmt(income))}</span></div><div class="r"><span>Gastos</span><b>−${esc(fmt(spent))}</b></div><div class="r"><span>Balance</span><b>${income - spent >= 0 ? '+' : '−'}${esc(fmt(Math.abs(income - spent)))}</b></div></div>
${stats(p).length ? `<h2>Tus números</h2><div class="card">${stats(p).map(([k, v]) => `<div class="r"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
<h2>Recomendaciones</h2>${insights(p).map((t) => `<div class="tip"><b style="color:${tone[t.tone]}">${esc(t.title)}</b><span>${esc(t.body)}</span></div>`).join('')}
<h2>En qué se fue</h2><div class="card">${rows.map(([c, v]) => `<div style="padding:11px 0;border-top:1px solid #E6E1D2"><div style="display:flex;justify-content:space-between"><span>${esc(CATS[c]?.n || c)}</span><b>${esc(fmt(v))}</b></div><div class="bar"><i style="width:${(v / max) * 100}%"></i></div><small style="color:#6E7A73">${Math.round((v / spent) * 100)}% del gasto</small></div>`).join('') || '<div class="r">Sin gastos en este periodo.</div>'}</div>
<p class="foot">Generado con Bolsillo el ${esc(new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }))}. Para guardarlo como PDF, ábrelo en Safari y usa Compartir → Imprimir.</p></main></body></html>`;
}

/* ============ Hoja de captura ============ */
const sheet = $('#sheet'), scrim = $('#scrim'), body = $('#sheet-body');
let draft = null, lastFocus = null;

function openSheet(id) {
  lastFocus = document.activeElement;
  const ex = id && S.tx.find((t) => t.id === id);
  draft = ex ? { ...ex, amount: String(ex.amount).replace('.', ZERO_DEC.has(cur()) ? '' : ',') } : { id: null, type: 'expense', cat: 'comida', amount: '', note: '', date: ymd(today()) };
  renderSheet();
  sheet.hidden = false; scrim.hidden = false;
  sheet.scrollTop = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    sheet.setAttribute('data-open', ''); scrim.setAttribute('data-open', '');
    $('#f-amount')?.focus({ preventScroll: true });
  }));
  $('#app').inert = true;
}
function closeSheet() {
  sheet.removeAttribute('data-open'); scrim.removeAttribute('data-open');
  sheet.style.transform = '';
  $('#app').inert = false;
  setTimeout(() => { if (!sheet.hasAttribute('data-open')) { sheet.hidden = true; scrim.hidden = true; } }, 360);
  lastFocus?.focus?.({ preventScroll: true });
}
function renderSheet() {
  const d = draft, isExp = d.type === 'expense';
  const defs = isExp ? CATS : INC;
  if (!defs[d.cat]) d.cat = Object.keys(defs)[0];
  body.innerHTML = `
    <div class="sheet-head"><h2 id="sheet-title">${d.id ? 'Editar movimiento' : 'Nuevo movimiento'}</h2><button class="nav-x" data-action="close-sheet" aria-label="Cerrar" style="width:44px;height:44px;display:grid;place-items:center;border-radius:12px;background:var(--surface-2)">${icon('x')}</button></div>
    <div class="seg" role="group" aria-label="Tipo"><button data-action="type" data-t="expense" aria-pressed="${isExp}">Gasto</button><button data-action="type" data-t="income" aria-pressed="${!isExp}">Ingreso</button></div>
    <div class="amount"><input id="f-amount" class="num" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(d.amount)}" aria-label="Monto"></div>
    <div class="cats" role="group" aria-label="Categoría">${Object.entries(defs).map(([k, v]) => `<button data-action="cat" data-c="${k}" aria-pressed="${d.cat === k}">${icon(v.i)}<span>${v.n}</span></button>`).join('')}</div>
    <div class="two">
      <div class="field"><label for="f-date">Fecha</label><input class="input" id="f-date" type="date" value="${d.date}" max="${ymd(addDays(today(), 1))}"></div>
      <div class="field"><label for="f-note">Nota (opcional)</label><input class="input" id="f-note" maxlength="60" autocomplete="off" placeholder="Ej. almuerzo" value="${esc(d.note)}"></div>
    </div>
    <p class="err" id="f-err" role="alert"></p>
    <div class="two" style="${d.id ? '' : 'grid-template-columns:1fr'}">
      ${d.id ? `<button class="btn danger" data-action="delete">${icon('trash', 'sm')}Eliminar</button>` : ''}
      <button class="btn" data-action="save">${d.id ? 'Guardar cambios' : isExp ? 'Agregar gasto' : 'Agregar ingreso'}</button>
    </div>`;
}
function saveDraft() {
  const amt = parseAmount($('#f-amount').value);
  const date = $('#f-date').value || ymd(today());
  const note = $('#f-note').value.trim();
  if (!(amt > 0)) { $('#f-err').textContent = 'Escribe un monto mayor a cero.'; $('#f-amount').focus(); return; }
  const rec = { id: draft.id || uid(), type: draft.type, cat: draft.cat, amount: amt, note, date, ts: draft.ts || Date.now() };
  if (draft.id) S.tx = S.tx.map((t) => (t.id === draft.id ? rec : t)); else S.tx.push(rec);
  save(); closeSheet(); render();
  toast(draft.id ? 'Cambios guardados' : rec.type === 'income' ? 'Ingreso agregado' : 'Gasto agregado', draft.id ? null : () => { S.tx = S.tx.filter((t) => t.id !== rec.id); save(); render(); });
}

/* Arrastrar para cerrar (con velocidad y fricción) */
(() => {
  const grab = $('#sheet-grab');
  let y0 = 0, t0 = 0, dy = 0, drag = false;
  grab.addEventListener('pointerdown', (e) => {
    if (drag) return; drag = true; y0 = e.clientY; t0 = performance.now(); dy = 0;
    grab.setPointerCapture(e.pointerId); sheet.classList.add('dragging');
  });
  grab.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const raw = e.clientY - y0;
    dy = raw < 0 ? raw / (1 + Math.abs(raw) / 40) : raw; // fricción hacia arriba
    sheet.style.transform = `translate(-50%, ${dy}px)`;
  });
  const end = () => {
    if (!drag) return; drag = false; sheet.classList.remove('dragging');
    const v = Math.abs(dy) / Math.max(performance.now() - t0, 1);
    if (dy > 120 || (dy > 20 && v > 0.11)) closeSheet(); else sheet.style.transform = '';
  };
  grab.addEventListener('pointerup', end); grab.addEventListener('pointercancel', end);
})();

/* ============ Toast ============ */
let toastT;
function toast(msg, undo) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button data-action="undo">Deshacer</button>' : ''}`;
  el.hidden = false; el._undo = undo;
  requestAnimationFrame(() => requestAnimationFrame(() => el.setAttribute('data-open', '')));
  clearTimeout(toastT);
  toastT = setTimeout(() => { el.removeAttribute('data-open'); setTimeout(() => { if (!el.hasAttribute('data-open')) el.hidden = true; }, 320); }, 4500);
}

/* ============ Acciones ============ */
const actions = {
  tab: (el) => { ui.tab = el.dataset.tab; render(); window.scrollTo(0, 0); },
  new: () => openSheet(),
  edit: (el) => openSheet(el.dataset.id),
  'close-sheet': closeSheet,
  type: (el) => { syncDraft(); draft.type = el.dataset.t; renderSheet(); },
  cat: (el) => { syncDraft(); draft.cat = el.dataset.c; renderSheet(); $('#f-amount').focus({ preventScroll: true }); },
  save: saveDraft,
  delete: () => {
    const gone = S.tx.find((t) => t.id === draft.id);
    S.tx = S.tx.filter((t) => t.id !== draft.id); save(); closeSheet(); render();
    toast('Movimiento eliminado', () => { S.tx.push(gone); save(); render(); });
  },
  undo: () => { const u = $('#toast')._undo; if (u) u(); $('#toast').removeAttribute('data-open'); },
  filter: (el) => { ui.filter = el.dataset.f; render(); },
  'l-prev': () => { ui.lOff--; render(); },
  'l-next': () => { if (ui.lOff < 0) ui.lOff++; render(); },
  'r-kind': (el) => { ui.rKind = el.dataset.k; ui.rOff = 0; render(); },
  'r-prev': () => { ui.rOff--; render(); },
  'r-next': () => { if (ui.rOff < 0) ui.rOff++; render(); },
  'dismiss-hint': () => { S.settings.hintDismissed = true; save(); render(); },
  'gen-topic': () => {
    const a = new Uint8Array(10); crypto.getRandomValues(a);
    S.settings.topic = 'bolsillo-' + [...a].map((b) => (b % 36).toString(36)).join('');
    save(); render();
  },
  'copy-topic': async (el) => {
    try { await navigator.clipboard.writeText(S.settings.topic); toast('Código copiado'); } catch (e) { toast('No se pudo copiar'); }
  },
  'test-topic': async () => {
    const m = $('#test-msg'); m.textContent = 'Enviando…';
    try {
      const r = await fetch('https://ntfy.sh/' + encodeURIComponent(S.settings.topic), { method: 'POST', body: 'Prueba de Bolsillo: los recordatorios funcionan.', headers: { Title: 'Bolsillo' } });
      m.textContent = r.ok ? 'Enviada. Debería llegarte a la app ntfy en unos segundos.' : 'No se pudo enviar. Intenta de nuevo.';
    } catch (e) { m.textContent = 'Sin conexión. Intenta de nuevo cuando tengas internet.'; }
  },
  export: async () => {
    const json = JSON.stringify(S, null, 2);
    const file = new File([json], `bolsillo-${ymd(today())}.json`, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Copia de Bolsillo' }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  },
  wipe: () => {
    if (confirm('¿Borrar todos tus movimientos y ajustes? Esta acción no se puede deshacer.')) { S = defState(); save(); render(); toast('Datos borrados'); }
  },
  'download-report': async () => {
    const p = period(ui.rKind, ui.rOff);
    const name = `bolsillo-informe-${ui.rKind === 'month' ? 'mensual' : 'semanal'}-${ymd(p.start)}.html`;
    const file = new File([reportHtml(p)], name, { type: 'text/html' });
    try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Informe Bolsillo' }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Informe descargado');
  },
  'share-report': async () => {
    const p = period(ui.rKind, ui.rOff);
    const exp = txIn(p.start, p.end, 'expense'), inc = txIn(p.start, p.end, 'income');
    const lines = [`Reporte ${ui.rKind === 'month' ? 'mensual' : 'semanal'} · ${p.label}`, `Ingresos: ${fmt(total(inc))}`, `Gastos: ${fmt(total(exp))}`, `Balance: ${fmt(total(inc) - total(exp))}`, '', ...insights(p).map((t) => `• ${t.title}. ${t.body}`)];
    const text = lines.join('\n');
    try { if (navigator.share) { await navigator.share({ title: 'Reporte Bolsillo', text }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('Reporte copiado'); } catch (e) { toast('No se pudo compartir'); }
  },
};
function syncDraft() {
  if (!draft) return;
  const a = $('#f-amount'), d = $('#f-date'), n = $('#f-note');
  if (a) draft.amount = a.value; if (d) draft.date = d.value; if (n) draft.note = n.value;
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (el && actions[el.dataset.action]) actions[el.dataset.action](el);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]'); if (!el) return;
  const k = el.dataset.change;
  if (k === 'goal') { S.settings.goal = parseAmount(el.value); save(); render(); toast(S.settings.goal ? 'Meta de ahorro guardada' : 'Meta eliminada'); }
  if (k === 'currency') { S.settings.currency = el.value; save(); render(); }
  if (k === 'import') {
    const f = el.files[0]; if (!f) return;
    f.text().then((t) => {
      const r = JSON.parse(t);
      if (!r || !Array.isArray(r.tx)) throw new Error();
      S = { tx: r.tx, settings: { ...defState().settings, ...r.settings } }; save(); render(); toast('Datos importados');
    }).catch(() => toast('Archivo no válido'));
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheet.hasAttribute('data-open')) closeSheet();
  if (e.key === 'Enter' && sheet.hasAttribute('data-open') && e.target.matches('#f-amount,#f-note')) { e.preventDefault(); saveDraft(); }
});

/* ============ Arranque ============ */
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
