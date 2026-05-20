// User profile management and recommendations

async function getProfileData() {
  const p = getProfile();

  // BMR
  const bmr = (p.use_custom_bmr && p.custom_bmr != null && p.custom_bmr > 0)
    ? p.custom_bmr
    : calcBMR(p.gender, p.weight_kg, p.height_cm, p.age);

  // Exercise records — determine TDEE mode (use current day's exercise, not 7-day avg)
  const exerciseMap = await getExerciseLast7Days();
  const hasExercise = Object.keys(exerciseMap).length > 0;
  const todayStr = formatDate(new Date());
  const todayExercise = await getExercise(todayStr);

  // TDEE (mode based on exercise record existence)
  const tdee = calcTDEE(bmr, p.activity_level, todayExercise, hasExercise);
  const tdeeBreakdown = parseTDEEBreakdown(bmr, p.activity_level, todayExercise, hasExercise);

  // Weight recommendation
  const physique = p.body_goal || 'fit';
  const frame = p.frame_size || 'medium';
  const weightRange = calcRecommendedWeightRange(p.height_cm, physique, frame);

  // Calculation target weight
  const calculationTargetWeight = (p.target_weight_kg != null) ? p.target_weight_kg : weightRange.mid;

  // BMI
  const bmi = calcBMI(p.weight_kg, p.height_cm);
  const bmiCategory = getBMICategory(bmi);

  // Body fat
  const bodyFatTarget = calcBodyFatTarget(p.gender, physique);
  const bodyFatPct = (p.use_custom_bodyfat && p.body_fat_pct != null)
    ? p.body_fat_pct
    : calcBodyFatPct(bmi, p.age, p.gender);

  // Macro reference weight
  const goalDir = (p.target_weight_kg != null) ? (p.target_weight_kg > p.weight_kg ? 1 : -1) : 0;
  const macroRefWeight = calcMacroReferenceWeight(p.weight_kg, p.height_cm, bmi, calculationTargetWeight, goalDir);

  // Macros (independent g/kg, not controlled by plannedKcal)
  const macroParams = {
    macroRefWeight,
    goal: p.goal,
    physique,
    avgExerciseKcal7d: todayExercise,
    tdeeMode: tdeeBreakdown.mode,
    tdeeFactor: tdeeBreakdown.factor,
  };
  const macros = calcRecommendedMacros(macroParams);

  // Planned calorie target (for schedule delta comparison / warnings only)
  const planParams = {
    tdee, bmi, goal: p.goal, physique,
    currentWeight: p.weight_kg,
    targetWeight: p.target_weight_kg || null,
    targetDate: p.target_date || null,
    bmr,
    gender: p.gender,
  };
  const plan = calcPlannedCalorieTarget(planParams);

  // Daily energy delta for display
  const deltaInfo = calcDailyEnergyDelta(p.weight_kg, p.target_weight_kg, p.target_date);

  // Calorie-level warnings (use macros.energy_kcal, not plannedKcal)
  const allWarnings = [...plan.warnings, ...macros.macroWarnings];
  if (macros.energy_kcal < bmr) {
    allWarnings.push('当前推荐热量低于基础代谢，长期执行可能不适合。建议延长目标周期或提高活动量。');
  }
  if (p.gender === 'female' && macros.energy_kcal < 1200) {
    allWarnings.push('热量目标较低（<1200 kcal），建议谨慎执行。');
  }
  if (p.gender === 'male' && macros.energy_kcal < 1500) {
    allWarnings.push('热量目标较低（<1500 kcal），建议谨慎执行。');
  }

  // Target schedule delta vs recommended delta comparison + suggested exercise
  let deltaComparison = null;
  let suggestedExerciseCalories = 0;
  if (deltaInfo && deltaInfo.dailyDelta !== 0) {
    const recDelta = macros.energy_kcal - tdee;
    const targetDelta = deltaInfo.dailyDelta;
    const deltaGap = targetDelta - recDelta;
    // Suggested exercise: the extra calories needed when recommended delta falls short of schedule
    if (targetDelta < 0 && recDelta > targetDelta) {
      suggestedExerciseCalories = recDelta - targetDelta;
    }
    deltaComparison = { targetDelta, recDelta, deltaGap, suggestedExerciseCalories };

    const absTarget = Math.abs(targetDelta);
    const absRec = Math.abs(recDelta);
    if (targetDelta < 0 && recDelta < 0 && absRec < absTarget) {
      allWarnings.push('当前推荐缺口小于目标周期所需缺口。若想按期达到目标，可能需要增加运动、适当降低摄入，或延长目标周期。');
    } else if (targetDelta < 0 && recDelta < 0 && absRec > absTarget + 200) {
      allWarnings.push('当前推荐缺口明显大于目标周期所需。建议适当增加摄入或调整目标日期。');
    } else if (targetDelta > 0 && recDelta > 0 && absRec < absTarget) {
      allWarnings.push('当前推荐盈余小于目标周期所需。若想按期达到目标，可能需要增加摄入或延长目标周期。');
    } else if (targetDelta > 0 && recDelta > 0 && absRec > absTarget + 200) {
      allWarnings.push('当前推荐盈余明显大于目标周期所需，可能增加脂肪增长比例。建议适当调整。');
    }
  }

  return {
    ...p,
    bmr,
    tdee,
    tdeeBreakdown,
    avgExercise7d: todayExercise,
    weightRange,
    calculationTargetWeight,
    bmi,
    bmiCategory,
    bodyFatTarget,
    bodyFatPct,
    plannedKcal: plan.plannedKcal,
    dailyEnergyDelta: plan.dailyEnergyDelta,
    deltaInfo,
    deltaComparison,
    suggestedExerciseCalories,
    macroRefWeight,
    macros,
    warnings: allWarnings,
  };
}

function updateProfileField(field, value) {
  const p = getProfile();
  p[field] = value;
  saveProfile(p);
}
