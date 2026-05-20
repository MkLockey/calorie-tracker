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

// Daily activity factors (不含运动，仅日常活动)
const DAILY_ACTIVITY_FACTORS = {
  very_low: 1.05,
  sedentary_office: 1.10,
  normal_life: 1.20,
  high_steps: 1.35,
  physical_labor: 1.50,
};

// Comprehensive activity factors (含典型运动，无运动记录时回退)
const COMPREHENSIVE_ACTIVITY_FACTORS = {
  very_low: 1.20,
  sedentary_office: 1.375,
  normal_life: 1.55,
  high_steps: 1.725,
  physical_labor: 1.90,
};

const TEF_RATE = 0.08;

function getActivityLabel(level) {
  const map = {
    very_low: '极少活动/长时间躺坐',
    sedentary_office: '久坐办公/日均步数较低',
    normal_life: '普通生活/有一定走动',
    high_steps: '走动较多/长时间站立',
    physical_labor: '体力劳动/高日常活动',
  };
  return map[level] || '普通生活';
}

function getGoalLabel(goal) {
  const map = { cut: '减脂', bulk: '增肌', maintain: '维持', recomp: '混合' };
  return map[goal] || '维持';
}

// ====== Intake & Summary ======
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
    energy_kj: 0, protein_g: 0, fat_g: 0, carbs_g: 0, sodium_mg: 0, fiber_g: 0, sugar_g: 0,
  };
  for (const entry of entries) {
    const intake = entry.actualIntake;
    if (!intake) continue;
    for (const key of Object.keys(totals)) {
      if (intake[key] != null) totals[key] += intake[key];
    }
  }
  for (const key of Object.keys(totals)) {
    totals[key] = Math.round(totals[key] * 10) / 10;
  }
  return { ...totals, energy_kcal: Math.round(totals.energy_kj * KJ_TO_KCAL), count: entries.length };
}

function calcAverages(entriesByDate) {
  const dates = Object.keys(entriesByDate);
  if (dates.length === 0) return null;
  const allTotals = dates.map(d => calcDailySummary(entriesByDate[d]));
  const n = allTotals.length;
  const avg = { energy_kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, sodium_mg: 0, fiber_g: 0, days: n };
  for (const t of allTotals) {
    avg.energy_kcal += t.energy_kcal;
    avg.protein_g += t.protein_g;
    avg.fat_g += t.fat_g;
    avg.carbs_g += t.carbs_g;
    avg.sodium_mg += t.sodium_mg;
    avg.fiber_g += t.fiber_g || 0;
  }
  for (const key of Object.keys(avg)) {
    if (key !== 'days') avg[key] = Math.round(avg[key] / n);
  }
  return avg;
}

// ====== NRV% ======
function calcNRV(value, nutrientKey) {
  const ref = NRV[nutrientKey];
  if (!ref || value == null) return null;
  return Math.round((value / ref) * 100);
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
// 无运动记录时：综合系数（含典型运动）
// 有运动记录时：拆分模式 (日常活动 + 运动 + TEF)
function calcTDEE(bmr, dailyActivityLevel, exerciseKcal, hasExerciseRecords) {
  if (!hasExerciseRecords) {
    const compFactor = COMPREHENSIVE_ACTIVITY_FACTORS[dailyActivityLevel] || 1.55;
    return Math.round(bmr * compFactor);
  }
  const factor = DAILY_ACTIVITY_FACTORS[dailyActivityLevel] || 1.20;
  const nonTEF = bmr * factor + (exerciseKcal || 0);
  return Math.round(nonTEF / (1 - TEF_RATE));
}

function parseTDEEBreakdown(bmr, dailyActivityLevel, exerciseKcal, hasExerciseRecords) {
  if (!hasExerciseRecords) {
    const compFactor = COMPREHENSIVE_ACTIVITY_FACTORS[dailyActivityLevel] || 1.55;
    const dailyBase = Math.round(bmr * compFactor);
    return { bmr, dailyBase, exerciseAvg: 0, tefKcal: 0, nonTEF: dailyBase, tdee: dailyBase, factor: compFactor, mode: 'comprehensive' };
  }
  const factor = DAILY_ACTIVITY_FACTORS[dailyActivityLevel] || 1.20;
  const dailyBase = Math.round(bmr * factor);
  const dailyActivityBonus = dailyBase - bmr;
  const exercise = exerciseKcal || 0;
  const nonTEF = dailyBase + exercise;
  const tdee = Math.round(nonTEF / (1 - TEF_RATE));
  const tefKcal = tdee - nonTEF;
  return { bmr, dailyBase, dailyActivityBonus, exerciseAvg: exercise, tefKcal, nonTEF, tdee, factor, mode: 'split' };
}

// ====== Healthy Weight (标准BMI 18.5-24) ======
function calcHealthyWeightRange(heightCm) {
  const h = heightCm / 100;
  return {
    min: Math.round(18.5 * h * h),
    max: Math.round(24.0 * h * h),
  };
}

// ====== Weight Recommendation (新体型BMI区间 + 骨架修正) ======
const PHYSIQUE_BMI_RANGES = {
  skinny:  { min: 18.8, max: 20.8 },
  lean:    { min: 20.5, max: 22.5 },
  fit:     { min: 21.5, max: 24.0 },
  sculpted:{ min: 21.0, max: 23.5 },
  muscular:{ min: 23.0, max: 26.0 },
};

const FRAME_BMI_ADJ = { small: -0.3, medium: 0, large: 0.3 };

function calcRecommendedWeightRange(heightCm, physique, frameSize) {
  const h = heightCm / 100;
  const range = PHYSIQUE_BMI_RANGES[physique] || PHYSIQUE_BMI_RANGES.fit;
  const adj = FRAME_BMI_ADJ[frameSize] || 0;
  const minBMI = range.min + adj;
  const maxBMI = range.max + adj;
  return {
    min: Math.round(minBMI * h * h),
    max: Math.round(maxBMI * h * h),
    mid: Math.round(((minBMI + maxBMI) / 2) * h * h),
    bmiMin: Math.round(minBMI * 10) / 10,
    bmiMax: Math.round(maxBMI * 10) / 10,
  };
}

// ====== Body Fat Targets (普通模式) ======
const BODY_FAT_TARGETS = {
  male: {
    skinny:  [0.10, 0.14],
    lean:    [0.11, 0.14],
    fit:     [0.13, 0.17],
    sculpted:[0.09, 0.12],
    muscular:[0.10, 0.15],
  },
  female: {
    skinny:  [0.18, 0.22],
    lean:    [0.18, 0.21],
    fit:     [0.21, 0.25],
    sculpted:[0.16, 0.19],
    muscular:[0.18, 0.23],
  },
};

function calcBodyFatTarget(gender, physique) {
  const map = BODY_FAT_TARGETS[gender] || BODY_FAT_TARGETS.male;
  const [min, max] = map[physique] || map.fit;
  return { min: Math.round(min * 100), max: Math.round(max * 100), label: getBodyGoalLabel(physique) };
}

function getBodyGoalLabel(goal) {
  const map = { fit: '匀称', muscular: '肌肉', lean: '薄肌', sculpted: '立体', skinny: '偏瘦' };
  return map[goal] || '匀称';
}

function getFrameLabel(frame) {
  const map = { small: '细骨架', medium: '中骨架', large: '大骨架' };
  return map[frame] || '中骨架';
}

// ====== BMI ======
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

// ====== Body Fat % Estimation (Deurenberg) ======
function calcBodyFatPct(bmi, age, gender) {
  if (gender === 'female') {
    return Math.round(((1.20 * bmi) + (0.23 * age) - 5.4) * 10) / 10;
  }
  return Math.round(((1.20 * bmi) + (0.23 * age) - 16.2) * 10) / 10;
}

// ====== Planned Calorie Target ======
function calcPlannedCalorieTarget(params) {
  const { tdee, bmi, goal, physique, currentWeight, targetWeight, targetDate } = params;
  const warnings = [];

  let dailyEnergyDelta;
  let daysLeft = null;

  if (targetWeight != null && targetDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate + 'T00:00:00');
    daysLeft = Math.max(1, Math.round((target - today) / 86400000));
    const kgChange = targetWeight - currentWeight;
    dailyEnergyDelta = Math.round(kgChange * 7700 / daysLeft);
  } else {
    // Default adjustments without target date
    if (goal === 'cut') {
      dailyEnergyDelta = -Math.round(tdee * 0.15);
    } else if (goal === 'recomp') {
      if (bmi >= 25) {
        dailyEnergyDelta = -Math.round(tdee * 0.10);
      } else if (bmi >= 18.5 && bmi < 25 && (physique === 'sculpted' || physique === 'lean')) {
        dailyEnergyDelta = -Math.round(tdee * 0.05);
      } else if (bmi < 18.5) {
        dailyEnergyDelta = Math.round(tdee * 0.05);
      } else {
        dailyEnergyDelta = 0;
      }
    } else if (goal === 'maintain') {
      dailyEnergyDelta = 0;
    } else if (goal === 'bulk') {
      dailyEnergyDelta = Math.round(tdee * 0.08);
    } else {
      dailyEnergyDelta = 0;
    }
  }

  const plannedKcal = tdee + dailyEnergyDelta;

  // Goal vs target weight direction conflict
  if (targetWeight != null) {
    const kgChange = targetWeight - currentWeight;
    if (goal === 'cut' && kgChange > 0) {
      warnings.push('你的目标体重高于当前体重，与减脂目标存在冲突，系统仍按减脂计算。');
    } else if (goal === 'bulk' && kgChange < 0) {
      warnings.push('你的目标体重低于当前体重，与增肌目标存在冲突，系统仍按增肌计算。');
    } else if (goal === 'maintain' && Math.abs(kgChange) > 3) {
      warnings.push('你的目标体重与当前体重差距较大，系统仍按维持目标计算。');
    }
  }

  return { dailyEnergyDelta, plannedKcal, daysLeft, warnings };
}

// ====== Macro Reference Weight ======
function calcMacroReferenceWeight(currentWeight, heightCm, bmi, calculationTargetWeight, goalDirection) {
  const h = heightCm / 100;
  const healthyMidWeight = Math.round(22 * h * h);

  // goalDirection: -1 = losing, 0 = maintaining, 1 = gaining
  if (bmi >= 25 && calculationTargetWeight < currentWeight) {
    return Math.max(calculationTargetWeight, healthyMidWeight);
  } else if (bmi < 18.5 && calculationTargetWeight > currentWeight) {
    return calculationTargetWeight;
  }
  return currentWeight;
}

// ====== Recommended Macros (新公式) ======
const PROTEIN_BASE = { cut: 2.0, recomp: 1.9, maintain: 1.6, bulk: 1.8 };
const PROTEIN_PHYSIQUE_MOD = { skinny: -0.1, fit: 0, lean: 0.1, sculpted: 0.15, muscular: 0.2 };
const PROTEIN_MIN_FACTOR = { cut: 1.6, recomp: 1.6, maintain: 1.2, bulk: 1.6 };

// Fat (g/kg independent)
const FAT_BASE_G_PER_KG = { cut: 0.7, recomp: 0.8, maintain: 0.9, bulk: 1.0 };
const FAT_PHYSIQUE_MOD_G = { skinny: 0.1, fit: 0, lean: -0.05, sculpted: -0.1, muscular: 0 };

function getFatExerciseModSplit(avgExerciseKcal7d) {
  const avg = avgExerciseKcal7d || 0;
  if (avg >= 500) return -0.15;
  if (avg >= 300) return -0.10;
  if (avg >= 100) return -0.05;
  return 0;
}

function getFatExerciseModComprehensive(compFactor) {
  if (compFactor >= 1.9) return -0.075;
  if (compFactor >= 1.725) return -0.075;
  if (compFactor >= 1.55) return -0.05;
  if (compFactor >= 1.375) return -0.025;
  return 0;
}

// Carb (g/kg independent)
function getCarbBaseSplit(avgExerciseKcal7d) {
  const avg = avgExerciseKcal7d || 0;
  if (avg >= 500) return 4.5;
  if (avg >= 300) return 3.75;
  if (avg >= 100) return 3.0;
  return 2.5;
}

function getCarbBaseComprehensive(compFactor) {
  if (compFactor >= 1.9) return 5.25;
  if (compFactor >= 1.725) return 4.5;
  if (compFactor >= 1.55) return 3.75;
  if (compFactor >= 1.375) return 3.0;
  return 2.5;
}

const CARB_GOAL_MOD = { cut: -0.5, recomp: 0, maintain: 0, bulk: 0.75 };
const CARB_PHYSIQUE_MOD = { skinny: 0.3, fit: 0, lean: 0, sculpted: -0.3, muscular: 0.3 };

// Comprehensive activity labels (old-style, for TDEE detail display)
const COMPREHENSIVE_ACTIVITY_LABELS = {
  very_low: '久坐不动',
  sedentary_office: '轻度活动',
  normal_life: '中度活动',
  high_steps: '高度活动',
  physical_labor: '极高活动',
};

function calcRecommendedMacros(params) {
  const { macroRefWeight, goal, physique, avgExerciseKcal7d, tdeeMode, tdeeFactor } = params;
  const warnings = [];

  // 1. Protein (g/kg, independent)
  let proteinFactor = (PROTEIN_BASE[goal] || 1.6) + (PROTEIN_PHYSIQUE_MOD[physique] || 0);
  proteinFactor = Math.max(1.2, Math.min(2.2, proteinFactor));
  const proteinG = Math.round(macroRefWeight * proteinFactor);
  const proteinKcal = proteinG * 4;

  // 2. Fat (g/kg, independent)
  let fatFactor = (FAT_BASE_G_PER_KG[goal] || 0.9) + (FAT_PHYSIQUE_MOD_G[physique] || 0);
  if (tdeeMode === 'comprehensive') {
    fatFactor += getFatExerciseModComprehensive(tdeeFactor || 1.55);
  } else {
    fatFactor += getFatExerciseModSplit(avgExerciseKcal7d);
  }
  fatFactor = Math.max(0.6, Math.min(1.2, fatFactor));
  const fatG = Math.round(macroRefWeight * fatFactor);
  const fatKcal = fatG * 9;

  // 3. Carb (g/kg, independent)
  let carbFactor;
  if (tdeeMode === 'comprehensive') {
    carbFactor = getCarbBaseComprehensive(tdeeFactor || 1.55);
  } else {
    carbFactor = getCarbBaseSplit(avgExerciseKcal7d);
  }
  carbFactor += (CARB_GOAL_MOD[goal] || 0) + (CARB_PHYSIQUE_MOD[physique] || 0);
  carbFactor = Math.max(1.5, Math.min(6.0, carbFactor));
  const carbsG = Math.round(macroRefWeight * carbFactor);
  const carbKcal = carbsG * 4;

  // 4. Recommended nutrition calories = independent sum
  const recKcal = proteinKcal + fatKcal + carbKcal;

  // 5. Fiber
  const fiberG = Math.round(Math.min(45, Math.max(20, recKcal * 14 / 1000)));

  // Low carb warning
  if ((carbsG / macroRefWeight) < 2.0 && (avgExerciseKcal7d || 0) >= 300) {
    warnings.push('当前碳水偏低，可能影响训练表现。可考虑提高活动量、降低减重速度。');
  }

  return {
    protein_g: proteinG,
    fat_g: fatG,
    carbs_g: carbsG,
    fiber_g: fiberG,
    energy_kcal: recKcal,
    macroWarnings: warnings,
  };
}

// ====== Calculate daily energy delta for display ======
function calcDailyEnergyDelta(currentWeight, targetWeight, targetDate) {
  if (targetWeight == null || !targetDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate + 'T00:00:00');
  const daysLeft = Math.max(1, Math.round((target - today) / 86400000));
  const kgChange = targetWeight - currentWeight;
  return {
    daysLeft,
    kgChange: Math.round(kgChange * 10) / 10,
    totalKcal: Math.round(kgChange * 7700),
    dailyDelta: Math.round(kgChange * 7700 / daysLeft),
  };
}

// ====== Today's TDEE (use today's actual exercise, for daily log page) ======
function calcTodayTDEE(bmr, dailyActivityLevel, todayExerciseKcal) {
  const factor = DAILY_ACTIVITY_FACTORS[dailyActivityLevel] || 1.20;
  const nonTEF = bmr * factor + (todayExerciseKcal || 0);
  return Math.round(nonTEF / (1 - TEF_RATE));
}

function parseTodayTDEEBreakdown(bmr, dailyActivityLevel, todayExerciseKcal) {
  const factor = DAILY_ACTIVITY_FACTORS[dailyActivityLevel] || 1.20;
  const dailyBase = Math.round(bmr * factor);
  const dailyActivityBonus = dailyBase - bmr;
  const todayExercise = todayExerciseKcal || 0;
  const nonTEF = dailyBase + todayExercise;
  const tdee = Math.round(nonTEF / (1 - TEF_RATE));
  const tefKcal = tdee - nonTEF;
  return { bmr, dailyBase, dailyActivityBonus, todayExercise, tefKcal, tdee };
}

// ====== Helper: 7-day average exercise ======
function calcAvgExercise7d(exerciseMap, today) {
  let sum = 0, count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    if (exerciseMap[dateStr] != null) {
      sum += exerciseMap[dateStr];
      count++;
    }
  }
  return count > 0 ? Math.round(sum / count) : 0;
}

// ====== NRV Label ======
function getNRVLabel(key) {
  const map = { energy_kj: '能量', protein_g: '蛋白质', fat_g: '脂肪', carbs_g: '碳水', fiber_g: '纤维', sodium_mg: '钠' };
  return map[key] || key;
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
