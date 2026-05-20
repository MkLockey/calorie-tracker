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
  const p = await getProfileData();
  const rec = p.macros;

  // Summary card
  $('#sum-kcal').textContent = summary.energy_kcal;
  $('#sum-protein').textContent = summary.protein_g;
  $('#sum-fat').textContent = summary.fat_g;
  $('#sum-carbs').textContent = summary.carbs_g;
  $('#sum-fiber').textContent = summary.fiber_g || 0;
  $('#sum-sodium').textContent = summary.sodium_mg;

  // Progress bars (use profile macro recommendations)
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

  const setRec = (id, refVal, actualVal, unit) => {
    const el = $('#' + id);
    if (!el) return;
    const remain = Math.max(0, Math.round((refVal - actualVal) * 10) / 10);
    el.textContent = '推荐 ' + refVal + unit + ' | 还需 ' + remain + unit;
  };
  setRec('log-rec-protein', refProtein, summary.protein_g, 'g');
  setRec('log-rec-fat', refFat, summary.fat_g, 'g');
  setRec('log-rec-carbs', refCarbs, summary.carbs_g, 'g');
  setRec('log-rec-fiber', refFiber, summary.fiber_g || 0, 'g');

  const sodiumRecEl = $('#log-rec-sodium');
  if (sodiumRecEl) {
    sodiumRecEl.textContent = '推荐 ' + refSodium + 'mg';
    sodiumRecEl.style.cssText = '';
  }

  // NRV tags — sodium/water get "还需" placeholder instead of NRV
  setNRVTag('protein', summary.protein_g);
  setNRVTag('fat', summary.fat_g);
  setNRVTag('carbs', summary.carbs_g);
  setNRVTag('fiber', summary.fiber_g || 0);
  // Sodium NRV slot: show remaining
  const nrvSodium = $('#nrv-sodium');
  if (nrvSodium) {
    nrvSodium.textContent = '还需 ' + Math.max(0, refSodium - summary.sodium_mg) + 'mg';
    nrvSodium.style.cssText = 'font-size:0.6rem;color:var(--nrv-remain);font-weight:500;';
  }

  // Water
  const waterMl = await getWater(dateStr);
  const waterGoal = p.water_goal_ml || 2000;
  $('#sum-water').textContent = waterMl;
  $('#bar-water').style.width = Math.min(100, Math.round(waterMl / waterGoal * 100)) + '%';
  const waterRecEl = $('#log-rec-water');
  waterRecEl.textContent = '目标 ' + waterGoal + 'ml';
  waterRecEl.style.cssText = '';
  // Water NRV slot: show remaining
  const nrvWater = $('#nrv-water');
  if (nrvWater) {
    nrvWater.textContent = '还需 ' + Math.max(0, waterGoal - waterMl) + 'ml';
    nrvWater.style.cssText = 'font-size:0.6rem;color:var(--nrv-remain);font-weight:500;';
  }
  const waterInput = $('#water-input');
  if (waterInput) waterInput.value = waterMl || '';

  // Deficit card
  await renderDeficitCard(dateStr, summary.energy_kcal);

  // Food list
  const listEl = $('#food-list');
  if (entries.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><span class="empty-icon">🍽️</span><p>还没有记录，点击右上角 ＋ 添加吧</p></div>`;
    return;
  }

  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack', 'snack_food', 'other'];
  const mealLabel = { breakfast: '🌅 早餐', lunch: '☀️ 午餐', dinner: '🌙 晚餐', snack: '🍪 加餐', snack_food: '🍿 零食', other: '📌 其他' };
  const grouped = {};
  for (const m of mealOrder) grouped[m] = entries.filter(e => (e.meal || 'breakfast') === m).sort((a, b) => b.datetime.localeCompare(a.datetime));

  function renderFoodItem(entry) {
    const kcal = entry.actualIntake?.energy_kj ? Math.round(entry.actualIntake.energy_kj * KJ_TO_KCAL) : 0;
    // Thumbnail: uploaded image > DB emoji > default
    const dbFood = FOOD_DB.find(f => f.name === entry.name);
    let thumbHtml;
    if (entry.thumbnail) {
      thumbHtml = `<img class="food-item-thumb" src="${entry.thumbnail}" alt="" data-longpress="edit">`;
    } else if (dbFood) {
      thumbHtml = `<div class="food-item-thumb food-item-thumb-emoji">${dbFood.emoji || '🍔'}</div>`;
    } else {
      thumbHtml = `<div class="food-item-thumb food-item-thumb-emoji">🍔</div>`;
    }
    return `
    <div class="food-item" data-id="${entry.id}" data-draggable>
      ${thumbHtml}
      <div class="food-item-info">
        <div class="food-item-name">${escapeHtml(entry.name || '未命名食品')} <button class="food-item-pantry-inline" data-pantry-id="${entry.id}" title="保存到仓库">📦</button></div>
        <div class="food-item-meta">
          ${entry.weight_g}g · 蛋白 ${entry.actualIntake?.protein_g || 0}g · 脂肪 ${entry.actualIntake?.fat_g || 0}g · 碳水 ${entry.actualIntake?.carbs_g || 0}g${entry.notes ? ' · 备注' : ''}
          <button class="food-item-edit-inline" data-edit="${entry.id}" title="修改重量">✎</button>
        </div>
      </div>
      <div class="food-item-calories">
        <strong>${kcal}</strong>
        <span>kcal</span>
      </div>
      <button class="food-item-delete" data-delete="${entry.id}">✕</button>
    </div>`;
  }

  let html = '';
  for (const meal of mealOrder) {
    if (grouped[meal].length === 0) continue;
    const mealKcal = grouped[meal].reduce((sum, e) => {
      return sum + (e.actualIntake?.energy_kj ? Math.round(e.actualIntake.energy_kj * KJ_TO_KCAL) : 0);
    }, 0);
    html += `<div class="meal-section">
      <div class="meal-header"><span><span class="meal-arrow">▼</span>${mealLabel[meal]}</span><span class="meal-kcal">${mealKcal} kcal</span></div>
      <div class="meal-collapsed-summary">${grouped[meal].length} 项 · ${mealKcal} kcal</div>
      <div class="meal-body">${grouped[meal].map(renderFoodItem).join('')}</div>
    </div>`;
  }
  listEl.innerHTML = html;

  // Meal section collapse toggle
  listEl.querySelectorAll('.meal-header').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('collapsed');
    });
  });

  // Save to pantry handler
  listEl.querySelectorAll('[data-pantry-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const entry = entries.find(en => en.id === btn.dataset.pantryId);
      if (!entry || !entry.per100g) { showToast('该记录无营养成分数据'); return; }
      await savePantryItem({
        id: generateId(),
        name: entry.name,
        emoji: '📦',
        category: '自定义',
        per100g: entry.per100g,
        source: entry.thumbnail ? 'ocr' : 'manual',
        createdAt: new Date().toISOString(),
      });
      showToast(`"${entry.name}" 已保存到仓库`);
    });
  });

  listEl.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const entry = entries.find(en => en.id === btn.dataset.edit);
      if (!entry) return;
      const foodItem = btn.closest('.food-item');
      const metaEl = foodItem.querySelector('.food-item-meta');
      const originalHTML = metaEl.innerHTML;
      metaEl.innerHTML = `
        <div class="edit-weight-row">
          <input type="number" class="edit-weight-input" value="${entry.weight_g}" step="0.1" min="0" min="0" style="width:80px;padding:2px 6px;font-size:0.78rem;">
          <span style="font-size:0.78rem;color:var(--text-secondary);">g</span>
          <button class="btn btn-xs btn-primary edit-weight-save" style="padding:2px 8px;font-size:0.7rem;">确认</button>
          <button class="btn btn-xs btn-outline edit-weight-cancel" style="padding:2px 8px;font-size:0.7rem;">取消</button>
        </div>`;
      metaEl.querySelector('.edit-weight-save').addEventListener('click', async () => {
        const newWeight = parseFloat(metaEl.querySelector('.edit-weight-input').value) || 0;
        if (newWeight <= 0) { showToast('重量必须大于0'); return; }
        entry.weight_g = newWeight;
        entry.actualIntake = calcIntake(entry.per100g, newWeight);
        await saveEntry(entry);
        await renderLogPage(dateStr);
        showToast('已更新重量');
      });
      metaEl.querySelector('.edit-weight-cancel').addEventListener('click', () => {
        metaEl.innerHTML = originalHTML;
      });
    });
  });

  // Long press thumbnail to edit nutrition (custom foods only)
  listEl.querySelectorAll('.food-item-thumb[data-longpress]').forEach(thumb => {
    let pressTimer;
    thumb.addEventListener('pointerdown', (e) => {
      pressTimer = setTimeout(async () => {
        const foodItem = thumb.closest('.food-item');
        const entryId = foodItem.dataset.id;
        const entry = entries.find(en => en.id === entryId);
        if (!entry || !entry.per100g) return;
        openNutritionEditor(entry);
      }, 600);
    });
    thumb.addEventListener('pointerup', () => clearTimeout(pressTimer));
    thumb.addEventListener('pointerleave', () => clearTimeout(pressTimer));
    thumb.addEventListener('pointermove', () => clearTimeout(pressTimer));
  });

  listEl.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteEntry(btn.dataset.delete);
      await renderLogPage(dateStr);
      showToast('已删除');
    });
  });

  // Drag reorder for each meal section
  listEl.querySelectorAll('.meal-body').forEach(mealBody => {
    enableDragReorder(mealBody, async () => {
      const orderedIds = [...mealBody.querySelectorAll('[data-draggable]')].map(el => el.dataset.id);
      for (let i = 0; i < orderedIds.length; i++) {
        const entry = entries.find(en => en.id === orderedIds[i]);
        if (entry && entry.order !== i) {
          entry.order = i;
          await saveEntry(entry);
        }
      }
    });
  });
}

function openNutritionEditor(entry) {
  // Remove existing overlay if any
  const existing = $('#nutrition-editor-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'nutrition-editor-overlay';
  overlay.className = 'overlay';
  overlay.style.cssText = 'z-index:1000;';
  overlay.innerHTML = `
    <div class="overlay-header">
      <button class="btn btn-text" id="btn-close-nut-editor">✕ 关闭</button>
      <h1>编辑营养值</h1>
      <span style="width:50px"></span>
    </div>
    <div class="overlay-body">
      <div class="result-card">
        <div class="form-group">
          <label>食品名称</label>
          <input type="text" id="nut-editor-name" value="${escapeHtml(entry.name || '')}">
        </div>
        <div class="form-group">
          <label>营养成分（每 100g）</label>
          <div class="nutrition-form">
            <div class="nf-row">
              <span class="nf-label">能量</span>
              <input type="number" id="nut-editor-energy" step="0.1" min="0" value="${entry.per100g.energy_kj || 0}">
              <span class="nf-unit">kJ</span>
            </div>
            <div class="nf-row">
              <span class="nf-label">蛋白质</span>
              <input type="number" id="nut-editor-protein" step="0.1" min="0" value="${entry.per100g.protein_g || 0}">
              <span class="nf-unit">g</span>
            </div>
            <div class="nf-row">
              <span class="nf-label">脂肪</span>
              <input type="number" id="nut-editor-fat" step="0.1" min="0" value="${entry.per100g.fat_g || 0}">
              <span class="nf-unit">g</span>
            </div>
            <div class="nf-row">
              <span class="nf-label">碳水</span>
              <input type="number" id="nut-editor-carbs" step="0.1" min="0" value="${entry.per100g.carbs_g || 0}">
              <span class="nf-unit">g</span>
            </div>
            <div class="nf-row">
              <span class="nf-label">膳食纤维</span>
              <input type="number" id="nut-editor-fiber" step="0.1" min="0" value="${entry.per100g.fiber_g || 0}">
              <span class="nf-unit">g</span>
            </div>
            <div class="nf-row">
              <span class="nf-label">钠</span>
              <input type="number" id="nut-editor-sodium" step="0.1" min="0" value="${entry.per100g.sodium_mg || 0}">
              <span class="nf-unit">mg</span>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>备注</label>
          <input type="text" id="nut-editor-notes" placeholder="例如：品牌、口味、产地等" maxlength="100" value="${escapeHtml(entry.notes || '')}">
        </div>
        <button class="btn btn-primary btn-lg btn-full" id="btn-save-nut-editor">💾 保存修改</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.classList.remove('hidden');

  $('#btn-close-nut-editor').addEventListener('click', () => overlay.remove());
  $('#btn-save-nut-editor').addEventListener('click', async () => {
    entry.name = $('#nut-editor-name').value || entry.name;
    entry.per100g = {
      energy_kj: parseFloat($('#nut-editor-energy').value) || 0,
      protein_g: parseFloat($('#nut-editor-protein').value) || 0,
      fat_g: parseFloat($('#nut-editor-fat').value) || 0,
      carbs_g: parseFloat($('#nut-editor-carbs').value) || 0,
      fiber_g: parseFloat($('#nut-editor-fiber').value) || 0,
      sodium_mg: parseFloat($('#nut-editor-sodium').value) || 0,
    };
    entry.actualIntake = calcIntake(entry.per100g, entry.weight_g);
    entry.notes = $('#nut-editor-notes').value.trim() || null;
    await saveEntry(entry);
    overlay.remove();
    await renderLogPage(currentDate);
    showToast('营养值已更新');
  });
}

function openPantryEditor(item) {
  const existing = $('#pantry-editor-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pantry-editor-overlay';
  overlay.className = 'overlay';
  overlay.style.cssText = 'z-index:1000;';
  overlay.innerHTML = `
    <div class="overlay-header">
      <button class="btn btn-text" id="btn-close-pantry-editor">✕ 关闭</button>
      <h1>编辑仓库食物</h1>
      <span style="width:50px"></span>
    </div>
    <div class="overlay-body">
      <div class="result-card">
        <div class="form-group" style="align-items:center;">
          <label>图片</label>
          <div style="display:flex;align-items:center;gap:12px;">
            ${item.thumbnail
              ? `<img id="pantry-editor-thumb" src="${item.thumbnail}" style="width:64px;height:64px;border-radius:8px;object-fit:cover;background:var(--surface2);">`
              : `<div id="pantry-editor-thumb" class="food-item-thumb food-item-thumb-emoji" style="width:64px;height:64px;font-size:2rem;">${item.emoji || '📦'}</div>`}
            <div>
              <button class="btn btn-sm btn-outline" id="btn-pantry-change-photo">📷 更换照片</button>
              ${item.thumbnail ? '<button class="btn btn-sm btn-outline" id="btn-pantry-remove-photo" style="margin-top:4px;">✕ 移除照片</button>' : ''}
            </div>
            <input type="file" id="pantry-photo-input" accept="image/*" capture="environment" hidden>
          </div>
        </div>
        <div class="form-group">
          <label>食品名称</label>
          <input type="text" id="pantry-editor-name" value="${escapeHtml(item.name || '')}">
        </div>
        <div class="form-group">
          <label>营养成分（每 100g）</label>
          <div class="nutrition-form">
            <div class="nf-row">
              <span class="nf-label">能量</span>
              <input type="number" id="pantry-editor-energy" step="0.1" min="0" value="${item.per100g?.energy_kj || 0}">
              <span class="nf-unit">kJ</span>
            </div>
            <div class="nf-row">
              <span class="nf-label">蛋白质</span>
              <input type="number" id="pantry-editor-protein" step="0.1" min="0" value="${item.per100g?.protein_g || 0}">
              <span class="nf-unit">g</span>
            </div>
            <div class="nf-row">
              <span class="nf-label">脂肪</span>
              <input type="number" id="pantry-editor-fat" step="0.1" min="0" value="${item.per100g?.fat_g || 0}">
              <span class="nf-unit">g</span>
            </div>
            <div class="nf-row">
              <span class="nf-label">碳水</span>
              <input type="number" id="pantry-editor-carbs" step="0.1" min="0" value="${item.per100g?.carbs_g || 0}">
              <span class="nf-unit">g</span>
            </div>
            <div class="nf-row">
              <span class="nf-label">膳食纤维</span>
              <input type="number" id="pantry-editor-fiber" step="0.1" min="0" value="${item.per100g?.fiber_g || 0}">
              <span class="nf-unit">g</span>
            </div>
            <div class="nf-row">
              <span class="nf-label">钠</span>
              <input type="number" id="pantry-editor-sodium" step="0.1" min="0" value="${item.per100g?.sodium_mg || 0}">
              <span class="nf-unit">mg</span>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>备注</label>
          <input type="text" id="pantry-editor-notes" placeholder="例如：品牌、口味、产地等" maxlength="100" value="${escapeHtml(item.notes || '')}">
        </div>
        <button class="btn btn-primary btn-lg btn-full" id="btn-save-pantry-editor">💾 保存修改</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.classList.remove('hidden');

  $('#btn-close-pantry-editor').addEventListener('click', () => overlay.remove());

  // Photo change
  const photoInput = $('#pantry-photo-input');
  const btnChangePhoto = $('#btn-pantry-change-photo');
  const btnRemovePhoto = $('#btn-pantry-remove-photo');
  if (btnChangePhoto) {
    btnChangePhoto.addEventListener('click', () => photoInput.click());
  }
  if (photoInput) {
    photoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const processed = await preprocessImage(file);
        item.thumbnail = processed.dataUrl;
        const thumbEl = $('#pantry-editor-thumb');
        if (thumbEl) {
          thumbEl.outerHTML = `<img id="pantry-editor-thumb" src="${processed.dataUrl}" style="width:64px;height:64px;border-radius:8px;object-fit:cover;background:var(--surface2);">`;
        }
        // Show remove button if not there
        if (!btnRemovePhoto) {
          const btnContainer = btnChangePhoto.parentElement;
          const rmBtn = document.createElement('button');
          rmBtn.className = 'btn btn-sm btn-outline';
          rmBtn.id = 'btn-pantry-remove-photo';
          rmBtn.textContent = '✕ 移除照片';
          rmBtn.style.marginTop = '4px';
          rmBtn.addEventListener('click', () => {
            item.thumbnail = null;
            const tEl = $('#pantry-editor-thumb');
            if (tEl) tEl.outerHTML = '<div id="pantry-editor-thumb" class="food-item-thumb food-item-thumb-emoji" style="width:64px;height:64px;font-size:2rem;">📦</div>';
            rmBtn.remove();
          });
          btnContainer.appendChild(rmBtn);
        }
      } catch (err) {
        showToast('图片处理失败');
      }
    });
  }
  if (btnRemovePhoto) {
    btnRemovePhoto.addEventListener('click', () => {
      item.thumbnail = null;
      const tEl = $('#pantry-editor-thumb');
      if (tEl) tEl.outerHTML = '<div id="pantry-editor-thumb" class="food-item-thumb food-item-thumb-emoji" style="width:64px;height:64px;font-size:2rem;">📦</div>';
      btnRemovePhoto.remove();
    });
  }

  $('#btn-save-pantry-editor').addEventListener('click', async () => {
    item.name = $('#pantry-editor-name').value || item.name;
    item.per100g = {
      energy_kj: parseFloat($('#pantry-editor-energy').value) || 0,
      protein_g: parseFloat($('#pantry-editor-protein').value) || 0,
      fat_g: parseFloat($('#pantry-editor-fat').value) || 0,
      carbs_g: parseFloat($('#pantry-editor-carbs').value) || 0,
      fiber_g: parseFloat($('#pantry-editor-fiber').value) || 0,
      sodium_mg: parseFloat($('#pantry-editor-sodium').value) || 0,
    };
    item.notes = $('#pantry-editor-notes').value.trim() || null;
    await savePantryItem(item);
    overlay.remove();
    await renderPantryPage();
    showToast('仓库食物已更新');
  });
}

function setNRVTag(key, value) {
  const el = $('#nrv-' + key);
  if (!el) return;
  const nrv = calcNRV(value, key + '_g');
  if (nrv != null) {
    el.textContent = nrv + '% NRV';
  } else {
    el.textContent = '';
  }
}

async function renderDeficitCard(dateStr, intakeKcal) {
  const p = await getProfileData();
  const bmr = p.bmr || 0;
  const tdee = p.tdee || 0;
  const exerciseKcal = await getExercise(dateStr);

  $('#def-tdee').innerHTML = '<span class="deficit-kcal-tdee">' + (tdee || '--') + '</span>';
  $('#def-intake').innerHTML = '<span class="deficit-kcal-intake">' + intakeKcal + '</span>';

  // Today's total consumption
  let todayTotalOut;
  if (p.tdeeBreakdown.mode === 'comprehensive') {
    todayTotalOut = tdee;
  } else {
    todayTotalOut = calcTodayTDEE(bmr, p.activity_level, exerciseKcal);
  }
  $('#def-total-out').innerHTML = '<span class="deficit-kcal-out">' + (todayTotalOut || '--') + '</span>';

  // Exercise input (only in split mode)
  const exRow = document.querySelector('.deficit-exercise');
  const input = $('#exercise-input');
  if (exRow) {
    if (p.tdeeBreakdown.mode !== 'comprehensive') {
      exRow.style.display = '';
      if (input) {
        input.value = exerciseKcal || '';
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        newInput.addEventListener('change', async () => {
          const val = parseFloat(newInput.value) || 0;
          await saveExercise(dateStr, val);
          await renderLogPage(dateStr);
        });
      }
    } else {
      exRow.style.display = 'none';
    }
  }

  // Exercise suggestion hint
  const hintEl = $('#exercise-hint');
  if (hintEl) {
    const sugEx = p.suggestedExerciseCalories || 0;
    if (sugEx > 0 && p.tdeeBreakdown.mode !== 'comprehensive') {
      hintEl.textContent = '(建议运动 ' + sugEx + ' kcal)';
    } else {
      hintEl.textContent = '';
    }
  }

  if (bmr > 0) {
    const gap = intakeKcal - todayTotalOut;
    $('#def-gap').textContent = Math.abs(gap);
    $('#def-gap').className = gap > 0 ? 'surplus' : '';
    $('#def-label').textContent = gap > 0 ? '盈余' : gap < 0 ? '' : '平衡';

    // Target deficit comparison
    if (p.deltaComparison) {
      $('#def-target-row').classList.remove('hidden');
      const tSign = p.deltaComparison.targetDelta > 0 ? '+' : '';
      $('#def-target-gap').textContent = tSign + p.deltaComparison.targetDelta + ' kcal/天';
    } else {
      $('#def-target-row').classList.add('hidden');
    }
  } else {
    $('#def-gap').textContent = '--';
    $('#def-label').textContent = '需设置身体参数';
    $('#def-target-row').classList.add('hidden');
  }

  // 折叠摘要
  const summaryEl = $('#deficit-summary');
  if (summaryEl) {
    const gapText = $('#def-gap').textContent;
    const labelText = $('#def-label').textContent;
    const targetRow = $('#def-target-row');
    const targetText = !targetRow.classList.contains('hidden') ? $('#def-target-gap').textContent : '';
    if (gapText !== '--' && labelText !== '需设置身体参数') {
      summaryEl.textContent = (labelText || '缺口') + ' ' + gapText + ' kcal' + (targetText ? '  |  目标 ' + targetText : '');
    } else {
      summaryEl.textContent = '';
    }
  }
}


// ====== Stats Page ======
let currentChartType = 'bar';
let currentStatsData = null;
let currentStatsNutrient = 'energy_kcal';

const NUTRIENT_LABELS = {
  energy_kcal: ['每日热量摄入趋势', 'kcal'],
  protein_g: ['每日蛋白质摄入趋势', 'g'],
  fat_g: ['每日脂肪摄入趋势', 'g'],
  carbs_g: ['每日碳水摄入趋势', 'g'],
  fiber_g: ['每日纤维摄入趋势', 'g'],
  sodium_mg: ['每日钠摄入趋势', 'mg'],
};

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
  renderChart(allDates, byDate, currentChartType, currentStatsNutrient);

  const avg = calcAverages(byDate);
  if (avg) {
    $('#avg-kcal').textContent = avg.energy_kcal;
    $('#avg-protein').textContent = avg.protein_g;
    $('#avg-fat').textContent = avg.fat_g;
    $('#avg-carbs').textContent = avg.carbs_g;
  }

  // Nutrient comparison & deficit
  const p = await getProfileData();
  const compData = [
    { label: '蛋白质', unit: 'g', actual: avg?.protein_g || 0, rec: p.macros.protein_g, cls: 'protein' },
    { label: '脂肪', unit: 'g', actual: avg?.fat_g || 0, rec: p.macros.fat_g, cls: 'fat' },
    { label: '碳水', unit: 'g', actual: avg?.carbs_g || 0, rec: p.macros.carbs_g, cls: 'carbs' },
    { label: '纤维', unit: 'g', actual: avg?.fiber_g || 0, rec: p.macros.fiber_g, cls: 'fiber' },
    { label: '钠', unit: 'mg', actual: avg?.sodium_mg || 0, rec: 2000, cls: 'sodium' },
  ];

  let compHtml = '';
  for (const c of compData) {
    const pct = c.rec > 0 ? Math.min(100, Math.round(c.actual / c.rec * 100)) : 0;
    const diff = Math.round((c.actual - c.rec) * 10) / 10;
    const diffStr = diff > 0 ? '+' + diff : '' + diff;
    const diffCls = diff > 0 ? 'nutrient-over' : 'nutrient-under';
    compHtml += `
    <div class="nutrient-compare-row">
      <span class="nc-label">${c.label}</span>
      <div class="nc-bar-wrap">
        <div class="nc-bar ${c.cls}" style="width:${pct}%"></div>
        <span class="nc-actual">${c.actual}</span>
      </div>
      <span class="nc-rec">/ ${c.rec}${c.unit}</span>
      <span class="nc-diff ${diffCls}">${diffStr}</span>
    </div>`;
  }
  $('#nutrient-compare').innerHTML = compHtml;

  // Deficit comparison
  if (p.target_weight_kg && p.target_date && p.bmr > 0) {
    const defInfo = calcDailyEnergyDelta(p.weight_kg, p.target_weight_kg, p.target_date);
    // Target total deficit = weight diff × 7700 kcal/kg
    const targetTotalDeficit = Math.abs(defInfo.totalKcal);

    // Actual total deficit = sum of daily (intake - tdee - exercise), only days with entries
    const exerciseMap = await getExerciseByDateRange(fromDate, toDate);
    let actualTotalDeficit = 0;
    for (const date of allDates) {
      const dayEntries = byDate[date];
      if (!dayEntries || dayEntries.length === 0) continue;
      const intakeKcal = calcDailySummary(dayEntries).energy_kcal;
      const exerciseKcal = exerciseMap[date] || 0;
      let dayTotalOut;
      if (p.tdeeBreakdown?.mode === 'comprehensive') {
        dayTotalOut = (p.tdeeBreakdown?.dailyBase || 0) + exerciseKcal;
      } else {
        dayTotalOut = Math.round(((p.tdeeBreakdown?.dailyBase || 0) + exerciseKcal) / (1 - TEF_RATE));
      }
      const dayDeficit = intakeKcal - dayTotalOut;
      actualTotalDeficit += dayDeficit;
    }

    $('#stats-deficit-card').classList.remove('hidden');
    const targetEl = $('#stats-target-deficit');
    targetEl.textContent = targetTotalDeficit;
    targetEl.style.color = 'var(--rec-bmi-overweight)';
    const actualEl = $('#stats-actual-deficit');
    actualEl.textContent = Math.abs(Math.round(actualTotalDeficit));
    actualEl.style.color = 'var(--success)';
    const gapRemain = targetTotalDeficit - Math.abs(actualTotalDeficit);
    const gapEl = $('#stats-deficit-gap');
    gapEl.textContent = Math.abs(Math.round(gapRemain));
    gapEl.className = '';
    gapEl.style.color = gapRemain > 0 ? 'var(--kcal-deficit-out)' : 'var(--success)';
  } else {
    $('#stats-deficit-card').classList.add('hidden');
  }
}

function renderChart(dates, byDate, type, nutrient) {
  const nut = nutrient || 'energy_kcal';
  const [title, unit] = NUTRIENT_LABELS[nut] || ['每日热量摄入趋势', 'kcal'];
  const titleEl = $('#chart-title');
  if (titleEl) titleEl.textContent = title;

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

  const hasData = dailyValues.some(v => v > 0);
  if (!hasData) {
    $('#chart-calories').innerHTML = '<div class="empty-state small"><p>数据不足</p></div>';
    return;
  }

  if (type === 'line') {
    renderLineChart(dates, dailyValues, unit);
  } else {
    renderBarChart(dates, dailyValues, unit);
  }
  // Scroll to rightmost (most recent data) + enable drag scroll
  setTimeout(() => {
    const wrap = document.querySelector('.chart-line-wrap');
    if (wrap) {
      wrap.scrollLeft = wrap.scrollWidth;
      // Drag-to-scroll
      let dragging = false, startX, startScroll;
      wrap.addEventListener('pointerdown', (e) => {
        dragging = true; startX = e.clientX; startScroll = wrap.scrollLeft;
        wrap.style.cursor = 'grabbing';
      });
      window.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        wrap.scrollLeft = startScroll - (e.clientX - startX);
      });
      window.addEventListener('pointerup', () => {
        dragging = false;
        if (wrap) wrap.style.cursor = 'grab';
      });
      wrap.style.cursor = 'grab';
    }
  }, 50);
}

function renderBarChart(dates, dailyValues, unit) {
  const maxVal = Math.max(...dailyValues, 1);
  const barH = 160;
  const steps = 5;
  const yLabels = [];
  for (let i = 0; i <= steps; i++) {
    const val = Math.round((maxVal / steps) * (steps - i));
    yLabels.push(val);
  }

  const bars = dailyValues.map((val, i) => {
    const h = Math.max(2, (val / maxVal) * barH);
    return `
      <div class="chart-bar-wrapper">
        <div class="chart-bar" style="height:${h}px">
          ${val > 0 ? `<span class="chart-bar-value">${val}</span>` : ''}
        </div>
        <span class="chart-bar-label">${dates[i].slice(5)}</span>
      </div>`;
  }).join('');

  const gridLines = yLabels.map((_, i) => {
    const top = (i / steps) * 100;
    return `<div class="chart-grid-line" style="top:${top}%"></div>`;
  }).join('');

  $('#chart-calories').innerHTML = `
    <div class="chart-line-wrap">
      <div class="chart-bars-wrap">
        <div class="chart-y-labels">
          ${yLabels.map(v => `<span>${v}${unit||''}</span>`).join('')}
        </div>
        <div class="chart-bars-area" style="min-width:${dailyValues.length * 50}px;">
          <div class="chart-grid-lines">${gridLines}</div>
          <div class="chart-bars">${bars}</div>
        </div>
      </div>
    </div>`;
}

function renderLineChart(dates, dailyValues, unit) {
  const maxVal = Math.max(...dailyValues, 1);
  const n = dailyValues.length;
  const padTop = 20, padBottom = 30, padLeft = 34, padRight = 10;
  const plotH = 150;
  const h = padTop + plotH + padBottom;
  const pointGap = 44;
  const plotW = pointGap * Math.max(1, n - 1);
  const w = padLeft + plotW + padRight;

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
    return `<circle cx="${xs[i]}" cy="${y}" r="3" class="data-point"/>`;
  }).join('');

  const labelStep = n > 20 ? 5 : n > 10 ? 2 : 1;
  const labels = dates.map((d, i) => {
    if (i % labelStep !== 0 && i !== n - 1) return '';
    return `<text x="${xs[i]}" y="${h - 6}" class="axis-label">${d.slice(5)}</text>`;
  }).join('');

  const svgW = Math.max(w, 320);

  $('#chart-calories').innerHTML = `
    <div class="chart-line-wrap">
      <svg class="chart-line-svg" width="${svgW}" height="${h}" viewBox="0 0 ${svgW} ${h}">
        ${yGrid}
        <polyline points="${points}" class="data-line"/>
        ${circles}
        ${labels}
      </svg>
    </div>`;
}

// ====== Profile Page ======
async function renderProfilePage() {
  // Sync theme toggle
  const themeToggle = $('#theme-toggle');
  if (themeToggle) {
    themeToggle.checked = document.documentElement.dataset.theme === 'dark';
  }

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

  // Frame buttons
  const frame = p.frame_size || 'medium';
  $$('.frame-btn').forEach(b => {
    b.classList.toggle('btn-active', b.dataset.frame === frame);
    b.classList.toggle('btn-outline', b.dataset.frame !== frame);
  });

  // Body goal buttons
  const bodyGoal = p.body_goal || 'fit';
  $$('.bodygoal-btn').forEach(b => {
    b.classList.toggle('btn-active', b.dataset.bodygoal === bodyGoal);
    b.classList.toggle('btn-outline', b.dataset.bodygoal !== bodyGoal);
  });

  // Custom BMR
  const useCustom = p.use_custom_bmr === true;
  $('#use-custom-bmr').checked = useCustom;
  $('#custom-bmr-value').value = (useCustom && p.custom_bmr) ? p.custom_bmr : '';
  $('#custom-bmr-row').classList.toggle('hidden', !useCustom);

  // Target weight & date
  $('#pf-target-weight').value = p.target_weight_kg || '';
  $('#pf-target-date').value = p.target_date || '';
  $('#pf-water-goal').value = p.water_goal_ml || 2000;

  // Body fat — always show calculated value, only editable when custom toggle ON
  const pd = await getProfileData();
  const useCustomBf = p.use_custom_bodyfat === true;
  $('#use-custom-bodyfat').checked = useCustomBf;
  $('#pf-bodyfat').value = pd.bodyFatPct;
  $('#pf-bodyfat').readOnly = !useCustomBf;
  $('#pf-bodyfat').style.opacity = useCustomBf ? '1' : '0.6';

  // Activity level label based on TDEE mode
  const actLabel = $('#pf-activity-label');
  if (actLabel) {
    actLabel.textContent = pd.tdeeBreakdown.mode === 'comprehensive' ? '综合活动水平' : '日常活动水平';
  }

  await updateProfileResults();
}

async function updateProfileResults() {
  const p = await getProfileData();
  const bmi = p.bmi;
  const bmiCat = p.bmiCategory;
  const bmiCatClass = bmiCat === '偏瘦' ? 'underweight' : bmiCat === '正常' ? 'normal' : bmiCat === '超重' ? 'overweight' : 'obese';
  $('#rec-bmi').innerHTML = '<span class="rec-num rec-num-bmi ' + bmiCatClass + '">' + bmi + '</span>';

  // 健康体重 (标准BMI 18.5-24)
  const hw = calcHealthyWeightRange(p.height_cm);
  const bmiRangeEl = $('#rec-bmi-range');
  bmiRangeEl.innerHTML = '<span class="rec-num rec-num-weight">' + hw.min + ' - ' + hw.max + ' kg</span> (<span class="rec-num rec-num-weight-light">BMI 18.5-24</span>)';

  // 推荐体脂率: 数值白色，去掉"目标"
  const bfSource = p.use_custom_bodyfat ? '(自定义)' : '(公式估算)';
  const bfEl = $('#rec-bodyfat');
  bfEl.innerHTML = '<span class="rec-num rec-num-bodyfat">' + p.bodyFatTarget.min + '%-' + p.bodyFatTarget.max + '%</span> (' + p.bodyFatTarget.label + ') | <span class="rec-num rec-num-bodyfat">' + p.bodyFatPct + '%</span> ' + bfSource;

  if (!p.use_custom_bodyfat) {
    $('#pf-bodyfat').value = p.bodyFatPct;
  }

  $('#rec-bmr').innerHTML = '<span class="rec-num rec-num-bmr">' + p.bmr + '</span>';

  const bmrSource = $('#rec-bmr-source');
  if (p.use_custom_bmr && p.custom_bmr != null && p.custom_bmr > 0) {
    bmrSource.textContent = '(自定义)';
    bmrSource.className = 'rec-note custom-bmr-badge';
  } else {
    bmrSource.textContent = '(公式计算)';
    bmrSource.className = 'rec-note';
  }

  $('#rec-tdee').innerHTML = '<span class="rec-num rec-num-tdee">' + p.tdee + '</span>';
  // TDEE detail: 综合模式显示旧活动标签，拆分模式分解为静息+日常活动+运动+TEF
  if (p.tdeeBreakdown.mode === 'comprehensive') {
    const compLabel = COMPREHENSIVE_ACTIVITY_LABELS[p.activity_level] || '中度活动';
    $('#rec-tdee-breakdown').textContent = '= BMR × ' + p.tdeeBreakdown.factor + ' (' + compLabel + ', 含典型运动)';
  } else {
    const bonus = p.tdeeBreakdown.dailyActivityBonus || (p.tdeeBreakdown.dailyBase - p.bmr);
    $('#rec-tdee-breakdown').textContent = '静息 ' + p.bmr + ' + 日常活动 ' + bonus + ' + 运动 ' + (p.tdeeBreakdown.exerciseAvg || 0) + ' + TEF ' + p.tdeeBreakdown.tefKcal;
  }
  // 推荐营养热量 = 独立营养素汇总
  $('#rec-goal-kcal').textContent = p.macros.energy_kcal;
  const recDiff = p.macros.energy_kcal - p.tdee;
  const diffSign = recDiff > 0 ? '+' : '';
  const diffLabel = recDiff > 0 ? '较今日消耗 +' : '较今日消耗 ';
  const diffEl = $('#rec-goal-diff');
  if (diffEl) {
    diffEl.textContent = diffLabel + recDiff + ' kcal/天';
    diffEl.className = 'rec-calories-subtitle';
  }

  // Delta comparison + suggested exercise display (target date exists)
  const deltaCompEl = $('#rec-delta-compare');
  if (deltaCompEl) {
    if (p.deltaComparison) {
      const dc = p.deltaComparison;
      const targetSign = dc.targetDelta > 0 ? '+' : '';
      const sugEx = dc.suggestedExerciseCalories || 0;
      let html = `
        <div class="delta-row"><span>目标周期所需</span><strong class="delta-target">${targetSign}${dc.targetDelta}</strong> kcal/天</div>`;
      if (sugEx > 0) {
        html += `<div class="delta-row"><span>建议运动消耗</span><strong class="delta-exercise">${sugEx}</strong> kcal/天</div>`;
      } else {
        html += `<div class="delta-row"><span>建议运动消耗</span><strong class="delta-exercise">--</strong> kcal/天</div>`;
      }
      deltaCompEl.innerHTML = html;
      deltaCompEl.classList.remove('hidden');
    } else {
      deltaCompEl.classList.add('hidden');
      deltaCompEl.innerHTML = '';
    }
  }

  // Activity level label: split mode → 日常活动水平, comprehensive → 综合活动水平
  const actLabel = $('#pf-activity-label');
  if (actLabel) {
    actLabel.textContent = p.tdeeBreakdown.mode === 'comprehensive' ? '综合活动水平' : '日常活动水平';
  }

  $('#rec-protein').textContent = p.macros.protein_g;
  $('#rec-fat').textContent = p.macros.fat_g;
  $('#rec-carbs').textContent = p.macros.carbs_g;
  $('#rec-fiber').textContent = p.macros.fiber_g;

  // 推荐体重 (体型 + 骨架)
  const wr = calcRecommendedWeightRange(p.height_cm, p.body_goal || 'fit', p.frame_size || 'medium');
  const wrEl = $('#rec-weight-range');
  wrEl.innerHTML = '<span class="rec-num rec-num-weight">' + wr.min + ' - ' + wr.max + ' kg</span> (中值 <span class="rec-num rec-num-weight-light">' + wr.mid + ' kg</span>)';


  // BMI tag
  const tag = $('#rec-bmi-tag');
  tag.textContent = p.bmiCategory;
  tag.className = 'rec-tag';
  if (p.bmiCategory === '偏瘦') tag.classList.add('underweight');
  else if (p.bmiCategory === '正常') tag.classList.add('normal');
  else if (p.bmiCategory === '超重') tag.classList.add('overweight');
  else tag.classList.add('obese');

  // Warnings removed - hidden always
  const warningsEl = $('#rec-warnings');
  if (warningsEl) {
    warningsEl.classList.add('hidden');
    warningsEl.innerHTML = '';
  }
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

// ====== Pantry Page ======
async function renderPantryPage() {
  // Show/hide user food DB banner
  const userDB = getUserFoodDB();
  const banner = $('#user-db-banner');
  if (banner) banner.classList.toggle('hidden', userDB.length === 0);

  const items = await getAllPantryItems();
  const listEl = $('#pantry-list');
  if (items.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><span class="empty-icon">📦</span><p>仓库是空的<br>在记录页添加食物后，可点击 📦 保存到仓库</p></div>`;
    return;
  }
  listEl.innerHTML = items.map(item => {
    const kcal = calcKcal(item.per100g?.energy_kj);
    const dbFood = FOOD_DB.find(f => f.name === item.name);
    let thumbHtml;
    if (item.thumbnail) {
      thumbHtml = `<img class="food-item-thumb" src="${item.thumbnail}" alt="">`;
    } else if (dbFood) {
      thumbHtml = `<div class="food-item-thumb food-item-thumb-emoji">${dbFood.emoji || '📦'}</div>`;
    } else {
      thumbHtml = `<div class="food-item-thumb food-item-thumb-emoji">${item.emoji || '📦'}</div>`;
    }
    return `
    <div class="food-item pantry-item" data-pantry="${item.id}" data-draggable>
      ${thumbHtml}
      <div class="food-item-info">
        <div class="food-item-name">${escapeHtml(item.name)}${item.source === 'database' ? ' <span style="font-size:0.65rem;color:var(--text-secondary)">(数据库)</span>' : ''}${item.source === 'userdb' ? ' <span style="font-size:0.65rem;color:var(--accent)">(数据库-用户收录)</span>' : ''} <button class="food-item-edit-inline" data-edit-pantry="${item.id}" title="编辑">✎</button>${item.source && item.source !== 'database' && item.source !== 'userdb' ? ' <button class="food-item-add-db-inline" data-add-to-db="' + item.id + '" title="收录到数据库" style="font-size:0.65rem;color:var(--accent);">📥收录</button>' : ''}</div>
        <div class="food-item-meta">
          ${item.category} · 蛋白 ${item.per100g?.protein_g || 0}g · 脂肪 ${item.per100g?.fat_g || 0}g · 碳水 ${item.per100g?.carbs_g || 0}g${item.notes ? ' · 备注' : ''}
        </div>
        <div class="pantry-quick-log">
          <select class="pq-meal" data-pantry-meal="${item.id}">
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
      </div>
      <button class="food-item-delete" data-delete-pantry="${item.id}">🗑</button>
    </div>`;
  }).join('');

  listEl.querySelectorAll('[data-delete-pantry]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deletePantryItem(btn.dataset.deletePantry);
      await renderPantryPage();
      showToast('已从仓库删除');
    });
  });

  listEl.querySelectorAll('[data-edit-pantry]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = items.find(i => i.id === btn.dataset.editPantry);
      if (item) openPantryEditor(item);
    });
  });

  listEl.querySelectorAll('[data-add-to-db]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = items.find(i => i.id === btn.dataset.addToDb);
      if (item && confirm(`将「${item.name}」收录到公共数据库？收录后可在搜索中直接使用。`)) {
        addUserFoodToDB(item);
        btn.remove();
        showToast('已收录到数据库');
      }
    });
  });

  bindPantryQuickLog(listEl, items);

  enableDragReorder(listEl, async () => {
    const orderedIds = [...listEl.querySelectorAll('[data-draggable]')].map(el => el.dataset.pantry);
    // Update order in IndexedDB
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

function bindPantryQuickLog(listEl, items) {
  listEl.querySelectorAll('.pq-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pantryItem = btn.closest('[data-pantry]');
      const pantryId = pantryItem.dataset.pantry;
      const item = items.find(i => i.id === pantryId);
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

// ====== Add Overlay ======
function openAddOverlay() {
  $('#add-overlay').classList.remove('hidden');
  showStep('upload');
  currentImageDataUrl = null;
  // Clear all image elements
  $('#preview-img').src = '';
  const resultImg = $('#result-preview-img');
  if (resultImg) { resultImg.src = ''; resultImg.style.display = 'none'; resultImg.style.cursor = ''; }
}

function closeAddOverlay() {
  $('#add-overlay').classList.add('hidden');
  currentImageDataUrl = null;
  $('#preview-img').src = '';
  const resultImg = $('#result-preview-img');
  if (resultImg) { resultImg.src = ''; resultImg.style.display = 'none'; resultImg.style.cursor = ''; }
  // Reset pantry mode if active
  if (typeof addOverlayPantryMode !== 'undefined' && addOverlayPantryMode) {
    addOverlayPantryMode = false;
    const saveBtn = $('#btn-save');
    const pantryBtn = $('#btn-save-pantry');
    if (saveBtn) saveBtn.textContent = '💾 保存记录';
    if (pantryBtn) pantryBtn.classList.remove('hidden');
  }
}

async function openUserFoodDBOverlay() {
  const existing = $('#user-db-overlay');
  if (existing) existing.remove();

  const userDB = getUserFoodDB();
  const overlay = document.createElement('div');
  overlay.id = 'user-db-overlay';
  overlay.className = 'overlay';
  overlay.style.cssText = 'z-index:1000;';
  overlay.innerHTML = `
    <div class="overlay-header">
      <button class="btn btn-text" id="btn-close-user-db">✕ 关闭</button>
      <h1>📥 用户收录食物库</h1>
      <span style="width:50px"></span>
    </div>
    <div class="overlay-body">
      ${userDB.length === 0 ? '<div class="empty-state"><span class="empty-icon">📥</span><p>还没有收录任何食物<br>在仓库中点击「📥收录」按钮即可添加</p></div>' : userDB.map(food => {
        const kcal = calcKcal(food.per100g?.energy_kj);
        return `
        <div class="food-item" style="margin-bottom:8px;" data-user-food="${escapeHtml(food.name)}">
          ${food.thumbnail ? `<img class="food-item-thumb" src="${food.thumbnail}" alt="" style="width:48px;height:48px;">` : `<div class="food-item-thumb food-item-thumb-emoji" style="width:48px;height:48px;font-size:1.5rem;">📦</div>`}
          <div class="food-item-info">
            <div class="food-item-name">${escapeHtml(food.name)} <span style="font-size:0.65rem;color:var(--accent);">(用户收录)</span> <button class="food-item-edit-inline" data-edit-user-food="${escapeHtml(food.name)}">✎</button></div>
            <div class="food-item-meta">
              ${food.category} · 蛋白 ${food.per100g?.protein_g || 0}g · 脂肪 ${food.per100g?.fat_g || 0}g · 碳水 ${food.per100g?.carbs_g || 0}g${food.notes ? ' · 备注' : ''}
            </div>
          </div>
          <div class="food-item-calories">
            <strong>${kcal}</strong>
            <span>kcal/100g</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <button class="btn btn-xs btn-primary" data-add-db-pantry="${escapeHtml(food.name)}" style="font-size:0.6rem;">存库</button>
            <button class="btn btn-xs btn-outline" data-remove-user-db="${escapeHtml(food.name)}" style="font-size:0.6rem;color:var(--danger);">取消收录</button>
            ${food._original ? `<button class="btn btn-xs btn-outline" data-restore-user-db="${escapeHtml(food.name)}" style="font-size:0.6rem;color:var(--warning);">↩ 复原</button>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  document.body.appendChild(overlay);
  overlay.classList.remove('hidden');

  $('#btn-close-user-db').addEventListener('click', () => {
    overlay.remove();
    const banner = $('#user-db-banner');
    if (banner) banner.classList.toggle('hidden', getUserFoodDB().length === 0);
  });

  overlay.querySelectorAll('[data-add-db-pantry]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const name = btn.dataset.addDbPantry;
      const dbFood = loadUserFoodDB().find(f => f.name === name);
      if (!dbFood) return;
      await savePantryItem({
        id: generateId(),
        name: dbFood.name,
        emoji: dbFood.emoji || '📦',
        category: dbFood.category,
        per100g: { ...dbFood.per100g },
        notes: dbFood.notes || null,
        thumbnail: dbFood.thumbnail || null,
        source: 'userdb',
        createdAt: new Date().toISOString(),
      });
      if (currentPage === 'pantry') await renderPantryPage();
      showToast(`"${dbFood.name}" 已存到仓库`);
    });
  });

  overlay.querySelectorAll('[data-remove-user-db]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.removeUserDb;
      if (confirm(`确定取消收录「${name}」？将从公共数据库中移除。`)) {
        removeUserFoodFromDB(name);
        btn.closest('.food-item').remove();
        showToast(`已取消收录「${name}」`);
        if (getUserFoodDB().length === 0) {
          overlay.querySelector('.overlay-body').innerHTML = '<div class="empty-state"><span class="empty-icon">📥</span><p>还没有收录任何食物<br>在仓库中点击「📥收录」按钮即可添加</p></div>';
        }
      }
    });
  });

  overlay.querySelectorAll('[data-restore-user-db]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.restoreUserDb;
      if (confirm(`确定复原「${name}」到初始收录状态？`)) {
        if (restoreUserFoodInDB(name)) {
          overlay.remove();
          openUserFoodDBOverlay();
          showToast(`「${name}」已复原`);
        }
      }
    });
  });

  overlay.querySelectorAll('[data-edit-user-food]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.editUserFood;
      const food = getUserFoodDB().find(f => f.name === name);
      if (!food) return;
      const wrapper = btn.closest('.food-item');
      const metaEl = wrapper.querySelector('.food-item-meta');
      if (!metaEl) return;
      const origHTML = metaEl.innerHTML;
      metaEl.innerHTML = `
        <div class="nutrition-form" style="margin-top:4px;">
          <div class="nf-row"><span class="nf-label">能量</span><input type="number" class="uf-edit-energy" value="${food.per100g.energy_kj || 0}" step="0.1" min="0" style="width:70px;padding:2px 4px;font-size:0.7rem;"><span class="nf-unit">kJ</span></div>
          <div class="nf-row"><span class="nf-label">蛋白</span><input type="number" class="uf-edit-protein" value="${food.per100g.protein_g || 0}" step="0.1" min="0" style="width:70px;padding:2px 4px;font-size:0.7rem;"><span class="nf-unit">g</span></div>
          <div class="nf-row"><span class="nf-label">脂肪</span><input type="number" class="uf-edit-fat" value="${food.per100g.fat_g || 0}" step="0.1" min="0" style="width:70px;padding:2px 4px;font-size:0.7rem;"><span class="nf-unit">g</span></div>
          <div class="nf-row"><span class="nf-label">碳水</span><input type="number" class="uf-edit-carbs" value="${food.per100g.carbs_g || 0}" step="0.1" min="0" style="width:70px;padding:2px 4px;font-size:0.7rem;"><span class="nf-unit">g</span></div>
          <div class="nf-row"><span class="nf-label">纤维</span><input type="number" class="uf-edit-fiber" value="${food.per100g.fiber_g || 0}" step="0.1" min="0" style="width:70px;padding:2px 4px;font-size:0.7rem;"><span class="nf-unit">g</span></div>
          <div class="nf-row"><span class="nf-label">钠</span><input type="number" class="uf-edit-sodium" value="${food.per100g.sodium_mg || 0}" step="0.1" min="0" style="width:70px;padding:2px 4px;font-size:0.7rem;"><span class="nf-unit">mg</span></div>
          <div class="nf-row"><span class="nf-label">备注</span><input type="text" class="uf-edit-notes" value="${escapeHtml(food.notes || '')}" placeholder="备注" maxlength="100" style="width:120px;padding:2px 4px;font-size:0.7rem;"></div>
          <div style="display:flex;gap:6px;margin-top:6px;">
            <button class="btn btn-xs btn-primary save-user-food-edit">💾 保存</button>
            <button class="btn btn-xs btn-outline cancel-user-food-edit">取消</button>
          </div>
        </div>`;
      metaEl.querySelector('.save-user-food-edit').addEventListener('click', () => {
        const updated = {
          name: food.name,
          category: '用户收录',
          thumbnail: food.thumbnail,
          per100g: {
            energy_kj: parseFloat(metaEl.querySelector('.uf-edit-energy').value) || 0,
            protein_g: parseFloat(metaEl.querySelector('.uf-edit-protein').value) || 0,
            fat_g: parseFloat(metaEl.querySelector('.uf-edit-fat').value) || 0,
            carbs_g: parseFloat(metaEl.querySelector('.uf-edit-carbs').value) || 0,
            fiber_g: parseFloat(metaEl.querySelector('.uf-edit-fiber').value) || 0,
            sodium_mg: parseFloat(metaEl.querySelector('.uf-edit-sodium').value) || 0,
          },
          notes: metaEl.querySelector('.uf-edit-notes')?.value?.trim() || null,
        };
        addUserFoodToDB(updated);
        // Update the display
        const newKcal = calcKcal(updated.per100g.energy_kj);
        const newMeta = `用户收录 · 蛋白 ${updated.per100g.protein_g}g · 脂肪 ${updated.per100g.fat_g}g · 碳水 ${updated.per100g.carbs_g}g${updated.notes ? ' · 备注' : ''}`;
        metaEl.innerHTML = newMeta;
        const kcalEl = wrapper.querySelector('.food-item-calories');
        if (kcalEl) kcalEl.innerHTML = `<strong>${newKcal}</strong><span>kcal/100g</span>`;
        showToast('已更新');
      });
      metaEl.querySelector('.cancel-user-food-edit').addEventListener('click', () => {
        metaEl.innerHTML = origHTML;
      });
    });
  });
}

// Long-press drag-to-reorder
function enableDragReorder(containerEl, onReorder) {
  let pressTimer = null;
  let ghost = null;
  let dragItem = null;
  let dragStartY = 0;
  let dragOffsetY = 0;
  let isDragging = false;

  function getItem(el) {
    return el ? el.closest('[data-draggable]') : null;
  }

  function getIndex(el) {
    return [...containerEl.querySelectorAll('[data-draggable]')].indexOf(el);
  }

  containerEl.addEventListener('pointerdown', (e) => {
    // Skip interactive elements inside the item
    if (e.target.closest('button,input,select,a')) return;
    const item = getItem(e.target);
    if (!item || isDragging) return;
    dragItem = item;
    dragStartY = e.clientY;
    const rect = item.getBoundingClientRect();
    dragOffsetY = e.clientY - rect.top;

    pressTimer = setTimeout(() => {
      isDragging = true;
      item.style.opacity = '0.3';
      item.style.transition = 'none';
      ghost = item.cloneNode(true);
      ghost.style.cssText = `
        position:fixed; left:${rect.left}px; top:${rect.top}px;
        width:${rect.width}px; z-index:1000; opacity:0.95;
        box-shadow:0 8px 24px var(--shadow-light); pointer-events:none;
        transition:none;
      `;
      document.body.appendChild(ghost);
      containerEl.setPointerCapture(e.pointerId);
    }, 500);
  });

  containerEl.addEventListener('pointermove', (e) => {
    if (!isDragging || !ghost) return;
    ghost.style.top = (e.clientY - dragOffsetY) + 'px';

    const allItems = [...containerEl.querySelectorAll('[data-draggable]')];
    const ghostMid = e.clientY;
    let targetIdx = -1;
    for (let i = 0; i < allItems.length; i++) {
      const r = allItems[i].getBoundingClientRect();
      if (ghostMid < r.top + r.height / 2) { targetIdx = i; break; }
    }
    if (targetIdx === -1) targetIdx = allItems.length;

    const dragIdx = getIndex(dragItem);
    if (targetIdx !== dragIdx && targetIdx !== dragIdx + 1) {
      const target = targetIdx < allItems.length ? allItems[targetIdx] : null;
      if (target) {
        containerEl.insertBefore(dragItem, target);
      } else {
        containerEl.appendChild(dragItem);
      }
    }
  });

  const cleanup = () => {
    clearTimeout(pressTimer);
    if (ghost) { ghost.remove(); ghost = null; }
    if (dragItem) {
      dragItem.style.opacity = '';
      dragItem.style.transition = '';
      dragItem = null;
    }
    isDragging = false;
    pressTimer = null;
  };

  containerEl.addEventListener('pointerup', () => {
    if (!isDragging) { clearTimeout(pressTimer); pressTimer = null; dragItem = null; return; }
    const newIndex = dragItem ? getIndex(dragItem) : -1;
    cleanup();
    if (onReorder && newIndex >= 0) onReorder(newIndex);
  });

  containerEl.addEventListener('pointercancel', cleanup);
  containerEl.addEventListener('lostpointercapture', cleanup);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
