// User profile management and recommendations

function getProfileData() {
  const p = getProfile();
  const bmr = calcBMR(p.gender, p.weight_kg, p.height_cm, p.age);
  const tdee = calcTDEE(bmr, p.activity_level);
  const goalKcal = calcGoalCalories(tdee, p.goal);
  const macros = calcRecommendedMacros(goalKcal, p.weight_kg, p.goal);
  const bmi = calcBMI(p.weight_kg, p.height_cm);
  const bmiCategory = getBMICategory(bmi);
  const idealRange = calcIdealWeightRange(p.height_cm);

  return {
    ...p,
    bmr,
    tdee,
    goalCalories: goalKcal,
    macros,
    bmi,
    bmiCategory,
    idealRange,
  };
}

function updateProfileField(field, value) {
  const p = getProfile();
  p[field] = value;
  saveProfile(p);
}

function getGoalLabel(goal) {
  const map = { cut: '减脂', bulk: '增肌', maintain: '维持', balanced: '综合' };
  return map[goal] || '综合';
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
