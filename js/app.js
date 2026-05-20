// Main app controller
let currentPage = 'log';
let currentDate = formatDate(new Date());
let currentImageDataUrl = null;
let currentMeal = 'breakfast';

// ====== Theme ======
function initTheme() {
  const stored = localStorage.getItem('theme');
  document.documentElement.dataset.theme = (stored === 'light') ? 'light' : 'dark';
  updateThemeColor();
}

function toggleTheme() {
  const toggle = document.getElementById('theme-toggle');
  const next = toggle && toggle.checked ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  updateThemeColor();
}

function updateThemeColor() {
  const isLight = document.documentElement.dataset.theme === 'light';
  const color = isLight ? '#ffffff' : '#1a1a2e';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', color);
}

// ====== Init ======
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  migrateProfile();
  bindNavigation();
  bindCalendar();
  bindAddOverlay();
  bindAddFlow();
  bindStatsPeriod();
  bindChartToggle();
  bindStatsNutrient();
  bindChartExpand();
  bindIntakePreview();
  bindQuickWeights();
  bindManualEntry();
  bindMealButtons();
  bindFoodSearch();
  bindProfilePage();
  bindPantrySearch();
  bindPantryAddFood();
  bindReuseMenu();
  bindWater();
  bindClampNegativeInputs();
  bindDeficitToggle();
  registerSW();
  await renderLogPage(currentDate);
});

function migrateProfile() {
  const p = getProfile();
  let changed = false;
  if (p.goal === 'balanced') { p.goal = 'maintain'; changed = true; }
  // Migrate old activity levels to new
  const activityMap = { sedentary: 'very_low', light: 'sedentary_office', moderate: 'normal_life', active: 'high_steps', very_active: 'physical_labor' };
  if (activityMap[p.activity_level]) {
    p.activity_level = activityMap[p.activity_level];
    changed = true;
  }
  if (changed) saveProfile(p);
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// ====== Tab Navigation ======
function bindNavigation() {
  $$('.nav-btn').forEach(btn => {
    if (!btn.dataset.page) return; // 跳过无 data-page 的按钮（如添加按钮）
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });
}

async function switchPage(page) {
  currentPage = page;
  $$('.page').forEach(p => p.classList.remove('active'));
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  $(`#page-${page}`).classList.add('active');
  $(`.nav-btn[data-page="${page}"]`).classList.add('active');

  if (page === 'log') await renderLogPage(currentDate);
  if (page === 'pantry') await renderPantryPage();
  if (page === 'stats') await renderStatsPage(7);
  if (page === 'profile') await renderProfilePage();
}

// ====== Date Navigation & Calendar ======
let calYear, calMonth, calSelectedDate, calCallback, calShowPeriod;

function formatDateCN(d) {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const m = d.getMonth() + 1, day = d.getDate();
  return m + '月' + day + '日 ' + weekdays[d.getDay()];
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function updateDateBtn() {
  const d = new Date(currentDate + 'T00:00:00');
  $('#date-btn').textContent = formatDateCN(d);
  $('#log-date').value = currentDate;
}

function updatePfTargetDateBtn() {
  const el = $('#pf-target-date-btn');
  const input = $('#pf-target-date');
  if (!el || !input) return;
  const v = input.value;
  if (v) {
    const d = new Date(v + 'T00:00:00');
    el.textContent = formatDateCN(d);
    el.style.color = '';
  } else {
    el.textContent = '选择日期';
    el.style.color = 'var(--text-secondary)';
  }
}

// Update target date from period inputs (months + days from today)
function updateTargetFromPeriod() {
  const months = parseInt($('#pf-target-months').value) || 0;
  const days = parseInt($('#pf-target-days').value) || 0;
  if (months === 0 && days === 0) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(today);
  target.setMonth(target.getMonth() + months);
  target.setDate(target.getDate() + days);
  const str = toDateStr(target);
  $('#pf-target-date').value = str;
  updatePfTargetDateBtn();
  $('#pf-period-target-date').textContent = str;
  updateProfileField('target_date', str);
  updateProfileResults();
}

function updateCalPeriodResult() {
  const el = $('#cal-period-result');
  if (!el) return;
  const months = parseInt($('#cal-months').value) || 0;
  const days = parseInt($('#cal-days').value) || 0;
  if (months === 0 && days === 0) { el.textContent = ''; return; }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(today);
  target.setMonth(target.getMonth() + months);
  target.setDate(target.getDate() + days);
  el.textContent = '→ ' + formatDateCN(target) + ' (' + toDateStr(target) + ')';
}

function renderCalendar(year, month) {
  calYear = year; calMonth = month;
  const grid = $('#cal-grid');
  grid.innerHTML = '';
  $('#cal-month-year').textContent = year + '年 ' + (month + 1) + '月';

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const dateStr = year + '-' + String(month === 0 ? 12 : month).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    addCalDay(d, 'other-month', dateStr);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const classes = [];
    if (dateStr === calSelectedDate) classes.push('selected');
    if (dateStr === toDateStr(today)) classes.push('today');
    addCalDay(d, classes.join(' '), dateStr);
  }
  const totalCells = firstDay + daysInMonth;
  const remaining = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month + 2 > 12 ? 1 : month + 2;
    const dateStr = year + '-' + String(nextMonth).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    addCalDay(d, 'other-month', dateStr);
  }
}

function addCalDay(text, className, dateStr) {
  const btn = document.createElement('button');
  btn.className = 'cal-day ' + className;
  btn.textContent = text;
  btn.addEventListener('click', () => {
    calSelectedDate = dateStr;
    renderCalendar(calYear, calMonth);
    if (calShowPeriod) updateCalPeriodResult();
  });
  $('#cal-grid').appendChild(btn);
}

function openCalendar(selectedDate, callback, showPeriod) {
  calSelectedDate = selectedDate || toDateStr(new Date());
  calCallback = callback;
  calShowPeriod = showPeriod || false;

  const d = new Date(calSelectedDate + 'T00:00:00');
  calYear = d.getFullYear();
  calMonth = d.getMonth();

  // Show/hide period section and clear button
  const periodWrap = $('#cal-period-wrap');
  periodWrap.style.display = calShowPeriod ? '' : 'none';
  $('#cal-clear').style.display = calShowPeriod ? '' : 'none';
  if (calShowPeriod) {
    $('#cal-months').value = '';
    $('#cal-days').value = '';
    $('#cal-period-result').textContent = '';
  }

  renderCalendar(calYear, calMonth);
  $('#cal-overlay').classList.remove('hidden');
}

function closeCalendar() {
  $('#cal-overlay').classList.add('hidden');
}

function confirmCalendar() {
  if (calShowPeriod) {
    const months = parseInt($('#cal-months').value) || 0;
    const days = parseInt($('#cal-days').value) || 0;
    if (months > 0 || days > 0) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const target = new Date(today);
      target.setMonth(target.getMonth() + months);
      target.setDate(target.getDate() + days);
      calSelectedDate = toDateStr(target);
    }
  }
  if (calCallback) calCallback(calSelectedDate);
  closeCalendar();
}

function bindCalendar() {
  // Date button on log page
  $('#date-btn').addEventListener('click', () => {
    openCalendar(currentDate, (date) => {
      currentDate = date || toDateStr(new Date());
      updateDateBtn();
      renderLogPage(currentDate);
    }, false);
  });

  // Prev/next day arrows
  $('#date-prev').addEventListener('click', async () => {
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    currentDate = toDateStr(d);
    updateDateBtn();
    await renderLogPage(currentDate);
  });
  $('#date-next').addEventListener('click', async () => {
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    currentDate = toDateStr(d);
    updateDateBtn();
    await renderLogPage(currentDate);
  });

  // Calendar navigation
  $('#cal-prev-month').addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar(calYear, calMonth);
  });
  $('#cal-next-month').addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar(calYear, calMonth);
  });
  $('#cal-prev-year').addEventListener('click', () => { calYear--; renderCalendar(calYear, calMonth); });
  $('#cal-next-year').addEventListener('click', () => { calYear++; renderCalendar(calYear, calMonth); });

  $('#cal-today').addEventListener('click', () => {
    const today = toDateStr(new Date());
    calSelectedDate = today;
    const d = new Date();
    calYear = d.getFullYear(); calMonth = d.getMonth();
    renderCalendar(calYear, calMonth);
    if (calShowPeriod) { $('#cal-months').value = ''; $('#cal-days').value = ''; $('#cal-period-result').textContent = ''; }
  });
  $('#cal-clear').addEventListener('click', () => {
    calSelectedDate = null;
    if (calCallback) calCallback(null);
    closeCalendar();
  });
  $('#cal-confirm').addEventListener('click', confirmCalendar);

  // Close on overlay click
  $('#cal-overlay').addEventListener('click', (e) => {
    if (e.target === $('#cal-overlay')) closeCalendar();
  });

  // Period inputs in calendar
  $('#cal-months').addEventListener('input', updateCalPeriodResult);
  $('#cal-days').addEventListener('input', updateCalPeriodResult);

  // Profile target date button
  $('#pf-target-date-btn').addEventListener('click', () => {
    const currentVal = $('#pf-target-date').value;
    openCalendar(currentVal || toDateStr(new Date()), (date) => {
      if (date) {
        $('#pf-target-date').value = date;
        // Clear profile period inputs since date was set directly
        $('#pf-target-months').value = '';
        $('#pf-target-days').value = '';
        $('#pf-period-target-date').textContent = '';
        updatePfTargetDateBtn();
        updateProfileField('target_date', date);
        updateProfileResults();
      } else {
        $('#pf-target-date').value = '';
        $('#pf-target-months').value = '';
        $('#pf-target-days').value = '';
        $('#pf-period-target-date').textContent = '';
        updatePfTargetDateBtn();
        updateProfileField('target_date', null);
        updateProfileResults();
      }
    }, true);
  });

  // Profile period inputs (months/days)
  $('#pf-target-months').addEventListener('input', updateTargetFromPeriod);
  $('#pf-target-days').addEventListener('input', updateTargetFromPeriod);
}

// ====== Stats Period & Chart ======
function bindStatsPeriod() {
  $$('.stats-period .btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      $$('.stats-period .btn').forEach(b => { b.classList.remove('btn-active'); b.classList.add('btn-outline'); });
      btn.classList.remove('btn-outline'); btn.classList.add('btn-active');
      await renderStatsPage(parseInt(btn.dataset.period));
    });
  });
}

function bindChartToggle() {
  $$('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.chart-type-btn').forEach(b => { b.classList.remove('btn-active'); b.classList.add('btn-outline'); });
      btn.classList.remove('btn-outline'); btn.classList.add('btn-active');
      currentChartType = btn.dataset.chart;
      if (currentStatsData) renderChart(currentStatsData.dates, currentStatsData.byDate, currentChartType, currentStatsNutrient);
    });
  });
}

function bindStatsNutrient() {
  $$('.nutrient-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.nutrient-btn').forEach(b => { b.classList.remove('btn-active'); b.classList.add('btn-outline'); });
      btn.classList.remove('btn-outline'); btn.classList.add('btn-active');
      currentStatsNutrient = btn.dataset.nutrient;
      if (currentStatsData) renderChart(currentStatsData.dates, currentStatsData.byDate, currentChartType, currentStatsNutrient);
    });
  });
}

function bindChartExpand() {
  $('#btn-expand-chart').addEventListener('click', () => {
    const title = $('#chart-title')?.textContent || '图表总览';
    $('#expand-chart-title').textContent = title;
    if (currentStatsData) {
      const { dates, byDate } = currentStatsData;
      const nut = currentStatsNutrient || 'energy_kcal';
      const [_, unit] = NUTRIENT_LABELS[nut] || ['', 'kcal'];
      const dailyValues = dates.map(d => {
        if (byDate[d]) {
          const sum = calcDailySummary(byDate[d]);
          if (nut === 'energy_kcal') return sum.energy_kcal;
          if (nut === 'fiber_g') return sum.fiber_g || 0;
          if (nut === 'sodium_mg') return sum.sodium_mg || 0;
          return sum[nut] || 0;
        }
        return 0;
      });
      const maxVal = Math.max(...dailyValues, 1);
      const n = dailyValues.length;
      const padTop = 20; const padBottom = 30; const padLeft = 34; const padRight = 10;
      const pointGap = 44;
      const plotW = pointGap * Math.max(1, n - 1);
      const w = padLeft + plotW + padRight;
      const plotH = Math.max(200, Math.round(window.innerHeight * 0.55));
      const h = padTop + plotH + padBottom;
      const xs = dailyValues.map((_, i) => padLeft + i * pointGap);
      const yGrid = [0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = padTop + plotH - f * plotH;
        const val = Math.round(f * maxVal);
        return `<line x1="${padLeft - 4}" y1="${y}" x2="${w - padRight}" y2="${y}" class="grid-line"/>
          <text x="${padLeft - 6}" y="${y + 3}" class="data-label" text-anchor="end">${val}</text>`;
      }).join('');
      const points = dailyValues.map((v, i) => {
        const y = padTop + plotH - (v / maxVal) * plotH;
        return `${xs[i]},${y}`;
      }).join(' ');
      const circles = dailyValues.map((v, i) => {
        if (v === 0) return '';
        const y = padTop + plotH - (v / maxVal) * plotH;
        return `<circle cx="${xs[i]}" cy="${y}" r="4" class="data-point"/>`;
      }).join('');
      const labelStep = n > 20 ? 5 : n > 10 ? 2 : 1;
      const labels = dates.map((d, i) => {
        if (i % labelStep !== 0 && i !== n - 1) return '';
        return `<text x="${xs[i]}" y="${h - 6}" class="axis-label">${d.slice(5)}</text>`;
      }).join('');
      const svgW = Math.max(w, 320);
      $('#chart-expand-body').innerHTML = `
        <div class="chart-line-wrap" style="width:100%">
          <svg class="chart-line-svg chart-line-svg--large" viewBox="0 0 ${svgW} ${h}" preserveAspectRatio="xMidYMid meet">
            ${yGrid}
            <polyline points="${points}" class="data-line"/>
            ${circles}
            ${labels}
          </svg>
        </div>`;
    }
    $('#chart-expand-overlay').classList.remove('hidden');
  });
  $('#btn-close-expand').addEventListener('click', () => {
    $('#chart-expand-overlay').classList.add('hidden');
  });
}

// ====== Add Flow ======
function bindAddFlow() {
  $('#btn-camera').addEventListener('click', () => {
    $('#file-input').setAttribute('capture', 'environment');
    $('#file-input').click();
  });
  $('#btn-gallery').addEventListener('click', () => {
    $('#file-input').removeAttribute('capture');
    $('#file-input').click();
  });
  $('#file-input').addEventListener('change', handleFileSelect);
  $('#btn-repick').addEventListener('click', () => showStep('upload'));
  $('#btn-ocr-start').addEventListener('click', startOCR);
  $('#btn-save').addEventListener('click', saveCurrentEntry);
  $('#btn-save-pantry').addEventListener('click', saveToPantry);
  $('#btn-back-to-upload').addEventListener('click', () => showStep('upload'));
}

function showStep(step) {
  $$('.add-step').forEach(s => s.classList.add('hidden'));
  const el = $(`#add-step-${step}`);
  if (el) el.classList.remove('hidden');
}

async function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const processed = await preprocessImage(file);
    currentImageDataUrl = processed.dataUrl;
    $('#preview-img').src = processed.dataUrl;
    showStep('preview');
  } catch (err) {
    showToast('图片处理失败，请重试');
  }
  e.target.value = '';
}

async function startOCR() {
  if (!currentImageDataUrl) return;
  showStep('ocr');
  $('#ocr-status').textContent = '正在加载识别引擎...';
  $('#ocr-progress').style.width = '0%';

  try {
    const text = await runOCR(currentImageDataUrl, (msg) => {
      $('#ocr-status').textContent = msg;
    });
    console.log('=== OCR RAW TEXT ===\n' + text + '\n=== END OCR ===');
    const parsed = parseNutritionText(text);
    // Show scanned image above food name for visual verification
    const resultImg = $('#result-preview-img');
    resultImg.src = currentImageDataUrl;
    resultImg.style.display = 'block';
    resultImg.style.cursor = 'pointer';
    resultImg.onclick = () => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2000;background:var(--overlay-bg);display:flex;align-items:center;justify-content:center;cursor:pointer;';
      overlay.innerHTML = `<img src="${currentImageDataUrl}" style="max-width:95vw;max-height:95vh;object-fit:contain;">`;
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    };
    $('#food-name').value = parsed.name || '';
    $('#nf-energy').value = parsed.energy_kj || '';
    $('#nf-protein').value = parsed.protein_g || '';
    $('#nf-fat').value = parsed.fat_g || '';
    $('#nf-carbs').value = parsed.carbs_g || '';
    $('#nf-fiber').value = parsed.fiber_g || '';
    $('#nf-sodium').value = parsed.sodium_mg || '';
    $('#food-weight').value = '';
    updateEstimatedIntake();
    showStep('result');
    if (parsed.confidence === 'high') showToast('识别成功！请核对数据');
    else if (parsed.confidence === 'medium') showToast('部分识别成功，请检查并补充');
    else showToast('识别效果不佳，请手动输入');
  } catch (err) {
    console.error('OCR error:', err);
    showStep('upload');
    showToast('识别失败，请重试或手动输入');
  }
}

function getFormPer100g() {
  return {
    energy_kj: parseFloat($('#nf-energy').value) || null,
    protein_g: parseFloat($('#nf-protein').value) || null,
    fat_g: parseFloat($('#nf-fat').value) || null,
    carbs_g: parseFloat($('#nf-carbs').value) || null,
    fiber_g: parseFloat($('#nf-fiber').value) || null,
    sodium_mg: parseFloat($('#nf-sodium').value) || null,
  };
}

async function saveCurrentEntry() {
  // Pantry-only mode: save to pantry instead of log
  if (addOverlayPantryMode) {
    await saveToPantry();
    addOverlayPantryMode = false;
    const saveBtn = $('#btn-save');
    const pantryBtn = $('#btn-save-pantry');
    if (saveBtn) saveBtn.textContent = '💾 保存记录';
    if (pantryBtn) pantryBtn.classList.remove('hidden');
    currentImageDataUrl = null;
    closeAddOverlay();
    return;
  }

  const name = $('#food-name').value.trim() || '未命名食品';
  const weight_g = parseFloat($('#food-weight').value) || 0;
  if (weight_g <= 0) { showToast('请输入吃的重量'); $('#food-weight').focus(); return; }

  const per100g = getFormPer100g();
  const now = new Date();
  const entry = {
    id: generateId(),
    date: currentDate,
    datetime: now.toISOString(),
    time: formatTime(now),
    meal: currentMeal,
    name,
    thumbnail: currentImageDataUrl ? await createThumbnail(currentImageDataUrl) : null,
    per100g,
    weight_g,
    notes: $('#food-notes').value.trim() || null,
    actualIntake: calcIntake(per100g, weight_g),
  };

  await saveEntry(entry);
  resetAddForm();
  closeAddOverlay();
  await switchPage('log');
  showToast('已保存！');
}

async function saveToPantry() {
  const name = $('#food-name').value.trim();
  if (!name) { showToast('请先输入食品名称'); return; }

  const per100g = getFormPer100g();
  const hasData = Object.values(per100g).some(v => v != null && v > 0);
  if (!hasData) { showToast('请先输入营养成分'); return; }

  const item = {
    id: generateId(),
    name,
    emoji: '📦',
    category: '自定义',
    thumbnail: currentImageDataUrl ? await createThumbnail(currentImageDataUrl) : null,
    per100g,
    notes: $('#food-notes').value.trim() || null,
    source: currentImageDataUrl ? 'ocr' : 'manual',
    createdAt: new Date().toISOString(),
  };

  await savePantryItem(item);
  await switchPage('pantry');
  showToast(`"${name}" 已保存到仓库`);
}

function resetAddForm() {
  showStep('upload');
  currentImageDataUrl = null;
  currentMeal = 'breakfast';
  $$('.meal-btn').forEach(b => {
    b.classList.toggle('btn-active', b.dataset.meal === 'breakfast');
    b.classList.toggle('btn-outline', b.dataset.meal !== 'breakfast');
  });
  $$('#add-overlay input[type=number]').forEach(i => i.value = '');
  $('#food-name').value = '';
  $('#preview-img').src = '';
  const resultImg = $('#result-preview-img');
  if (resultImg) { resultImg.src = ''; resultImg.style.display = 'none'; }
  $('#food-search-input').value = '';
  $('#search-results').classList.add('hidden');
}

function createThumbnail(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 150;
      const ratio = Math.min(MAX / img.width, MAX / img.height);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function bindQuickWeights() {
  $$('.quick-weights .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('#food-weight').value = btn.dataset.weight;
      updateEstimatedIntake();
    });
  });
}

function bindManualEntry() {
  $('#btn-manual').addEventListener('click', () => {
    currentImageDataUrl = null;
    currentMeal = 'breakfast';
    $$('.meal-btn').forEach(b => {
      b.classList.toggle('btn-active', b.dataset.meal === 'breakfast');
      b.classList.toggle('btn-outline', b.dataset.meal !== 'breakfast');
    });
    ['#food-name', '#nf-energy', '#nf-protein', '#nf-fat', '#nf-carbs', '#nf-fiber', '#nf-sodium', '#food-weight'].forEach(s => $(s).value = '');
    updateEstimatedIntake();
    showStep('result');
  });
}

// ====== Meal Type ======
function bindMealButtons() {
  $$('.meal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.meal-btn').forEach(b => { b.classList.remove('btn-active'); b.classList.add('btn-outline'); });
      btn.classList.remove('btn-outline'); btn.classList.add('btn-active');
      currentMeal = btn.dataset.meal;
    });
  });
}

// ====== Food Search ======
let searchDebounce = null;

function bindFoodSearch() {
  const input = $('#food-search-input');
  const results = $('#search-results');
  const clearBtn = $('#search-clear');

  input.addEventListener('input', () => {
    const val = input.value.trim();
    clearBtn.classList.toggle('hidden', val.length === 0);
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => doSearch(val), 150);
  });

  input.addEventListener('focus', () => {
    const val = input.value.trim();
    if (val.length > 0) doSearch(val);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    results.classList.add('hidden');
    input.focus();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#food-search')) results.classList.add('hidden');
  });
}

async function doSearch(query) {
  const results = $('#search-results');
  if (!query || query.length === 0) { results.classList.add('hidden'); return; }

  // Search FOOD_DB
  const dbResults = searchFoods(query);

  // Search pantry
  const pantryItems = await getAllPantryItems();
  const q = query.toLowerCase();
  const pantryResults = pantryItems.filter(item =>
    item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
  ).slice(0, 4);

  const allResults = [...pantryResults, ...dbResults].slice(0, 10);

  if (allResults.length === 0) {
    results.innerHTML = '<div class="search-no-results">未找到匹配食物，请使用拍照或手动输入</div>';
    results.classList.remove('hidden');
    return;
  }

  results.innerHTML = allResults.map(f => {
    const kcal = calcKcal(f.per100g.energy_kj);
    const isPantry = !!f.id;
    const isUserDB = f.source === 'user';
    const sourceTag = isPantry ? (f.source === 'ocr' ? '📷' : '✏️') : (isUserDB ? '📥' : '');
    const sourceLabel = isPantry ? '我的仓库' : (isUserDB ? '数据库-用户收录' : '');
    // Thumbnail for search results
    let searchThumb;
    if (f.thumbnail) {
      searchThumb = `<img class="food-item-thumb" src="${f.thumbnail}" alt="" style="width:36px;height:36px;">`;
    } else {
      const dbMatch = FOOD_DB.find(d => d.name === f.name);
      searchThumb = `<div class="food-item-thumb food-item-thumb-emoji" style="width:36px;height:36px;font-size:1.2rem;">${dbMatch ? dbMatch.emoji : (f.emoji || '📦')}</div>`;
    }
    return `
    <div class="search-result-item" data-food-name="${escapeHtml(f.name)}" data-pantry-id="${isPantry ? f.id : ''}" data-user-db="${isUserDB ? '1' : ''}">
      ${searchThumb}
      <div class="sr-info">
        <div class="sr-name">${escapeHtml(f.name)} ${sourceTag}</div>
        <div class="sr-category">${sourceLabel || f.category}</div>
        <div class="sr-meta">蛋白 ${f.per100g.protein_g}g · 脂肪 ${f.per100g.fat_g}g · 碳水 ${f.per100g.carbs_g}g${isUserDB ? ' <button class="btn btn-xs btn-outline" data-remove-user-db="' + escapeHtml(f.name) + '" style="font-size:0.55rem;color:var(--danger);padding:1px 4px;margin-left:4px;">取消收录</button>' : ''}</div>
      </div>
      <div class="sr-kcal"><strong>${kcal}</strong><span>kcal</span></div>
    </div>`;
  }).join('');

  results.classList.remove('hidden');

  results.querySelectorAll('[data-remove-user-db]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.removeUserDb;
      if (confirm(`确定取消收录「${name}」？将从公共数据库中移除。`)) {
        removeUserFoodFromDB(name);
        btn.closest('.search-result-item').remove();
        showToast(`已取消收录「${name}」`);
      }
    });
  });

  results.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const name = item.dataset.foodName;
      const pantryId = item.dataset.pantryId;
      const isUserDb = item.dataset.userDb === '1';
      let food;
      if (pantryId) {
        food = pantryItems.find(p => p.id === pantryId);
      } else if (isUserDb) {
        food = loadUserFoodDB().find(f => f.name === name);
      } else {
        food = FOOD_DB.find(f => f.name === name);
      }
      if (food) selectFoodFromSearch(food);
    });
  });
}

function selectFoodFromSearch(food) {
  currentImageDataUrl = food.thumbnail || null;
  $('#food-name').value = food.name;
  $('#nf-energy').value = food.per100g.energy_kj || '';
  $('#nf-protein').value = food.per100g.protein_g || '';
  $('#nf-fat').value = food.per100g.fat_g || '';
  $('#nf-carbs').value = food.per100g.carbs_g || '';
  $('#nf-fiber').value = food.per100g.fiber_g || '';
  $('#nf-sodium').value = food.per100g.sodium_mg || '';
  $('#food-weight').value = '';

  $('#food-search-input').value = (food.emoji || '') + ' ' + food.name;
  $('#search-results').classList.add('hidden');
  $('#search-clear').classList.remove('hidden');

  updateEstimatedIntake();
  showStep('result');
  showToast(`已选择 ${food.name}，请输入重量`);
}

// ====== Add Overlay ======
function bindAddOverlay() {
  $('#btn-add-food').addEventListener('click', openAddOverlay);
  $('#btn-close-add').addEventListener('click', closeAddOverlay);
}

let addOverlayPantryMode = false;

// ====== Pantry Add Food ======
function bindPantryAddFood() {
  const btn = $('#btn-add-pantry-food');
  if (btn) {
    btn.addEventListener('click', () => {
      addOverlayPantryMode = true;
      openAddOverlay();
      // Update UI for pantry-only mode
      const saveBtn = $('#btn-save');
      const pantryBtn = $('#btn-save-pantry');
      if (saveBtn) saveBtn.textContent = '📦 保存到仓库';
      if (pantryBtn) pantryBtn.classList.add('hidden');
    });
  }
}

// ====== Pantry Search ======
let pantrySearchDebounce = null;

function bindPantrySearch() {
  const input = $('#pantry-search-input');
  const clearBtn = $('#pantry-search-clear');

  input.addEventListener('input', () => {
    const val = input.value.trim();
    clearBtn.classList.toggle('hidden', val.length === 0);
    clearTimeout(pantrySearchDebounce);
    pantrySearchDebounce = setTimeout(() => filterPantryItems(val), 150);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    filterPantryItems('');
  });

  const banner = $('#user-db-banner');
  if (banner) {
    banner.addEventListener('click', () => openUserFoodDBOverlay());
  }
}

async function filterPantryItems(query) {
  const q = query.trim();

  // 空搜索直接委托给 renderPantryPage，保证界面一致
  if (!q) {
    await renderPantryPage();
    return;
  }

  const userDB = getUserFoodDB();
  const banner = $('#user-db-banner');
  if (banner) banner.classList.toggle('hidden', userDB.length === 0);

  const items = await getAllPantryItems();
  const listEl = $('#pantry-list');

  let results = items.filter(item =>
    item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
  );

  // Search FOOD_DB as well
  const dbResults = searchFoods(q);
  const pantryNames = new Set(items.map(i => i.name));
  for (const dbFood of dbResults) {
    if (!pantryNames.has(dbFood.name)) {
      results.push({ ...dbFood, _fromDb: true });
    }
  }

  if (results.length === 0) {
    listEl.innerHTML = '<div class="empty-state small"><p>仓库和数据库中没有匹配的食物</p></div>';
    return;
  }

  const itemsForBinding = results; // capture for event handlers
  listEl.innerHTML = results.map(item => {
    const kcal = calcKcal(item.per100g?.energy_kj);
    const isDb = item._fromDb;
    const isUserDb = isDb && item.source === 'user';
    const itemId = isDb ? ((isUserDb ? 'userdb_' : 'db_') + item.name) : item.id;
    let searchThumbHtml;
    if (item.thumbnail) {
      searchThumbHtml = `<img class="food-item-thumb" src="${item.thumbnail}" alt="">`;
    } else {
      const dbF = FOOD_DB.find(f => f.name === item.name);
      if (dbF) {
        searchThumbHtml = `<div class="food-item-thumb food-item-thumb-emoji">${dbF.emoji || '📦'}</div>`;
      } else {
        searchThumbHtml = `<div class="food-item-thumb food-item-thumb-emoji">${item.emoji || '📦'}</div>`;
      }
    }
    return `
    <div class="food-item pantry-item" data-pantry="${itemId}" data-from-db="${isDb || ''}"${isDb ? '' : ' data-draggable'}>
      ${searchThumbHtml}
      <div class="food-item-info">
        <div class="food-item-name">${escapeHtml(item.name)}${isDb ? (item.source === 'user' ? ' <span style="font-size:0.65rem;color:var(--accent)">(数据库-用户收录)</span>' : ' <span style="font-size:0.65rem;color:var(--text-secondary)">(数据库)</span>') : ''}</div>
        <div class="food-item-meta">
          ${item.category} · 蛋白 ${item.per100g?.protein_g || 0}g · 脂肪 ${item.per100g?.fat_g || 0}g · 碳水 ${item.per100g?.carbs_g || 0}g${item.notes ? ' · 备注' : ''}
        </div>
        <div class="pantry-quick-log">
          <select class="pq-meal" data-pantry-meal="${itemId}">
            <option value="breakfast">🌅 早餐</option>
            <option value="lunch">☀️ 午餐</option>
            <option value="dinner">🌙 晚餐</option>
            <option value="snack">🍪 加餐</option>
            <option value="snack_food">🍿 零食</option>
            <option value="other">📌 其他</option>
          </select>
          <button class="btn btn-xs btn-outline pq-btn" data-weight="50">50g</button>
          <button class="btn btn-xs btn-outline pq-btn" data-weight="100">100g</button>
          <button class="btn btn-xs btn-outline pq-btn" data-weight="150">150g</button>
          <button class="btn btn-xs btn-outline pq-btn" data-weight="200">200g</button>
        </div>
      </div>
      <div class="food-item-calories">
        <strong>${kcal}</strong>
        <span>kcal/100g</span>
        ${isDb ? (item.source === 'user' ? '<button class="btn btn-xs btn-primary" data-add-db-pantry="' + escapeHtml(item.name) + '" style="margin-top:2px;font-size:0.6rem;">存库</button> <button class="btn btn-xs btn-outline" data-remove-user-db="' + escapeHtml(item.name) + '" style="margin-top:2px;font-size:0.6rem;color:var(--danger);">取消收录</button>' : '<button class="btn btn-xs btn-primary" data-add-db-pantry="' + escapeHtml(item.name) + '" style="margin-top:2px;font-size:0.6rem;">存库</button>') : ''}
      </div>
      ${isDb ? '' : `<button class="food-item-delete" data-delete-pantry="${itemId}" style="opacity:1;top:auto;bottom:8px;">🗑</button>`}
    </div>`;
  }).join('');

  listEl.querySelectorAll('[data-delete-pantry]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deletePantryItem(btn.dataset.deletePantry);
      await filterPantryItems($('#pantry-search-input').value.trim());
      showToast('已从仓库删除');
    });
  });

  listEl.querySelectorAll('[data-add-db-pantry]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const name = btn.dataset.addDbPantry;
      let dbFood = FOOD_DB.find(f => f.name === name);
      let source = 'database';
      if (!dbFood) { dbFood = loadUserFoodDB().find(f => f.name === name); source = 'userdb'; }
      if (!dbFood) return;
      await savePantryItem({
        id: generateId(),
        name: dbFood.name,
        emoji: dbFood.emoji || '📦',
        category: dbFood.category,
        per100g: { ...dbFood.per100g },
        notes: dbFood.notes || null,
        thumbnail: dbFood.thumbnail || null,
        source,
        createdAt: new Date().toISOString(),
      });
      await filterPantryItems($('#pantry-search-input').value.trim());
      showToast(`"${dbFood.name}" 已存到仓库`);
    });
  });

  listEl.querySelectorAll('[data-remove-user-db]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.removeUserDb;
      if (confirm(`确定取消收录「${name}」？将从公共数据库中移除。`)) {
        removeUserFoodFromDB(name);
        filterPantryItems($('#pantry-search-input').value.trim());
        showToast(`已取消收录「${name}」`);
      }
    });
  });

  bindPantryQuickLogInApp(listEl, itemsForBinding);

  enableDragReorder(listEl, async () => {
    const orderedIds = [...listEl.querySelectorAll('[data-draggable]')].map(el => el.dataset.pantry);
    const allItems = await getAllPantryItems();
    for (let i = 0; i < orderedIds.length; i++) {
      const item = allItems.find(it => it.id === orderedIds[i]);
      if (item && item.order !== i) {
        item.order = i;
        await savePantryItem(item);
      }
    }
  });
}

function bindPantryQuickLogInApp(listEl, items) {
  listEl.querySelectorAll('.pq-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pantryItem = btn.closest('[data-pantry]');
      const pantryId = pantryItem.dataset.pantry;
      const isDb = pantryItem.dataset.fromDb === 'true';
      let item = items.find(i => i.id === pantryId);
      if (!item && isDb) {
        // Look up from built-in FOOD_DB or user-contributed DB
        item = FOOD_DB.find(f => 'db_' + f.name === pantryId) ||
               loadUserFoodDB().find(f => 'userdb_' + f.name === pantryId);
      }
      if (!item) return;
      const mealSelect = pantryItem.querySelector('.pq-meal');
      const meal = mealSelect ? mealSelect.value : 'snack_food';
      const weightG = parseInt(btn.dataset.weight);
      const now = new Date();
      const entry = {
        id: generateId(),
        date: currentDate,
        datetime: now.toISOString(),
        time: formatTime(now),
        meal,
        name: item.name,
        thumbnail: item.thumbnail || null,
        per100g: item.per100g,
        weight_g: weightG,
        actualIntake: calcIntake(item.per100g, weightG),
      };
      await saveEntry(entry);
      showToast(`已记录 ${item.name} ${weightG}g (${meal})`);
    });
  });
}

// ====== Menu Reuse ======
function bindReuseMenu() {
  $('#btn-reuse-yesterday').addEventListener('click', async () => {
    await reuseMenu(1);
  });
  $('#btn-reuse-lastweek').addEventListener('click', async () => {
    await reuseMenu(7);
  });
}

async function reuseMenu(daysAgo) {
  const sourceDate = getDateDaysAgo(daysAgo);
  const sourceEntries = await getEntriesByDate(sourceDate);
  if (sourceEntries.length === 0) {
    showToast(daysAgo === 1 ? '昨天没有记录' : '上周同天没有记录');
    return;
  }

  const label = daysAgo === 1 ? '昨天' : '上周同天';
  const currentEntries = await getEntriesByDate(currentDate);
  const confirmMsg = currentEntries.length > 0
    ? `确认用${label}的 ${sourceEntries.length} 条记录覆盖今天已有的 ${currentEntries.length} 条记录吗？`
    : `确认用${label}的 ${sourceEntries.length} 条记录添加到今天吗？`;
  if (!confirm(confirmMsg)) return;

  // Delete existing entries for current date first (overwrite)
  for (const e of currentEntries) {
    await deleteEntry(e.id);
  }

  const now = new Date();
  let count = 0;
  for (const entry of sourceEntries) {
    const newEntry = {
      ...entry,
      id: generateId(),
      date: currentDate,
      datetime: now.toISOString(),
      time: formatTime(now),
      thumbnail: entry.thumbnail || null,
    };
    await saveEntry(newEntry);
    count++;
  }
  await renderLogPage(currentDate);
  showToast(`已复用 ${count} 条记录`);
}

// ====== Deficit Toggle ======
function bindDeficitToggle() {
  const toggle = $('#deficit-toggle');
  const card = $('#deficit-card');
  if (toggle && card) {
    toggle.addEventListener('click', () => {
      card.classList.toggle('open');
    });
    card.classList.add('open');
  }
}

// ====== Water Tracking ======
function bindWater() {
  $('#water-input').addEventListener('change', async () => {
    const ml = parseFloat($('#water-input').value) || 0;
    await saveWater(currentDate, ml);
    await renderLogPage(currentDate);
  });

  $$('.water-quick').forEach(btn => {
    btn.addEventListener('click', async () => {
      const addMl = parseInt(btn.dataset.ml);
      const currentMl = await getWater(currentDate);
      const newMl = currentMl + addMl;
      await saveWater(currentDate, newMl);
      $('#water-input').value = '';
      await renderLogPage(currentDate);
      showToast(`+${addMl}ml 饮水，共 ${newMl}ml`);
    });
  });
}

function bindClampNegativeInputs() {
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.tagName === 'INPUT' && el.type === 'number' && el.hasAttribute('min')) {
      const minVal = parseFloat(el.getAttribute('min'));
      if (!isNaN(minVal) && parseFloat(el.value) < minVal) {
        el.value = minVal;
      }
    }
  });
}

// ====== Profile Page ======
function bindProfilePage() {
  // Theme toggle
  const themeToggle = $('#theme-toggle');
  if (themeToggle) {
    themeToggle.checked = document.documentElement.dataset.theme === 'dark';
    themeToggle.addEventListener('change', toggleTheme);
  }

  // Body params fold toggle
  const toggle = $('#body-params-toggle');
  const body = $('#body-params-body');
  const arrow = $('#body-params-arrow');
  const summary = $('#body-params-summary');
  if (toggle && body) {
    toggle.addEventListener('click', () => {
      const hidden = body.style.display === 'none';
      body.style.display = hidden ? '' : 'none';
      if (arrow) arrow.textContent = hidden ? '▼' : '▶';
      if (summary) {
        if (hidden) {
          // Expanding — hide summary
          summary.classList.add('hidden');
        } else {
          // Collapsing — show summary
          summary.textContent = getBodyParamsSummary();
          summary.classList.remove('hidden');
        }
      }
    });
  }

  // Gender buttons
  $$('.gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.gender-btn').forEach(b => { b.classList.remove('btn-active'); b.classList.add('btn-outline'); });
      btn.classList.remove('btn-outline'); btn.classList.add('btn-active');
      updateProfileField('gender', btn.dataset.gender);
      updateProfileResults();
    });
  });

  // Goal buttons
  $$('.goal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.goal-btn').forEach(b => { b.classList.remove('btn-active'); b.classList.add('btn-outline'); });
      btn.classList.remove('btn-outline'); btn.classList.add('btn-active');
      updateProfileField('goal', btn.dataset.goal);
      updateProfileResults();
    });
  });

  // Frame buttons
  $$('.frame-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.frame-btn').forEach(b => { b.classList.remove('btn-active'); b.classList.add('btn-outline'); });
      btn.classList.remove('btn-outline'); btn.classList.add('btn-active');
      updateProfileField('frame_size', btn.dataset.frame);
      updateProfileResults();
    });
  });

  // Body goal buttons
  $$('.bodygoal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.bodygoal-btn').forEach(b => { b.classList.remove('btn-active'); b.classList.add('btn-outline'); });
      btn.classList.remove('btn-outline'); btn.classList.add('btn-active');
      updateProfileField('body_goal', btn.dataset.bodygoal);
      updateProfileResults();
    });
  });

  // Custom BMR toggle
  $('#use-custom-bmr').addEventListener('change', () => {
    const checked = $('#use-custom-bmr').checked;
    $('#custom-bmr-row').classList.toggle('hidden', !checked);
    updateProfileField('use_custom_bmr', checked);
    if (checked) {
      const existingVal = parseFloat($('#custom-bmr-value').value);
      if (!existingVal || existingVal <= 0) {
        const formulaBmr = calcBMR(
          getProfile().gender,
          getProfile().weight_kg,
          getProfile().height_cm,
          getProfile().age
        );
        $('#custom-bmr-value').value = formulaBmr;
        updateProfileField('custom_bmr', formulaBmr);
      }
    } else {
      updateProfileField('custom_bmr', null);
      $('#custom-bmr-value').value = '';
    }
    updateProfileResults();
  });

  // Custom BMR value input
  $('#custom-bmr-value').addEventListener('input', () => {
    const val = parseFloat($('#custom-bmr-value').value);
    if (val > 0) {
      updateProfileField('custom_bmr', val);
      if ($('#use-custom-bmr').checked) updateProfileResults();
    }
  });

  // Input fields
  ['#pf-height', '#pf-weight', '#pf-age'].forEach(sel => {
    $(sel).addEventListener('input', () => {
      const field = sel.replace('#pf-', '');
      const val = field === 'weight' ? parseFloat($(sel).value) || 65 : parseInt($(sel).value) || 25;
      updateProfileField(field === 'height' ? 'height_cm' : field === 'weight' ? 'weight_kg' : 'age', val);
      updateProfileResults();
    });
  });

  // Activity select
  $('#pf-activity').addEventListener('change', () => {
    updateProfileField('activity_level', $('#pf-activity').value);
    updateProfileResults();
  });

  // Target weight
  $('#pf-target-weight').addEventListener('input', () => {
    const val = parseFloat($('#pf-target-weight').value) || null;
    updateProfileField('target_weight_kg', val);
    updateProfileResults();
  });

  // Target date: sync button + clear period inputs when date changes outside calendar
  $('#pf-target-date').addEventListener('change', () => {
    $('#pf-target-months').value = '';
    $('#pf-target-days').value = '';
    $('#pf-period-target-date').textContent = '';
    updatePfTargetDateBtn();
    updateProfileField('target_date', $('#pf-target-date').value || null);
    updateProfileResults();
  });

  // Water goal
  $('#pf-water-goal').addEventListener('input', () => {
    const val = parseInt($('#pf-water-goal').value) || 2000;
    updateProfileField('water_goal_ml', val);
  });

  // Body fat toggle
  $('#use-custom-bodyfat').addEventListener('change', async () => {
    const checked = $('#use-custom-bodyfat').checked;
    updateProfileField('use_custom_bodyfat', checked);
    $('#pf-bodyfat').readOnly = !checked;
    $('#pf-bodyfat').style.opacity = checked ? '1' : '0.6';
    if (!checked) {
      const pd = await getProfileData();
      $('#pf-bodyfat').value = pd.bodyFatPct;
      updateProfileField('body_fat_pct', null);
    }
    updateProfileResults();
  });

  // Body fat input
  $('#pf-bodyfat').addEventListener('input', () => {
    if ($('#use-custom-bodyfat').checked) {
      const val = parseFloat($('#pf-bodyfat').value);
      if (val > 0) {
        updateProfileField('body_fat_pct', val);
        updateProfileResults();
      }
    }
  });

  // Save button
  $('#btn-save-profile').addEventListener('click', async () => {
    await updateProfileResults();
    await renderLogPage(currentDate);
    showToast('参数已保存');
  });
}

function getBodyParamsSummary() {
  const p = getProfile();
  const genderLabel = { male: '男', female: '女' };
  const goalLabel = { cut: '减脂', bulk: '增肌', maintain: '维持', recomp: '混合' };
  const frameLabel = { small: '细骨架', medium: '中骨架', large: '大骨架' };
  const bodyGoalLabel = { fit: '匀称', lean: '薄肌', sculpted: '立体', muscular: '肌肉', skinny: '偏瘦' };
  const parts = [
    genderLabel[p.gender] || '男',
    (p.height_cm || '--') + 'cm',
    (p.weight_kg || '--') + 'kg',
    (p.age || '--') + '岁',
    goalLabel[p.goal] || '减脂',
    frameLabel[p.frame_size] || '中骨架',
    bodyGoalLabel[p.body_goal] || '匀称',
  ];
  return parts.join(' | ');
}
