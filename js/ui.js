// UI rendering
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let toastTimer = null;
function showToast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

// ====== Log Page ======
async function renderLogPage(dateStr) {
  $('#log-date').value = dateStr;
  const entries = await getEntriesByDate(dateStr);
  const summary = calcDailySummary(entries);

  // Summary card
  $('#sum-kcal').textContent = summary.energy_kcal;
  $('#sum-protein').textContent = summary.protein_g;
  $('#sum-fat').textContent = summary.fat_g;
  $('#sum-carbs').textContent = summary.carbs_g;
  $('#sum-fiber').textContent = summary.fiber_g || 0;
  $('#sum-sodium').textContent = summary.sodium_mg;

  // Progress bars
  const p = getProfileData();
  const rec = p.macros;
  const refProtein = rec.protein_g || 60;
  const refFat = rec.fat_g || 60;
  const refCarbs = rec.carbs_g || 300;
  const refFiber = rec.fiber_g || 25;
  const refSodium = 2000;

  $('#bar-protein').style.width = Math.min(100, Math.round(summary.protein_g / refProtein * 100)) + '%';
  $('#bar-fat').style.width = Math.min(100, Math.round(summary.fat_g / refFat * 100)) + '%';
  $('#bar-carbs').style.width = Math.min(100, Math.round(summary.carbs_g / refCarbs * 100)) + '%';
  $('#bar-fiber').style.width = Math.min(100, Math.round((summary.fiber_g || 0) / refFiber * 100)) + '%';
  $('#bar-sodium').style.width = Math.min(100, Math.round(summary.sodium_mg / refSodium * 100)) + '%';

  // NRV tags
  setNRVTag('protein', summary.protein_g);
  setNRVTag('fat', summary.fat_g);
  setNRVTag('carbs', summary.carbs_g);
  setNRVTag('fiber', summary.fiber_g || 0);
  setNRVTag('sodium', summary.sodium_mg);

  // Deficit card
  await renderDeficitCard(dateStr, summary.energy_kcal);

  // Food list
  const listEl = $('#food-list');
  if (entries.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><span class="empty-icon">🍽️</span><p>还没有记录，去「添加」页拍照或手动输入吧</p></div>`;
    return;
  }

  listEl.innerHTML = entries
    .sort((a, b) => b.datetime.localeCompare(a.datetime))
    .map(entry => {
      const kcal = entry.actualIntake?.energy_kj ? Math.round(entry.actualIntake.energy_kj * KJ_TO_KCAL) : 0;
      const thumbHtml = entry.thumbnail
        ? `<img class="food-item-thumb" src="${entry.thumbnail}" alt="">`
        : `<div class="food-item-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;">🍔</div>`;
      return `
      <div class="food-item" data-id="${entry.id}">
        ${thumbHtml}
        <div class="food-item-info">
          <div class="food-item-name">${escapeHtml(entry.name || '未命名食品')}</div>
          <div class="food-item-meta">
            ${entry.weight_g}g · 蛋白 ${entry.actualIntake?.protein_g || 0}g · 脂肪 ${entry.actualIntake?.fat_g || 0}g · 碳水 ${entry.actualIntake?.carbs_g || 0}g
          </div>
        </div>
        <div class="food-item-calories">
          <strong>${kcal}</strong>
          <span>kcal</span>
        </div>
        <button class="food-item-delete" data-delete="${entry.id}">✕</button>
      </div>`;
    }).join('');

  listEl.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteEntry(btn.dataset.delete);
      await renderLogPage(dateStr);
      showToast('已删除');
    });
  });
}

function setNRVTag(key, value) {
  const el = $('#nrv-' + key);
  if (!el) return;
  const nrv = calcNRV(value, key + '_g');
  if (nrv != null && value > 0) {
    el.textContent = nrv + '% NRV';
  } else {
    el.textContent = '';
  }
}

async function renderDeficitCard(dateStr, intakeKcal) {
  const p = getProfileData();
  const bmr = p.bmr || 0;
  const tdee = p.tdee || 0;
  const exerciseKcal = await getExercise(dateStr);

  $('#def-bmr').textContent = bmr || '--';
  $('#def-tdee').textContent = (tdee + exerciseKcal) || '--';
  $('#def-intake').textContent = intakeKcal;

  const input = $('#exercise-input');
  input.value = exerciseKcal || '';
  // Remove old listener by cloning
  const newInput = input.cloneNode(true);
  input.parentNode.replaceChild(newInput, input);
  newInput.addEventListener('change', async () => {
    const val = parseFloat(newInput.value) || 0;
    await saveExercise(dateStr, val);
    await renderLogPage(dateStr);
  });

  if (bmr > 0) {
    const totalOut = tdee + exerciseKcal;
    const gap = intakeKcal - totalOut;
    $('#def-gap').textContent = Math.abs(gap);
    $('#def-gap').className = gap > 0 ? 'surplus' : '';
    $('#def-label').textContent = gap > 0 ? '(盈余)' : gap < 0 ? '(缺口)' : '(平衡)';
  } else {
    $('#def-gap').textContent = '--';
    $('#def-label').textContent = '需设置身体参数';
  }
}

// ====== Stats Page ======
let currentChartType = 'bar';
let currentStatsData = null;

async function renderStatsPage(days) {
  const fromDate = getDateDaysAgo(days - 1);
  const toDate = formatDate(new Date());
  const entries = await getEntriesByDateRange(fromDate, toDate);

  const byDate = {};
  for (const e of entries) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }

  const allDates = [];
  for (let i = days - 1; i >= 0; i--) allDates.push(getDateDaysAgo(i));

  currentStatsData = { dates: allDates, byDate };
  renderChart(allDates, byDate, currentChartType);

  const avg = calcAverages(byDate);
  if (avg) {
    $('#avg-kcal').textContent = avg.energy_kcal;
    $('#avg-protein').textContent = avg.protein_g;
    $('#avg-fat').textContent = avg.fat_g;
    $('#avg-carbs').textContent = avg.carbs_g;
  }
}

function renderChart(dates, byDate, type) {
  const dailyKcal = dates.map(d => {
    if (byDate[d]) return calcDailySummary(byDate[d]).energy_kcal;
    return 0;
  });

  const hasData = dailyKcal.some(v => v > 0);
  if (!hasData) {
    $('#chart-calories').innerHTML = '<div class="empty-state small"><p>数据不足</p></div>';
    return;
  }

  if (type === 'line') {
    renderLineChart(dates, dailyKcal);
  } else {
    renderBarChart(dates, dailyKcal);
  }
}

function renderBarChart(dates, dailyKcal) {
  const maxKcal = Math.max(...dailyKcal, 2000);
  $('#chart-calories').innerHTML = `
    <div class="chart-bars">
      ${dailyKcal.map((kcal, i) => {
        const h = Math.max(2, (kcal / maxKcal) * 160);
        return `
        <div class="chart-bar-wrapper">
          <div class="chart-bar" style="height:${h}px">
            ${kcal > 0 ? `<span class="chart-bar-value">${kcal}</span>` : ''}
          </div>
          <span class="chart-bar-label">${dates[i].slice(5)}</span>
        </div>`;
      }).join('')}
    </div>`;
}

function renderLineChart(dates, dailyKcal) {
  const maxKcal = Math.max(...dailyKcal, 2000);
  const pad = 20, w = 100, h = 180, r = 3;
  const n = dailyKcal.length;
  const xs = dailyKcal.map((_, i) => pad + (i / Math.max(1, n - 1)) * (w - 2 * pad));

  const points = dailyKcal.map((kcal, i) => {
    const y = h - pad - (kcal / maxKcal) * (h - 2 * pad);
    return `${xs[i]},${y}`;
  }).join(' ');

  const yGrid = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const y = h - pad - f * (h - 2 * pad);
    const val = Math.round(f * maxKcal);
    return `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" class="grid-line"/><text x="${pad - 4}" y="${y + 3}" class="data-label" text-anchor="end">${val}</text>`;
  }).join('');

  // Data points
  const circles = dailyKcal.map((kcal, i) => {
    const y = h - pad - (kcal / maxKcal) * (h - 2 * pad);
    if (kcal === 0) return '';
    return `<circle cx="${xs[i]}" cy="${y}" r="${r}" class="data-point"/>`;
  }).join('');

  // Labels
  const labels = dates.map((d, i) =>
    `<text x="${xs[i]}" y="${h - 2}" class="axis-label">${d.slice(5)}</text>`
  ).join('');

  $('#chart-calories').innerHTML = `
    <svg class="chart-line-svg" viewBox="0 0 ${w + pad} ${h}" preserveAspectRatio="xMidYMid meet">
      ${yGrid}
      <polyline points="${points}" class="data-line"/>
      ${circles}
      ${labels}
    </svg>`;
}

// ====== Profile Page ======
function renderProfilePage() {
  const p = getProfile();
  $('#pf-height').value = p.height_cm;
  $('#pf-weight').value = p.weight_kg;
  $('#pf-age').value = p.age;
  $('#pf-activity').value = p.activity_level;

  // Gender buttons
  $$('.gender-btn').forEach(b => {
    b.classList.toggle('btn-active', b.dataset.gender === p.gender);
    b.classList.toggle('btn-outline', b.dataset.gender !== p.gender);
  });

  // Goal buttons
  $$('.goal-btn').forEach(b => {
    b.classList.toggle('btn-active', b.dataset.goal === p.goal);
    b.classList.toggle('btn-outline', b.dataset.goal !== p.goal);
  });

  updateProfileResults();
}

function updateProfileResults() {
  const p = getProfileData();
  $('#rec-bmi').textContent = p.bmi;
  $('#rec-weight-range').textContent = p.idealRange.min + ' - ' + p.idealRange.max + ' kg';
  $('#rec-bmr').textContent = p.bmr;
  $('#rec-tdee').textContent = p.tdee;
  $('#rec-goal-kcal').textContent = p.goalCalories;
  $('#rec-protein').textContent = p.macros.protein_g;
  $('#rec-fat').textContent = p.macros.fat_g;
  $('#rec-carbs').textContent = p.macros.carbs_g;
  $('#rec-fiber').textContent = p.macros.fiber_g;

  // BMI tag
  const tag = $('#rec-bmi-tag');
  tag.textContent = p.bmiCategory;
  tag.className = 'rec-tag';
  if (p.bmiCategory === '偏瘦') tag.classList.add('underweight');
  else if (p.bmiCategory === '正常') tag.classList.add('normal');
  else tag.classList.add('overweight');
}

// ====== Estimated Intake ======
function updateEstimatedIntake() {
  const energy = parseFloat($('#nf-energy').value) || 0;
  const protein = parseFloat($('#nf-protein').value) || 0;
  const fat = parseFloat($('#nf-fat').value) || 0;
  const carbs = parseFloat($('#nf-carbs').value) || 0;
  const fiber = parseFloat($('#nf-fiber').value) || 0;
  const sodium = parseFloat($('#nf-sodium').value) || 0;
  const weight = parseFloat($('#food-weight').value) || 0;

  const per100g = { energy_kj: energy, protein_g: protein, fat_g: fat, carbs_g: carbs, fiber_g: fiber, sodium_mg: sodium };
  const intake = calcIntake(per100g, weight);

  $('#est-kcal').textContent = calcKcal(intake.energy_kj) || 0;
  $('#est-protein').textContent = intake.protein_g || 0;
  $('#est-fat').textContent = intake.fat_g || 0;
  $('#est-carbs').textContent = intake.carbs_g || 0;
  $('#est-fiber').textContent = intake.fiber_g || 0;
  $('#est-sodium').textContent = intake.sodium_mg || 0;

  const kcal = calcKcal(energy);
  $('#nf-kcal').textContent = (kcal != null && energy > 0) ? `≈ ${kcal} kcal` : '';
}

function bindIntakePreview() {
  ['#nf-energy', '#nf-protein', '#nf-fat', '#nf-carbs', '#nf-fiber', '#nf-sodium', '#food-weight'].forEach(sel => {
    $(sel)?.addEventListener('input', updateEstimatedIntake);
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
