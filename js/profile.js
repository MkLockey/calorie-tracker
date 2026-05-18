// User profile management and recommendations

function getProfileData() {
  const p = getProfile();

  // Use custom BMR if set, otherwise calculate
  const bmr = (p.custom_bmr != null && p.custom_bmr > 0)
    ? p.custom_bmr
    : calcBMR(p.gender, p.weight_kg, p.height_cm, p.age);

  const tdee = calcTDEE(bmr, p.activity_level);
  const tdeeBreakdown = parseTDEEBreakdown(bmr, p.activity_level);
  const goalKcal = calcGoalCalories(tdee, p.goal);
  const macros = calcRecommendedMacros(goalKcal, p.weight_kg, p.goal);
  const bmi = calcBMI(p.weight_kg, p.height_cm);
  const bmiCategory = getBMICategory(bmi);
  const idealRange = calcIdealWeightRange(p.height_cm);
  const frameWeight = calcFrameAdjustedWeight(p.height_cm, p.frame_size || 'medium');
  const bodyFat = calcBodyFatRecommendation(p.gender, p.body_goal || 'fit');

  return {
    ...p,
    bmr,
    tdee,
    tdeeBreakdown,
    goalCalories: goalKcal,
    macros,
    bmi,
    bmiCategory,
    idealRange,
    frameWeight,
    bodyFat,
  };
}

function updateProfileField(field, value) {
  const p = getProfile();
  p[field] = value;
  saveProfile(p);
}

function getGoalLabel(goal) {
  const map = { cut: '减脂', bulk: '增肌', maintain: '维持' };
  return map[goal] || '维持';
}

function getActivityLabel(level) {
  const map = {
    sedentary: '久坐不动',
    light: '轻度活动(1-2次/周)',
    moderate: '中度活动(3-5次/周)',
    active: '活跃(6-7次/周)',
    very_active: '高强度(每天)',
  };
  return map[level] || '中度活动';
}
