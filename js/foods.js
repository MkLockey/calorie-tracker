// 常见食物营养数据库（每 100g 可食部分）
// 数据来源：中国食物成分表（标准版第6版）、中国营养学会膳食指南
// 能量单位: kJ
// NRV 参考值（GB 28050）：能量8400kJ, 蛋白质60g, 脂肪60g, 碳水300g, 纤维25g, 钠2000mg

const FOOD_DB = [
  // ====== 水果类 ======
  { name: "苹果", category: "水果", emoji: "🍎", per100g: { energy_kj: 226, protein_g: 0.2, fat_g: 0.2, carbs_g: 13.5, sodium_mg: 1.6, fiber_g: 2.4 } },
  { name: "香蕉", category: "水果", emoji: "🍌", per100g: { energy_kj: 389, protein_g: 1.4, fat_g: 0.2, carbs_g: 22.0, sodium_mg: 0.8, fiber_g: 2.6 } },
  { name: "橙子", category: "水果", emoji: "🍊", per100g: { energy_kj: 197, protein_g: 0.8, fat_g: 0.2, carbs_g: 10.5, sodium_mg: 1.2, fiber_g: 1.7 } },
  { name: "葡萄", category: "水果", emoji: "🍇", per100g: { energy_kj: 185, protein_g: 0.5, fat_g: 0.2, carbs_g: 10.3, sodium_mg: 1.3, fiber_g: 0.9 } },
  { name: "西瓜", category: "水果", emoji: "🍉", per100g: { energy_kj: 105, protein_g: 0.6, fat_g: 0.1, carbs_g: 5.8, sodium_mg: 3.2, fiber_g: 0.4 } },
  { name: "草莓", category: "水果", emoji: "🍓", per100g: { energy_kj: 134, protein_g: 1.0, fat_g: 0.2, carbs_g: 7.1, sodium_mg: 4.2, fiber_g: 1.1 } },
  { name: "芒果", category: "水果", emoji: "🥭", per100g: { energy_kj: 134, protein_g: 0.6, fat_g: 0.2, carbs_g: 7.0, sodium_mg: 2.8, fiber_g: 1.3 } },
  { name: "梨", category: "水果", emoji: "🍐", per100g: { energy_kj: 213, protein_g: 0.4, fat_g: 0.2, carbs_g: 13.3, sodium_mg: 2.1, fiber_g: 3.1 } },
  { name: "桃子", category: "水果", emoji: "🍑", per100g: { energy_kj: 201, protein_g: 0.9, fat_g: 0.1, carbs_g: 12.2, sodium_mg: 5.7, fiber_g: 1.3 } },
  { name: "猕猴桃", category: "水果", emoji: "🥝", per100g: { energy_kj: 234, protein_g: 0.8, fat_g: 0.6, carbs_g: 14.5, sodium_mg: 10.0, fiber_g: 2.6 } },
  { name: "哈密瓜", category: "水果", emoji: "🍈", per100g: { energy_kj: 142, protein_g: 0.5, fat_g: 0.1, carbs_g: 7.9, sodium_mg: 26.7, fiber_g: 0.2 } },
  { name: "菠萝", category: "水果", emoji: "🍍", per100g: { energy_kj: 172, protein_g: 0.5, fat_g: 0.1, carbs_g: 10.8, sodium_mg: 0.8, fiber_g: 1.3 } },
  { name: "樱桃", category: "水果", emoji: "🍒", per100g: { energy_kj: 192, protein_g: 1.1, fat_g: 0.2, carbs_g: 10.2, sodium_mg: 8.0, fiber_g: 0.3 } },
  { name: "柚子", category: "水果", emoji: "🍊", per100g: { energy_kj: 172, protein_g: 0.8, fat_g: 0.2, carbs_g: 9.5, sodium_mg: 3.0, fiber_g: 0.4 } },
  { name: "火龙果", category: "水果", emoji: "🐉", per100g: { energy_kj: 230, protein_g: 1.1, fat_g: 0.2, carbs_g: 13.0, sodium_mg: 2.7, fiber_g: 2.0 } },
  { name: "蓝莓", category: "水果", emoji: "🫐", per100g: { energy_kj: 238, protein_g: 0.7, fat_g: 0.3, carbs_g: 14.5, sodium_mg: 1.0, fiber_g: 2.4 } },
  { name: "荔枝", category: "水果", emoji: "🫐", per100g: { energy_kj: 293, protein_g: 0.9, fat_g: 0.2, carbs_g: 16.6, sodium_mg: 1.7, fiber_g: 0.5 } },
  { name: "龙眼", category: "水果", emoji: "🟤", per100g: { energy_kj: 293, protein_g: 1.2, fat_g: 0.1, carbs_g: 16.6, sodium_mg: 3.9, fiber_g: 0.4 } },
  { name: "柠檬", category: "水果", emoji: "🍋", per100g: { energy_kj: 146, protein_g: 1.1, fat_g: 0.3, carbs_g: 7.0, sodium_mg: 1.0, fiber_g: 1.3 } },
  { name: "石榴", category: "水果", emoji: "🫐", per100g: { energy_kj: 264, protein_g: 1.4, fat_g: 0.2, carbs_g: 18.7, sodium_mg: 0.9, fiber_g: 4.8 } },
  { name: "杨梅", category: "水果", emoji: "🔴", per100g: { energy_kj: 121, protein_g: 0.8, fat_g: 0.2, carbs_g: 6.7, sodium_mg: 0.7, fiber_g: 1.0 } },
  { name: "枇杷", category: "水果", emoji: "🟠", per100g: { energy_kj: 163, protein_g: 0.4, fat_g: 0.2, carbs_g: 9.3, sodium_mg: 4.0, fiber_g: 0.8 } },
  { name: "桑葚", category: "水果", emoji: "🟣", per100g: { energy_kj: 201, protein_g: 1.7, fat_g: 0.4, carbs_g: 13.8, sodium_mg: 2.0, fiber_g: 4.1 } },
  { name: "椰子肉", category: "水果", emoji: "🥥", per100g: { energy_kj: 967, protein_g: 4.0, fat_g: 12.1, carbs_g: 26.6, sodium_mg: 55.6, fiber_g: 4.7 } },
  { name: "榴莲", category: "水果", emoji: "🟡", per100g: { energy_kj: 615, protein_g: 2.6, fat_g: 3.3, carbs_g: 28.3, sodium_mg: 2.0, fiber_g: 1.7 } },
  { name: "山竹", category: "水果", emoji: "🟤", per100g: { energy_kj: 301, protein_g: 0.6, fat_g: 0.2, carbs_g: 18.0, sodium_mg: 1.5, fiber_g: 1.5 } },

  // ====== 蔬菜类 ======
  { name: "番茄", category: "蔬菜", emoji: "🍅", per100g: { energy_kj: 79, protein_g: 0.9, fat_g: 0.2, carbs_g: 4.0, sodium_mg: 5.0, fiber_g: 0.5 } },
  { name: "黄瓜", category: "蔬菜", emoji: "🥒", per100g: { energy_kj: 63, protein_g: 0.8, fat_g: 0.2, carbs_g: 2.9, sodium_mg: 4.9, fiber_g: 0.5 } },
  { name: "大白菜", category: "蔬菜", emoji: "🥬", per100g: { energy_kj: 54, protein_g: 1.5, fat_g: 0.1, carbs_g: 3.2, sodium_mg: 57.5, fiber_g: 0.8 } },
  { name: "菠菜", category: "蔬菜", emoji: "🥬", per100g: { energy_kj: 100, protein_g: 2.6, fat_g: 0.3, carbs_g: 4.5, sodium_mg: 85.2, fiber_g: 1.7 } },
  { name: "胡萝卜", category: "蔬菜", emoji: "🥕", per100g: { energy_kj: 155, protein_g: 1.0, fat_g: 0.2, carbs_g: 8.8, sodium_mg: 71.4, fiber_g: 1.1 } },
  { name: "土豆", category: "蔬菜", emoji: "🥔", per100g: { energy_kj: 318, protein_g: 2.0, fat_g: 0.2, carbs_g: 17.2, sodium_mg: 2.7, fiber_g: 0.7 } },
  { name: "西兰花", category: "蔬菜", emoji: "🥦", per100g: { energy_kj: 138, protein_g: 4.1, fat_g: 0.6, carbs_g: 4.3, sodium_mg: 18.8, fiber_g: 1.6 } },
  { name: "茄子", category: "蔬菜", emoji: "🍆", per100g: { energy_kj: 88, protein_g: 1.1, fat_g: 0.2, carbs_g: 4.9, sodium_mg: 5.4, fiber_g: 1.3 } },
  { name: "青椒", category: "蔬菜", emoji: "🫑", per100g: { energy_kj: 96, protein_g: 1.0, fat_g: 0.2, carbs_g: 5.4, sodium_mg: 3.3, fiber_g: 1.4 } },
  { name: "生菜", category: "蔬菜", emoji: "🥬", per100g: { energy_kj: 54, protein_g: 1.3, fat_g: 0.3, carbs_g: 2.0, sodium_mg: 32.8, fiber_g: 0.7 } },
  { name: "洋葱", category: "蔬菜", emoji: "🧅", per100g: { energy_kj: 163, protein_g: 1.1, fat_g: 0.2, carbs_g: 9.0, sodium_mg: 4.4, fiber_g: 0.9 } },
  { name: "芹菜", category: "蔬菜", emoji: "🥬", per100g: { energy_kj: 59, protein_g: 0.8, fat_g: 0.1, carbs_g: 3.9, sodium_mg: 73.8, fiber_g: 1.4 } },
  { name: "南瓜", category: "蔬菜", emoji: "🎃", per100g: { energy_kj: 92, protein_g: 0.7, fat_g: 0.1, carbs_g: 5.3, sodium_mg: 0.8, fiber_g: 0.8 } },
  { name: "冬瓜", category: "蔬菜", emoji: "🍈", per100g: { energy_kj: 46, protein_g: 0.4, fat_g: 0.2, carbs_g: 2.6, sodium_mg: 1.8, fiber_g: 0.7 } },
  { name: "苦瓜", category: "蔬菜", emoji: "🥒", per100g: { energy_kj: 79, protein_g: 1.0, fat_g: 0.1, carbs_g: 4.9, sodium_mg: 2.5, fiber_g: 1.4 } },
  { name: "莲藕", category: "蔬菜", emoji: "🪷", per100g: { energy_kj: 293, protein_g: 1.9, fat_g: 0.2, carbs_g: 16.4, sodium_mg: 44.2, fiber_g: 1.2 } },
  { name: "山药", category: "蔬菜", emoji: "🥔", per100g: { energy_kj: 234, protein_g: 1.9, fat_g: 0.2, carbs_g: 12.4, sodium_mg: 18.6, fiber_g: 0.8 } },
  { name: "豆芽", category: "蔬菜", emoji: "🌱", per100g: { energy_kj: 75, protein_g: 2.6, fat_g: 0.2, carbs_g: 2.8, sodium_mg: 7.2, fiber_g: 1.2 } },
  { name: "四季豆", category: "蔬菜", emoji: "🫘", per100g: { energy_kj: 117, protein_g: 2.5, fat_g: 0.2, carbs_g: 5.5, sodium_mg: 8.5, fiber_g: 1.5 } },
  { name: "香菇", category: "蔬菜", emoji: "🍄", per100g: { energy_kj: 79, protein_g: 2.2, fat_g: 0.3, carbs_g: 5.2, sodium_mg: 1.4, fiber_g: 3.3 } },
  { name: "金针菇", category: "蔬菜", emoji: "🍄", per100g: { energy_kj: 109, protein_g: 2.4, fat_g: 0.4, carbs_g: 6.0, sodium_mg: 4.3, fiber_g: 2.7 } },
  { name: "木耳", category: "蔬菜", emoji: "🍄", per100g: { energy_kj: 75, protein_g: 1.5, fat_g: 0.2, carbs_g: 2.5, sodium_mg: 6.5, fiber_g: 2.6 } },
  { name: "荷兰豆", category: "蔬菜", emoji: "🫘", per100g: { energy_kj: 113, protein_g: 2.5, fat_g: 0.2, carbs_g: 4.9, sodium_mg: 8.8, fiber_g: 1.4 } },
  { name: "莴笋", category: "蔬菜", emoji: "🥬", per100g: { energy_kj: 59, protein_g: 1.0, fat_g: 0.1, carbs_g: 2.8, sodium_mg: 36.5, fiber_g: 0.6 } },
  { name: "白萝卜", category: "蔬菜", emoji: "🥕", per100g: { energy_kj: 67, protein_g: 0.9, fat_g: 0.1, carbs_g: 4.0, sodium_mg: 38.0, fiber_g: 0.7 } },
  { name: "油菜", category: "蔬菜", emoji: "🥬", per100g: { energy_kj: 42, protein_g: 1.8, fat_g: 0.2, carbs_g: 2.7, sodium_mg: 55.8, fiber_g: 1.0 } },
  { name: "空心菜", category: "蔬菜", emoji: "🥬", per100g: { energy_kj: 84, protein_g: 2.2, fat_g: 0.3, carbs_g: 3.6, sodium_mg: 115.0, fiber_g: 1.4 } },
  { name: "油麦菜", category: "蔬菜", emoji: "🥬", per100g: { energy_kj: 63, protein_g: 1.4, fat_g: 0.2, carbs_g: 3.0, sodium_mg: 70.0, fiber_g: 1.0 } },
  { name: "茼蒿", category: "蔬菜", emoji: "🥬", per100g: { energy_kj: 88, protein_g: 1.9, fat_g: 0.3, carbs_g: 3.9, sodium_mg: 161.3, fiber_g: 1.2 } },
  { name: "芥蓝", category: "蔬菜", emoji: "🥬", per100g: { energy_kj: 79, protein_g: 2.5, fat_g: 0.2, carbs_g: 2.7, sodium_mg: 49.5, fiber_g: 1.5 } },
  { name: "丝瓜", category: "蔬菜", emoji: "🥒", per100g: { energy_kj: 84, protein_g: 1.0, fat_g: 0.2, carbs_g: 4.2, sodium_mg: 2.6, fiber_g: 0.6 } },
  { name: "西葫芦", category: "蔬菜", emoji: "🥒", per100g: { energy_kj: 75, protein_g: 0.8, fat_g: 0.2, carbs_g: 3.8, sodium_mg: 5.0, fiber_g: 0.6 } },
  { name: "菜花", category: "蔬菜", emoji: "🥦", per100g: { energy_kj: 100, protein_g: 2.1, fat_g: 0.2, carbs_g: 4.6, sodium_mg: 31.6, fiber_g: 1.2 } },
  { name: "蒜苗", category: "蔬菜", emoji: "🧄", per100g: { energy_kj: 155, protein_g: 2.1, fat_g: 0.4, carbs_g: 8.0, sodium_mg: 5.1, fiber_g: 1.8 } },
  { name: "韭菜", category: "蔬菜", emoji: "🥬", per100g: { energy_kj: 109, protein_g: 2.4, fat_g: 0.4, carbs_g: 4.6, sodium_mg: 8.1, fiber_g: 1.4 } },
  { name: "香菜", category: "蔬菜", emoji: "🌿", per100g: { energy_kj: 96, protein_g: 2.0, fat_g: 0.4, carbs_g: 4.8, sodium_mg: 48.5, fiber_g: 2.2 } },

  // ====== 主食类 ======
  { name: "米饭", category: "主食", emoji: "🍚", per100g: { energy_kj: 485, protein_g: 2.6, fat_g: 0.3, carbs_g: 25.9, sodium_mg: 1.3, fiber_g: 0.3 } },
  { name: "馒头", category: "主食", emoji: "🥟", per100g: { energy_kj: 975, protein_g: 7.0, fat_g: 1.1, carbs_g: 45.4, sodium_mg: 165.0, fiber_g: 1.3 } },
  { name: "面条(煮熟)", category: "主食", emoji: "🍝", per100g: { energy_kj: 456, protein_g: 3.6, fat_g: 0.4, carbs_g: 23.6, sodium_mg: 4.6, fiber_g: 0.7 } },
  { name: "全麦面包", category: "主食", emoji: "🍞", per100g: { energy_kj: 1033, protein_g: 8.9, fat_g: 2.7, carbs_g: 46.9, sodium_mg: 250.0, fiber_g: 5.0 } },
  { name: "小米粥", category: "主食", emoji: "🥣", per100g: { energy_kj: 193, protein_g: 1.4, fat_g: 0.7, carbs_g: 8.4, sodium_mg: 4.3, fiber_g: 0.5 } },
  { name: "玉米", category: "主食", emoji: "🌽", per100g: { energy_kj: 469, protein_g: 4.0, fat_g: 1.2, carbs_g: 22.8, sodium_mg: 1.1, fiber_g: 2.9 } },
  { name: "红薯", category: "主食", emoji: "🍠", per100g: { energy_kj: 430, protein_g: 1.1, fat_g: 0.2, carbs_g: 24.7, sodium_mg: 28.5, fiber_g: 1.6 } },
  { name: "紫薯", category: "主食", emoji: "🍠", per100g: { energy_kj: 343, protein_g: 1.2, fat_g: 0.1, carbs_g: 25.4, sodium_mg: 15.0, fiber_g: 2.8 } },
  { name: "燕麦片", category: "主食", emoji: "🥣", per100g: { energy_kj: 1623, protein_g: 13.6, fat_g: 6.8, carbs_g: 66.1, sodium_mg: 2.0, fiber_g: 10.6 } },
  { name: "粽子", category: "主食", emoji: "🫔", per100g: { energy_kj: 828, protein_g: 4.1, fat_g: 4.4, carbs_g: 38.0, sodium_mg: 97.0, fiber_g: 1.0 } },
  { name: "饺子(猪肉白菜)", category: "主食", emoji: "🥟", per100g: { energy_kj: 890, protein_g: 7.6, fat_g: 11.7, carbs_g: 19.4, sodium_mg: 320.0, fiber_g: 0.5 } },
  { name: "年糕", category: "主食", emoji: "🍡", per100g: { energy_kj: 644, protein_g: 3.3, fat_g: 0.6, carbs_g: 34.7, sodium_mg: 5.8, fiber_g: 0.8 } },
  { name: "烙饼", category: "主食", emoji: "🫓", per100g: { energy_kj: 1046, protein_g: 7.5, fat_g: 5.5, carbs_g: 44.0, sodium_mg: 149.0, fiber_g: 1.9 } },
  { name: "糯米", category: "主食", emoji: "🍚", per100g: { energy_kj: 1460, protein_g: 6.7, fat_g: 0.4, carbs_g: 77.2, sodium_mg: 1.5, fiber_g: 0.8 } },
  { name: "米粉", category: "主食", emoji: "🍜", per100g: { energy_kj: 1046, protein_g: 3.2, fat_g: 0.3, carbs_g: 58.5, sodium_mg: 2.5, fiber_g: 0.5 } },
  { name: "荞麦面(干)", category: "主食", emoji: "🍜", per100g: { energy_kj: 1443, protein_g: 12.6, fat_g: 2.5, carbs_g: 70.6, sodium_mg: 4.5, fiber_g: 6.5 } },
  { name: "杂粮饭", category: "主食", emoji: "🍚", per100g: { energy_kj: 586, protein_g: 3.8, fat_g: 1.2, carbs_g: 30.6, sodium_mg: 2.5, fiber_g: 4.0 } },
  { name: "糙米", category: "主食", emoji: "🍚", per100g: { energy_kj: 1548, protein_g: 7.7, fat_g: 2.4, carbs_g: 77.0, sodium_mg: 6.0, fiber_g: 3.4 } },
  { name: "薏米", category: "主食", emoji: "🍚", per100g: { energy_kj: 1506, protein_g: 12.8, fat_g: 3.3, carbs_g: 69.1, sodium_mg: 3.6, fiber_g: 2.0 } },
  { name: "黑米", category: "主食", emoji: "🍚", per100g: { energy_kj: 1427, protein_g: 9.4, fat_g: 2.5, carbs_g: 72.2, sodium_mg: 7.1, fiber_g: 3.9 } },
  { name: "藜麦", category: "主食", emoji: "🌾", per100g: { energy_kj: 1536, protein_g: 14.1, fat_g: 6.1, carbs_g: 64.2, sodium_mg: 5.0, fiber_g: 7.0 } },

  // ====== 肉类 ======
  { name: "鸡胸肉", category: "肉类", emoji: "🍗", per100g: { energy_kj: 585, protein_g: 29.4, fat_g: 3.4, carbs_g: 0.5, sodium_mg: 34.0, fiber_g: 0 } },
  { name: "鸡腿肉", category: "肉类", emoji: "🍗", per100g: { energy_kj: 674, protein_g: 20.4, fat_g: 8.6, carbs_g: 0.4, sodium_mg: 80.9, fiber_g: 0 } },
  { name: "鸡翅", category: "肉类", emoji: "🍗", per100g: { energy_kj: 828, protein_g: 18.3, fat_g: 14.1, carbs_g: 0.7, sodium_mg: 50.8, fiber_g: 0 } },
  { name: "猪肉(瘦)", category: "肉类", emoji: "🥩", per100g: { energy_kj: 598, protein_g: 20.3, fat_g: 6.2, carbs_g: 1.5, sodium_mg: 57.5, fiber_g: 0 } },
  { name: "猪肉(五花)", category: "肉类", emoji: "🥩", per100g: { energy_kj: 1473, protein_g: 14.5, fat_g: 33.3, carbs_g: 1.1, sodium_mg: 36.7, fiber_g: 0 } },
  { name: "猪排骨", category: "肉类", emoji: "🥩", per100g: { energy_kj: 1105, protein_g: 16.7, fat_g: 23.1, carbs_g: 0, sodium_mg: 62.6, fiber_g: 0 } },
  { name: "猪肝", category: "肉类", emoji: "🥩", per100g: { energy_kj: 540, protein_g: 19.3, fat_g: 3.5, carbs_g: 5.0, sodium_mg: 68.6, fiber_g: 0 } },
  { name: "牛肉(瘦)", category: "肉类", emoji: "🥩", per100g: { energy_kj: 444, protein_g: 20.2, fat_g: 2.3, carbs_g: 1.2, sodium_mg: 53.6, fiber_g: 0 } },
  { name: "牛腩", category: "肉类", emoji: "🥩", per100g: { energy_kj: 528, protein_g: 18.9, fat_g: 5.2, carbs_g: 0, sodium_mg: 43.4, fiber_g: 0 } },
  { name: "牛肉干", category: "肉类", emoji: "🥩", per100g: { energy_kj: 1343, protein_g: 45.6, fat_g: 5.6, carbs_g: 1.9, sodium_mg: 412.0, fiber_g: 0 } },
  { name: "羊肉(瘦)", category: "肉类", emoji: "🐑", per100g: { energy_kj: 523, protein_g: 20.5, fat_g: 3.9, carbs_g: 0.2, sodium_mg: 53.9, fiber_g: 0 } },
  { name: "鸭肉", category: "肉类", emoji: "🦆", per100g: { energy_kj: 1004, protein_g: 15.5, fat_g: 19.7, carbs_g: 0.2, sodium_mg: 69.0, fiber_g: 0 } },
  { name: "火腿肠", category: "肉类", emoji: "🌭", per100g: { energy_kj: 887, protein_g: 13.4, fat_g: 15.1, carbs_g: 5.8, sodium_mg: 750.0, fiber_g: 0 } },
  { name: "培根", category: "肉类", emoji: "🥓", per100g: { energy_kj: 1536, protein_g: 13.0, fat_g: 37.0, carbs_g: 1.0, sodium_mg: 1500.0, fiber_g: 0 } },
  { name: "腊肉", category: "肉类", emoji: "🥓", per100g: { energy_kj: 2075, protein_g: 11.8, fat_g: 48.8, carbs_g: 2.4, sodium_mg: 4820.0, fiber_g: 0 } },
  { name: "午餐肉", category: "肉类", emoji: "🥫", per100g: { energy_kj: 962, protein_g: 12.7, fat_g: 18.5, carbs_g: 3.6, sodium_mg: 850.0, fiber_g: 0 } },
  { name: "鸡肝", category: "肉类", emoji: "🐔", per100g: { energy_kj: 506, protein_g: 16.6, fat_g: 4.8, carbs_g: 2.8, sodium_mg: 92.0, fiber_g: 0 } },
  { name: "猪蹄", category: "肉类", emoji: "🐷", per100g: { energy_kj: 1088, protein_g: 22.6, fat_g: 18.8, carbs_g: 0, sodium_mg: 101.0, fiber_g: 0 } },

  // ====== 蛋奶类 ======
  { name: "鸡蛋", category: "蛋奶", emoji: "🥚", per100g: { energy_kj: 602, protein_g: 13.3, fat_g: 8.8, carbs_g: 2.8, sodium_mg: 131.5, fiber_g: 0 } },
  { name: "鸡蛋白", category: "蛋奶", emoji: "🥚", per100g: { energy_kj: 251, protein_g: 11.6, fat_g: 0.1, carbs_g: 3.1, sodium_mg: 79.4, fiber_g: 0 } },
  { name: "鸡蛋黄", category: "蛋奶", emoji: "🥚", per100g: { energy_kj: 1372, protein_g: 15.2, fat_g: 28.2, carbs_g: 3.4, sodium_mg: 54.9, fiber_g: 0 } },
  { name: "鹌鹑蛋", category: "蛋奶", emoji: "🥚", per100g: { energy_kj: 669, protein_g: 12.8, fat_g: 11.1, carbs_g: 2.1, sodium_mg: 106.6, fiber_g: 0 } },
  { name: "纯牛奶", category: "蛋奶", emoji: "🥛", per100g: { energy_kj: 226, protein_g: 3.0, fat_g: 3.2, carbs_g: 4.8, sodium_mg: 37.2, fiber_g: 0 } },
  { name: "脱脂牛奶", category: "蛋奶", emoji: "🥛", per100g: { energy_kj: 138, protein_g: 3.3, fat_g: 0.1, carbs_g: 5.0, sodium_mg: 40.0, fiber_g: 0 } },
  { name: "原味酸奶", category: "蛋奶", emoji: "🥛", per100g: { energy_kj: 301, protein_g: 3.0, fat_g: 2.7, carbs_g: 10.0, sodium_mg: 45.0, fiber_g: 0 } },
  { name: "奶酪", category: "蛋奶", emoji: "🧀", per100g: { energy_kj: 1364, protein_g: 22.8, fat_g: 27.3, carbs_g: 3.5, sodium_mg: 584.6, fiber_g: 0 } },
  { name: "黄油", category: "蛋奶", emoji: "🧈", per100g: { energy_kj: 3067, protein_g: 0.5, fat_g: 82.5, carbs_g: 0.1, sodium_mg: 11.0, fiber_g: 0 } },
  { name: "咸鸭蛋", category: "蛋奶", emoji: "🥚", per100g: { energy_kj: 795, protein_g: 12.7, fat_g: 13.5, carbs_g: 3.6, sodium_mg: 2706.0, fiber_g: 0 } },
  { name: "皮蛋", category: "蛋奶", emoji: "🥚", per100g: { energy_kj: 715, protein_g: 14.2, fat_g: 10.7, carbs_g: 4.3, sodium_mg: 870.0, fiber_g: 0 } },

  // ====== 豆制品 ======
  { name: "豆腐", category: "豆制品", emoji: "🧈", per100g: { energy_kj: 339, protein_g: 8.1, fat_g: 3.7, carbs_g: 4.2, sodium_mg: 7.2, fiber_g: 0.4 } },
  { name: "内酯豆腐", category: "豆制品", emoji: "🧈", per100g: { energy_kj: 205, protein_g: 5.0, fat_g: 1.9, carbs_g: 3.3, sodium_mg: 2.3, fiber_g: 0.2 } },
  { name: "豆腐干", category: "豆制品", emoji: "🧈", per100g: { energy_kj: 590, protein_g: 15.8, fat_g: 6.2, carbs_g: 5.8, sodium_mg: 270.0, fiber_g: 1.0 } },
  { name: "豆浆", category: "豆制品", emoji: "🥛", per100g: { energy_kj: 67, protein_g: 1.8, fat_g: 0.7, carbs_g: 1.1, sodium_mg: 3.0, fiber_g: 0.1 } },
  { name: "腐竹", category: "豆制品", emoji: "🧈", per100g: { energy_kj: 1640, protein_g: 44.6, fat_g: 21.7, carbs_g: 22.3, sodium_mg: 26.5, fiber_g: 1.0 } },
  { name: "毛豆", category: "豆制品", emoji: "🫘", per100g: { energy_kj: 548, protein_g: 12.9, fat_g: 5.7, carbs_g: 10.5, sodium_mg: 3.9, fiber_g: 4.0 } },
  { name: "黄豆", category: "豆制品", emoji: "🫘", per100g: { energy_kj: 1632, protein_g: 35.0, fat_g: 16.0, carbs_g: 34.2, sodium_mg: 2.2, fiber_g: 15.5 } },
  { name: "绿豆", category: "豆制品", emoji: "🫘", per100g: { energy_kj: 1377, protein_g: 21.6, fat_g: 0.8, carbs_g: 62.0, sodium_mg: 3.2, fiber_g: 6.4 } },
  { name: "红豆", category: "豆制品", emoji: "🫘", per100g: { energy_kj: 1339, protein_g: 20.2, fat_g: 0.6, carbs_g: 63.4, sodium_mg: 2.2, fiber_g: 7.7 } },
  { name: "豆皮", category: "豆制品", emoji: "🧈", per100g: { energy_kj: 1720, protein_g: 44.6, fat_g: 20.6, carbs_g: 18.8, sodium_mg: 9.4, fiber_g: 2.0 } },
  { name: "素鸡", category: "豆制品", emoji: "🧈", per100g: { energy_kj: 803, protein_g: 16.5, fat_g: 12.5, carbs_g: 5.2, sodium_mg: 380.0, fiber_g: 1.0 } },
  { name: "千张", category: "豆制品", emoji: "🧈", per100g: { energy_kj: 1079, protein_g: 24.5, fat_g: 16.0, carbs_g: 5.5, sodium_mg: 20.6, fiber_g: 1.0 } },
  { name: "油豆腐", category: "豆制品", emoji: "🧈", per100g: { energy_kj: 1021, protein_g: 17.0, fat_g: 17.6, carbs_g: 4.9, sodium_mg: 32.5, fiber_g: 0.6 } },

  // ====== 水产类 ======
  { name: "三文鱼", category: "水产", emoji: "🐟", per100g: { energy_kj: 753, protein_g: 20.4, fat_g: 10.7, carbs_g: 0, sodium_mg: 59.0, fiber_g: 0 } },
  { name: "虾仁", category: "水产", emoji: "🦐", per100g: { energy_kj: 315, protein_g: 15.4, fat_g: 0.8, carbs_g: 0.1, sodium_mg: 860.0, fiber_g: 0 } },
  { name: "基围虾", category: "水产", emoji: "🦐", per100g: { energy_kj: 293, protein_g: 13.8, fat_g: 0.7, carbs_g: 0.1, sodium_mg: 111.0, fiber_g: 0 } },
  { name: "带鱼", category: "水产", emoji: "🐟", per100g: { energy_kj: 531, protein_g: 17.7, fat_g: 4.9, carbs_g: 0, sodium_mg: 150.1, fiber_g: 0 } },
  { name: "鲫鱼", category: "水产", emoji: "🐟", per100g: { energy_kj: 452, protein_g: 17.1, fat_g: 2.7, carbs_g: 3.8, sodium_mg: 42.0, fiber_g: 0 } },
  { name: "鳕鱼", category: "水产", emoji: "🐟", per100g: { energy_kj: 368, protein_g: 20.4, fat_g: 0.5, carbs_g: 0.5, sodium_mg: 78.3, fiber_g: 0 } },
  { name: "草鱼", category: "水产", emoji: "🐟", per100g: { energy_kj: 452, protein_g: 18.5, fat_g: 2.6, carbs_g: 0, sodium_mg: 50.1, fiber_g: 0 } },
  { name: "鱿鱼", category: "水产", emoji: "🦑", per100g: { energy_kj: 314, protein_g: 17.4, fat_g: 0.8, carbs_g: 0, sodium_mg: 110.0, fiber_g: 0 } },
  { name: "螃蟹", category: "水产", emoji: "🦀", per100g: { energy_kj: 389, protein_g: 13.8, fat_g: 2.3, carbs_g: 4.3, sodium_mg: 320.0, fiber_g: 0 } },
  { name: "蛤蜊", category: "水产", emoji: "🐚", per100g: { energy_kj: 259, protein_g: 10.1, fat_g: 1.1, carbs_g: 2.8, sodium_mg: 500.0, fiber_g: 0 } },
  { name: "牡蛎", category: "水产", emoji: "🦪", per100g: { energy_kj: 305, protein_g: 5.3, fat_g: 2.1, carbs_g: 8.2, sodium_mg: 462.1, fiber_g: 0 } },
  { name: "海带", category: "水产", emoji: "🌊", per100g: { energy_kj: 50, protein_g: 1.2, fat_g: 0.1, carbs_g: 2.1, sodium_mg: 3260.0, fiber_g: 0.5 } },
  { name: "紫菜", category: "水产", emoji: "🌊", per100g: { energy_kj: 866, protein_g: 26.7, fat_g: 1.1, carbs_g: 22.5, sodium_mg: 710.5, fiber_g: 21.6 } },

  // ====== 坚果零食类 ======
  { name: "花生", category: "坚果", emoji: "🥜", per100g: { energy_kj: 2356, protein_g: 24.8, fat_g: 44.3, carbs_g: 21.7, sodium_mg: 3.6, fiber_g: 5.5 } },
  { name: "核桃", category: "坚果", emoji: "🌰", per100g: { energy_kj: 2736, protein_g: 14.9, fat_g: 58.8, carbs_g: 19.1, sodium_mg: 6.4, fiber_g: 9.5 } },
  { name: "杏仁", category: "坚果", emoji: "🌰", per100g: { energy_kj: 2477, protein_g: 22.5, fat_g: 45.4, carbs_g: 19.9, sodium_mg: 8.3, fiber_g: 11.3 } },
  { name: "腰果", category: "坚果", emoji: "🌰", per100g: { energy_kj: 2414, protein_g: 18.2, fat_g: 43.9, carbs_g: 30.2, sodium_mg: 12.0, fiber_g: 3.3 } },
  { name: "瓜子", category: "坚果", emoji: "🌻", per100g: { energy_kj: 2435, protein_g: 22.6, fat_g: 49.0, carbs_g: 17.3, sodium_mg: 5.5, fiber_g: 8.6 } },
  { name: "开心果", category: "坚果", emoji: "🌰", per100g: { energy_kj: 2343, protein_g: 20.2, fat_g: 44.9, carbs_g: 21.4, sodium_mg: 10.0, fiber_g: 10.3 } },
  { name: "黑巧克力", category: "坚果", emoji: "🍫", per100g: { energy_kj: 2280, protein_g: 7.8, fat_g: 34.2, carbs_g: 52.0, sodium_mg: 10.0, fiber_g: 8.0 } },
  { name: "牛奶巧克力", category: "坚果", emoji: "🍫", per100g: { energy_kj: 2243, protein_g: 7.6, fat_g: 29.7, carbs_g: 59.4, sodium_mg: 100.0, fiber_g: 3.4 } },
  { name: "薯片", category: "坚果", emoji: "🍟", per100g: { energy_kj: 2238, protein_g: 5.9, fat_g: 33.9, carbs_g: 52.9, sodium_mg: 528.0, fiber_g: 3.8 } },
  { name: "饼干", category: "坚果", emoji: "🍪", per100g: { energy_kj: 1812, protein_g: 7.5, fat_g: 14.2, carbs_g: 70.2, sodium_mg: 204.0, fiber_g: 1.4 } },

  // ====== 调料及其他 ======
  { name: "食用油", category: "调料", emoji: "🫒", per100g: { energy_kj: 3699, protein_g: 0, fat_g: 99.9, carbs_g: 0, sodium_mg: 0, fiber_g: 0 } },
  { name: "蜂蜜", category: "调料", emoji: "🍯", per100g: { energy_kj: 1343, protein_g: 0.4, fat_g: 1.9, carbs_g: 75.6, sodium_mg: 0.3, fiber_g: 0 } },
  { name: "白砂糖", category: "调料", emoji: "🍬", per100g: { energy_kj: 1674, protein_g: 0, fat_g: 0, carbs_g: 99.9, sodium_mg: 0.4, fiber_g: 0 } },
  { name: "酱油", category: "调料", emoji: "🫗", per100g: { energy_kj: 264, protein_g: 5.6, fat_g: 0.1, carbs_g: 10.1, sodium_mg: 5757.0, fiber_g: 0.2 } },
  { name: "醋", category: "调料", emoji: "🫗", per100g: { energy_kj: 129, protein_g: 2.1, fat_g: 0.3, carbs_g: 4.9, sodium_mg: 262.1, fiber_g: 0 } },
  { name: "番茄酱", category: "调料", emoji: "🫗", per100g: { energy_kj: 347, protein_g: 1.7, fat_g: 0.2, carbs_g: 23.2, sodium_mg: 1120.0, fiber_g: 1.7 } },
  { name: "辣椒酱", category: "调料", emoji: "🌶️", per100g: { energy_kj: 272, protein_g: 1.6, fat_g: 2.3, carbs_g: 13.9, sodium_mg: 4640.0, fiber_g: 1.4 } },
  { name: "芝麻酱", category: "调料", emoji: "🫗", per100g: { energy_kj: 2636, protein_g: 19.0, fat_g: 52.7, carbs_g: 10.1, sodium_mg: 10.0, fiber_g: 5.0 } },
  { name: "味精", category: "调料", emoji: "🧂", per100g: { energy_kj: 1130, protein_g: 40.1, fat_g: 0.2, carbs_g: 26.5, sodium_mg: 12530.0, fiber_g: 0 } },
];

// 搜索函数
function searchFoods(query) {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim().toLowerCase();
  const results = [];
  for (const food of FOOD_DB) {
    if (food.name.toLowerCase().includes(q) || food.category.includes(q)) {
      results.push(food);
    }
    if (results.length >= 8) break;
  }
  return results;
}

// 按分类获取
function getFoodsByCategory(cat) {
  return FOOD_DB.filter(f => f.category === cat);
}

// 获取所有分类
function getCategories() {
  return [...new Set(FOOD_DB.map(f => f.category))];
}
