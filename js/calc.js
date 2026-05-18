const KJ_TO_KCAL = 1 / 4.184;

const DAILY_RECOMMENDED = {
  protein_g: 60,
  fat_g: 60,
  carbs_g: 300,
  sodium_mg: 2000,
};

function calcIntake(per100g, weightGrams) {
  const ratio = weightGrams / 100;
  const intake = {};
  for (const key of Object.keys(per100g)) {
    if (per100g[key] != null) {
      intake[key] = Math.round(per100g[key] * ratio * 10) / 10;
    }
  }
  return intake;
}

function calcKcal(energyKj) {
  if (energyKj == null) return null;
  return Math.round(energyKj * KJ_TO_KCAL);
}

function calcDailySummary(entries) {
  const totals = {
    energy_kj: 0,
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0,
    sodium_mg: 0,
    fiber_g: 0,
    sugar_g: 0,
  };

  for (const entry of entries) {
    const intake = entry.actualIntake;
    if (!intake) continue;
    for (const key of Object.keys(totals)) {
      if (intake[key] != null) {
        totals[key] += intake[key];
      }
    }
  }

  // Round
  for (const key of Object.keys(totals)) {
    totals[key] = Math.round(totals[key] * 10) / 10;
  }

  return {
    ...totals,
    energy_kcal: Math.round(totals.energy_kj * KJ_TO_KCAL),
    count: entries.length,
  };
}

function calcAverages(entriesByDate) {
  const dates = Object.keys(entriesByDate);
  if (dates.length === 0) return null;

  const allTotals = dates.map(d => calcDailySummary(entriesByDate[d]));
  const n = allTotals.length;

  const avg = {
    energy_kcal: 0,
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0,
    sodium_mg: 0,
    days: n,
  };

  for (const t of allTotals) {
    avg.energy_kcal += t.energy_kcal;
    avg.protein_g += t.protein_g;
    avg.fat_g += t.fat_g;
    avg.carbs_g += t.carbs_g;
    avg.sodium_mg += t.sodium_mg;
  }

  for (const key of Object.keys(avg)) {
    if (key !== 'days') {
      avg[key] = Math.round(avg[key] / n);
    }
  }

  return avg;
}

function getProgressPercent(value, nutrientKey) {
  const recommended = DAILY_RECOMMENDED[nutrientKey] || 100;
  return Math.min(100, Math.round((value / recommended) * 100));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function getDateDaysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return formatDate(d);
}
