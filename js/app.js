// Main app controller

let currentPage = 'log';
let currentDate = formatDate(new Date());
let currentImageDataUrl = null;
let currentPer100g = null;

// ====== Init ======
document.addEventListener('DOMContentLoaded', async () => {
  bindNavigation();
  bindDatePicker();
  bindAddFlow();
  bindStatsPeriod();
  bindIntakePreview();
  bindQuickWeights();
  bindManualEntry();
  registerSW();
  await renderLogPage(currentDate);
});

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// ====== Tab Navigation ======
function bindNavigation() {
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      switchPage(page);
    });
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
}

// ====== Date Picker ======
function bindDatePicker() {
  $('#log-date').addEventListener('change', async (e) => {
    currentDate = e.target.value;
    await renderLogPage(currentDate);
  });
}

// ====== Stats Period ======
function bindStatsPeriod() {
  $$('.stats-period .btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      $$('.stats-period .btn').forEach(b => {
        b.classList.remove('btn-active');
        b.classList.add('btn-outline');
      });
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-active');
      await renderStatsPage(parseInt(btn.dataset.period));
    });
  });
}

// ====== Add Flow ======
function bindAddFlow() {
  // Camera button
  $('#btn-camera').addEventListener('click', () => {
    $('#file-input').setAttribute('capture', 'environment');
    $('#file-input').click();
  });

  // Gallery button
  $('#btn-gallery').addEventListener('click', () => {
    $('#file-input').removeAttribute('capture');
    $('#file-input').click();
  });

  // File selected
  $('#file-input').addEventListener('change', handleFileSelect);

  // Re-pick
  $('#btn-repick').addEventListener('click', () => {
    showStep('upload');
  });

  // Start OCR
  $('#btn-ocr-start').addEventListener('click', startOCR);

  // Save entry
  $('#btn-save').addEventListener('click', saveCurrentEntry);
}

function showStep(step) {
  $$('.add-step').forEach(s => s.classList.add('hidden'));
  const el = $(`#add-step-${step}`);
  if (el) el.classList.remove('hidden');
}

async function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Preprocess image
  const processed = await preprocessImage(file);
  currentImageDataUrl = processed.dataUrl;

  // Show preview
  $('#preview-img').src = processed.dataUrl;
  showStep('preview');

  // Reset file input for re-selection
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

    // Parse the OCR text
    const parsed = parseNutritionText(text);

    // Populate form
    $('#food-name').value = parsed.name || '';
    $('#nf-energy').value = parsed.energy_kj || '';
    $('#nf-protein').value = parsed.protein_g || '';
    $('#nf-fat').value = parsed.fat_g || '';
    $('#nf-carbs').value = parsed.carbs_g || '';
    $('#nf-sodium').value = parsed.sodium_mg || '';
    $('#food-weight').value = '';

    updateEstimatedIntake();
    showStep('result');

    // Show confidence toast
    if (parsed.confidence === 'high') {
      showToast('识别成功！请核对数据');
    } else if (parsed.confidence === 'medium') {
      showToast('部分识别成功，请检查并补充');
    } else {
      showToast('识别效果不佳，请手动输入');
    }
  } catch (err) {
    console.error('OCR error:', err);
    showStep('upload');
    showToast('识别失败：' + (err.message || '请重试'));
  }
}

async function saveCurrentEntry() {
  const name = $('#food-name').value.trim() || '未命名食品';
  const energy_kj = parseFloat($('#nf-energy').value) || 0;
  const protein_g = parseFloat($('#nf-protein').value) || 0;
  const fat_g = parseFloat($('#nf-fat').value) || 0;
  const carbs_g = parseFloat($('#nf-carbs').value) || 0;
  const sodium_mg = parseFloat($('#nf-sodium').value) || 0;
  const weight_g = parseFloat($('#food-weight').value) || 0;

  if (weight_g <= 0) {
    showToast('请输入吃的重量');
    $('#food-weight').focus();
    return;
  }

  const per100g = {
    energy_kj: energy_kj || null,
    protein_g: protein_g || null,
    fat_g: fat_g || null,
    carbs_g: carbs_g || null,
    sodium_mg: sodium_mg || null,
    fiber_g: null,
    sugar_g: null,
  };

  const now = new Date();
  const entry = {
    id: generateId(),
    date: currentDate,
    datetime: now.toISOString(),
    time: formatTime(now),
    name: name,
    thumbnail: currentImageDataUrl ? await createThumbnail(currentImageDataUrl) : null,
    per100g: per100g,
    weight_g: weight_g,
    actualIntake: calcIntake(per100g, weight_g),
  };

  await saveEntry(entry);

  // Reset add form
  showStep('upload');
  currentImageDataUrl = null;
  $$('#page-add input[type=number]').forEach(i => i.value = '');
  $('#food-name').value = '';
  $('#preview-img').src = '';

  showToast('已保存！');
  switchPage('log');
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
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
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

// ====== Manual Entry (skip photo) ======
function bindManualEntry() {
  $('#btn-manual').addEventListener('click', () => {
    currentImageDataUrl = null;
    $('#food-name').value = '';
    $('#nf-energy').value = '';
    $('#nf-protein').value = '';
    $('#nf-fat').value = '';
    $('#nf-carbs').value = '';
    $('#nf-sodium').value = '';
    $('#food-weight').value = '';
    updateEstimatedIntake();
    showStep('result');
  });
}
