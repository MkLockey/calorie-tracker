// UI rendering functions

// Cache DOM refs
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ====== Toast ======
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
  const hasEntries = entries.length > 0;

  // Update summary card
  $('#sum-kcal').textContent = summary.energy_kcal;
  $('#sum-protein').textContent = summary.protein_g;
  $('#sum-fat').textContent = summary.fat_g;
  $('#sum-carbs').textContent = summary.carbs_g;
  $('#sum-sodium').textContent = summary.sodium_mg;

  // Progress bars
  $('#bar-protein').style.width = getProgressPercent(summary.protein_g, 'protein_g') + '%';
  $('#bar-fat').style.width = getProgressPercent(summary.fat_g, 'fat_g') + '%';
  $('#bar-carbs').style.width = getProgressPercent(summary.carbs_g, 'carbs_g') + '%';
  $('#bar-sodium').style.width = getProgressPercent(summary.sodium_mg, 'sodium_mg') + '%';

  // Food list
  const listEl = $('#food-list');
  if (!hasEntries) {
    listEl.innerHTML = `<div class="empty-state">
      <span class="empty-icon">🍽️</span>
      <p>还没有记录，去「添加」页拍照或手动输入吧</p>
    </div>`;
    return;
  }

  listEl.innerHTML = entries
    .sort((a, b) => b.datetime.localeCompare(a.datetime))
    .map(entry => {
      const kcal = entry.actualIntake?.energy_kj
        ? Math.round(entry.actualIntake.energy_kj * KJ_TO_KCAL)
        : 0;
      const thumbHtml = entry.thumbnail
        ? `<img class="food-item-thumb" src="${entry.thumbnail}" alt="">`
        : `<div class="food-item-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;">🍔</div>`;

      return `
      <div class="food-item" data-id="${entry.id}">
        ${thumbHtml}
        <div class="food-item-info">
          <div class="food-item-name">${escapeHtml(entry.name || '未命名食品')}</div>
          <div class="food-item-meta">
            ${entry.weight_g}g ·
            蛋白 ${entry.actualIntake?.protein_g || 0}g ·
            脂肪 ${entry.actualIntake?.fat_g || 0}g ·
            碳水 ${entry.actualIntake?.carbs_g || 0}g
          </div>
        </div>
        <div class="food-item-calories">
          <strong>${kcal}</strong>
          <span>kcal</span>
        </div>
        <button class="food-item-delete" data-delete="${entry.id}">✕</button>
      </div>`;
    }).join('');

  // Bind delete buttons
  listEl.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.delete;
      await deleteEntry(id);
      await renderLogPage(dateStr);
      showToast('已删除');
    });
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ====== Stats Page ======
async function renderStatsPage(days) {
  // Group entries by date
  const fromDate = getDateDaysAgo(days - 1);
  const toDate = formatDate(new Date());
  const entries = await getEntriesByDateRange(fromDate, toDate);

  const byDate = {};
  for (const e of entries) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }

  // Fill in all dates
  const allDates = [];
  for (let i = days - 1; i >= 0; i--) {
    allDates.push(getDateDaysAgo(i));
  }

  // Render calorie chart
  renderCalorieChart(allDates, byDate);

  // Render averages
  const avg = calcAverages(byDate);
  if (avg) {
    $('#avg-kcal').textContent = avg.energy_kcal;
    $('#avg-protein').textContent = avg.protein_g;
    $('#avg-fat').textContent = avg.fat_g;
    $('#avg-carbs').textContent = avg.carbs_g;
  } else {
    $$('.stat-value').forEach(el => el.textContent = '--');
  }
}

function renderCalorieChart(dates, byDate) {
  const container = $('#chart-calories');
  const dailyKcal = dates.map(d => {
    if (byDate[d]) {
      const s = calcDailySummary(byDate[d]);
      return s.energy_kcal;
    }
    return 0;
  });

  const maxKcal = Math.max(...dailyKcal, 2000);
  const hasData = dailyKcal.some(v => v > 0);

  if (!hasData) {
    container.innerHTML = '<div class="empty-state small"><p>数据不足，多记录几天再来看吧</p></div>';
    return;
  }

  container.innerHTML = `
    <div class="chart-bars">
      ${dailyKcal.map((kcal, i) => {
        const h = Math.max(2, (kcal / maxKcal) * 160);
        const label = dates[i].slice(5); // MM-DD
        return `
        <div class="chart-bar-wrapper">
          <div class="chart-bar" style="height:${h}px">
            ${kcal > 0 ? `<span class="chart-bar-value">${kcal}</span>` : ''}
          </div>
          <span class="chart-bar-label">${label}</span>
        </div>`;
      }).join('')}
    </div>`;
}

// ====== Estimated Intake Preview ======
function updateEstimatedIntake() {
  const energy = parseFloat($('#nf-energy').value) || 0;
  const protein = parseFloat($('#nf-protein').value) || 0;
  const fat = parseFloat($('#nf-fat').value) || 0;
  const carbs = parseFloat($('#nf-carbs').value) || 0;
  const sodium = parseFloat($('#nf-sodium').value) || 0;
  const weight = parseFloat($('#food-weight').value) || 0;

  const per100g = {
    energy_kj: energy,
    protein_g: protein,
    fat_g: fat,
    carbs_g: carbs,
    sodium_mg: sodium,
  };
  const intake = calcIntake(per100g, weight);

  $('#est-kcal').textContent = calcKcal(intake.energy_kj) || 0;
  $('#est-protein').textContent = intake.protein_g || 0;
  $('#est-fat').textContent = intake.fat_g || 0;
  $('#est-carbs').textContent = intake.carbs_g || 0;
  $('#est-sodium').textContent = intake.sodium_mg || 0;

  // Live kcal display
  const kcal = calcKcal(energy);
  if (kcal != null && energy > 0) {
    $('#nf-kcal').textContent = `≈ ${kcal} kcal`;
  } else {
    $('#nf-kcal').textContent = '';
  }
}

// Bind live preview
function bindIntakePreview() {
  ['#nf-energy', '#nf-protein', '#nf-fat', '#nf-carbs', '#nf-sodium', '#food-weight'].forEach(sel => {
    $(sel)?.addEventListener('input', updateEstimatedIntake);
  });
}
