const KJ_TO_KCAL = 1 / 4.184;

// NRV reference values (GB 28050-2011)
const NRV = {
  energy_kj: 8400,
  protein_g: 60,
  fat_g: 60,
  carbs_g: 300,
  fiber_g: 25,
  sodium_mg: 2000,
};

// Activity multipliers for TDEE
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Goal calorie adjustments (from TDEE)
const GOAL_ADJUSTMENTS = {
  cut: -400,
  bulk: 400,
  maintain: 0,
  balanced: 0,
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
    fiber_g: 0,
    days: n,
  };

  for (const t of allTotals) {
    avg.energy_kcal += t.energy_kcal;
    avg.protein_g += t.protein_g;
    avg.fat_g += t.fat_g;
    avg.carbs_g += t.carbs_g;
    avg.sodium_mg += t.sodium_mg;
    avg.fiber_g += t.fiber_g || 0;
  }

  for (const key of Object.keys(avg)) {
    if (key !== 'days') {
      avg[key] = Math.round(avg[key] / n);
    }
  }

  return avg;
}

// ====== NRV% ======
function calcNRV(value, nutrientKey) {
  const ref = NRV[nutrientKey];
  if (!ref || value == null) return null;
  return Math.round((value / ref) * 100);
}

function getNRVLabel(key) {
  const map = {
    energy_kj: '能量',
    protein_g: '蛋白质',
    fat_g: '脂肪',
    carbs_g: '碳水',
    fiber_g: '纤维',
    sodium_mg: '钠',
  };
  return map[key] || key;
}

// ====== BMR (Mifflin-St Jeor) ======
function calcBMR(gender, weightKg, heightCm, age) {
  let bmr;
  if (gender === 'female') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return Math.round(bmr);
}

// ====== TDEE ======
function calcTDEE(bmr, activityLevel) {
  const mult = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55;
  return Math.round(bmr * mult);
}

// ====== Goal Target Calories ======
function calcGoalCalories(tdee, goal) {
  const adj = GOAL_ADJUSTMENTS[goal] || 0;
  return tdee + adj;
}

// ====== Recommended Macros ======
function calcRecommendedMacros(goalCalories, weightKg, goal) {
  let proteinG, fatG;

  if (goal === 'cut') {
    proteinG = Math.round(weightKg * 2.2);
    fatG = Math.round(weightKg * 0.8);
  } else if (goal === 'bulk') {
    proteinG = Math.round(weightKg * 2.0);
    fatG = Math.round(weightKg * 1.0);
  } else {
    proteinG = Math.round(weightKg * 1.6);
    fatG = Math.round(weightKg * 0.9);
  }

  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbKcal = goalCalories - proteinKcal - fatKcal;
  const carbsG = Math.max(0, Math.round(carbKcal / 4));

  return {
    protein_g: proteinG,
    fat_g: fatG,
    carbs_g: carbsG,
    fiber_g: 25,
    energy_kcal: goalCalories,
  };
}

// ====== BMI & Ideal Weight ======
function calcBMI(weightKg, heightCm) {
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

function getBMICategory(bmi) {
  if (bmi < 18.5) return '偏瘦';
  if (bmi < 24) return '正常';
  if (bmi < 28) return '超重';
  return '肥胖';
}

function calcIdealWeightRange(heightCm) {
  const h = heightCm / 100;
  return {
    min: Math.round(18.5 * h * h),
    max: Math.round(24 * h * h),
  };
}

// ====== Progress ======
function getProgressPercent(value, nutrientKey) {
  const recommended = NRV[nutrientKey] || 100;
  return Math.min(100, Math.round((value / recommended) * 100));
}

// ====== ID & Date Helpers ======
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
