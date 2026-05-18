// Main app controller
let currentPage = 'log';
let currentDate = formatDate(new Date());
let currentImageDataUrl = null;

// ====== Init ======
document.addEventListener('DOMContentLoaded', async () => {
  migrateProfile();
  bindNavigation();
  bindDatePicker();
  bindAddFlow();
  bindStatsPeriod();
  bindChartToggle();
  bindIntakePreview();
  bindQuickWeights();
  bindManualEntry();
  bindFoodSearch();
  bindProfilePage();
  bindDeficitToggle();
  registerSW();
  await renderLogPage(currentDate);
});

function migrateProfile() {
  const p = getProfile();
  let changed = false;
  if (p.goal === 'balanced') { p.goal = 'maintain'; changed = true; }
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
  if (page === 'stats') await renderStatsPage(7);
  if (page === 'profile') renderProfilePage();
}

// ====== Date Picker ======
function bindDatePicker() {
  $('#log-date').addEventListener('change', async (e) => {
    currentDate = e.target.value;
    await renderLogPage(currentDate);
  });
}

// ====== Deficit Toggle ======
function bindDeficitToggle() {
  $('#deficit-toggle').addEventListener('click', () => {
    $('#deficit-card').classList.toggle('open');
  });
  // Open by default
  $('#deficit-card').classList.add('open');
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
      if (currentStatsData) renderChart(currentStatsData.dates, currentStatsData.byDate, currentChartType);
    });
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
    const parsed = parseNutritionText(text);
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
    name,
    thumbnail: currentImageDataUrl ? await createThumbnail(currentImageDataUrl) : null,
    per100g,
    weight_g,
    actualIntake: calcIntake(per100g, weight_g),
  };

  await saveEntry(entry);
  resetAddForm();
  showToast('已保存！');
  switchPage('log');
}

async function saveToPantry() {
  const name = $('#food-name').value.trim();
  if (!name) { showToast('请先输入食品名称'); return; }

  const per100g = getFormPer100g();
  const hasData = Object.values(per100g).some(v => v != null && v > 0);
  if (!hasData) { showToast('请先输入营养成分'); return; }

  // Check duplicate
  const existing = await findPantryByName(name);
  if (existing.length > 0) {
    showToast(`"${name}" 已在仓库中`);
    return;
  }

  const item = {
    id: generateId(),
    name,
    emoji: '📦',
    category: '自定义',
    thumbnail: currentImageDataUrl ? await createThumbnail(currentImageDataUrl) : null,
    per100g,
    source: currentImageDataUrl ? 'ocr' : 'manual',
    createdAt: new Date().toISOString(),
  };

  await savePantryItem(item);
  showToast(`"${name}" 已保存到仓库`);
}

function resetAddForm() {
  showStep('upload');
  currentImageDataUrl = null;
  $$('#page-add input[type=number]').forEach(i => i.value = '');
  $('#food-name').value = '';
  $('#preview-img').src = '';
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
    ['#food-name', '#nf-energy', '#nf-protein', '#nf-fat', '#nf-carbs', '#nf-fiber', '#nf-sodium', '#food-weight'].forEach(s => $(s).value = '');
    updateEstimatedIntake();
    showStep('result');
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
    const isPantry = f.source !== undefined;
    const sourceTag = isPantry ? (f.source === 'ocr' ? '📷' : '✏️') : '';
    const sourceLabel = isPantry ? '我的仓库' : '';
    return `
    <div class="search-result-item" data-food-name="${escapeHtml(f.name)}" data-pantry-id="${isPantry ? f.id : ''}">
      <span class="sr-emoji">${f.emoji || '📦'}</span>
      <div class="sr-info">
        <div class="sr-name">${escapeHtml(f.name)} ${sourceTag}</div>
        <div class="sr-category">${sourceLabel || f.category}</div>
        <div class="sr-meta">蛋白 ${f.per100g.protein_g}g · 脂肪 ${f.per100g.fat_g}g · 碳水 ${f.per100g.carbs_g}g</div>
      </div>
      <div class="sr-kcal"><strong>${kcal}</strong><span>kcal</span></div>
    </div>`;
  }).join('');

  results.classList.remove('hidden');

  results.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const name = item.dataset.foodName;
      const pantryId = item.dataset.pantryId;
      let food;
      if (pantryId) {
        food = pantryItems.find(p => p.id === pantryId);
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

// ====== Profile Page ======
function bindProfilePage() {
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
    if (checked) {
      const val = parseFloat($('#custom-bmr-value').value) || 0;
      updateProfileField('custom_bmr', val);
    } else {
      updateProfileField('custom_bmr', null);
      $('#custom-bmr-value').value = '';
    }
    updateProfileResults();
  });

  // Custom BMR value input
  $('#custom-bmr-value').addEventListener('input', () => {
    if ($('#use-custom-bmr').checked) {
      const val = parseFloat($('#custom-bmr-value').value) || 0;
      updateProfileField('custom_bmr', val);
      updateProfileResults();
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

  // Save button
  $('#btn-save-profile').addEventListener('click', async () => {
    updateProfileResults();
    // Refresh log page progress bars with new recommendations
    await renderLogPage(currentDate);
    showToast('参数已保存');
  });
}
