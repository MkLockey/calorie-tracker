/**
 * Parse OCR text output to extract nutrition values.
 * Designed for Chinese nutrition fact labels (营养成分表).
 */

function parseNutritionText(text) {
  const result = {
    name: '',
    energy_kj: null,
    protein_g: null,
    fat_g: null,
    carbs_g: null,
    sodium_mg: null,
    fiber_g: null,
    sugar_g: null,
    confidence: 'low',
  };

  if (!text || text.trim().length === 0) {
    return result;
  }

  // Clean OCR artifacts
  let cleaned = text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // control chars
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  // Try to detect food name (first few meaningful lines before the table)
  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  const nameCandidates = [];
  for (const line of lines) {
    if (line.includes('营养成分') || line.includes('项目') || line.includes('每100') || /^\d/.test(line)) {
      break;
    }
    if (line.length >= 2 && !/^[\d\s.／/]+$/.test(line)) {
      nameCandidates.push(line);
    }
  }
  if (nameCandidates.length > 0) {
    result.name = nameCandidates[0].slice(0, 50);
  }

  // Detect per-100g or per-serving
  const isPer100g = /每\s*100\s*(克|g|G|毫升|ml|mL)/i.test(cleaned) ||
                    /per\s*100\s*g/i.test(cleaned) ||
                    /100\s*g/i.test(cleaned) ||
                    /100g/i.test(cleaned);

  // Extract energy (kJ)
  // Pattern like: 能量 1234 kJ  or  能量 500 kcal
  let m = cleaned.match(/(?:能量|热量|能量)[^\d]*(\d+\.?\d*)\s*(kj|kJ|KJ|千焦)/i);
  if (m) result.energy_kj = parseFloat(m[1]);
  if (!result.energy_kj) {
    m = cleaned.match(/(?:能量|热量|能量)[^\d]*(\d+\.?\d*)\s*(kcal|KCAL|千卡|大卡)/i);
    if (m) result.energy_kj = Math.round(parseFloat(m[1]) / KJ_TO_KCAL);
  }
  // Fallback: find number before kJ anywhere near energy keywords
  if (!result.energy_kj) {
    m = cleaned.match(/(?:能量|热量|能量).*?(\d+\.?\d*)\s*(kj|kJ|KJ)/i);
    if (m) result.energy_kj = parseFloat(m[1]);
  }
  // Last fallback: just find "能量" then any number with kJ
  if (!result.energy_kj) {
    const energySection = cleaned.match(/能量[^\n]*/i);
    if (energySection) {
      m = energySection[0].match(/(\d+\.?\d*)\s*(kj|kJ|KJ)/i);
      if (m) result.energy_kj = parseFloat(m[1]);
    }
  }

  // Extract protein (蛋白质)
  result.protein_g = extractNutrient(cleaned, /蛋白质|蛋白/, 'g');

  // Extract fat (脂肪)
  result.fat_g = extractNutrient(cleaned, /脂肪/, 'g');

  // Extract carbs (碳水化合物)
  result.carbs_g = extractNutrient(cleaned, /碳水化合物|碳水/, 'g');

  // Extract sodium (钠)
  result.sodium_mg = extractNutrient(cleaned, /钠/, 'mg');
  // Sodium might also be in mg without explicit mg unit nearby
  if (!result.sodium_mg) {
    m = cleaned.match(/钠[^\d]*(\d+\.?\d*)/);
    if (m) result.sodium_mg = parseFloat(m[1]);
  }

  // Optional: fiber (膳食纤维)
  result.fiber_g = extractNutrient(cleaned, /膳食纤维|纤维素/, 'g');

  // Optional: sugar (糖)
  result.sugar_g = extractNutrient(cleaned, /糖(?!尿|精)/, 'g');

  // Check confidence
  const foundCount = [result.energy_kj, result.protein_g, result.fat_g, result.carbs_g, result.sodium_mg]
    .filter(v => v != null).length;
  if (foundCount >= 4) result.confidence = 'high';
  else if (foundCount >= 2) result.confidence = 'medium';

  // If energy_kj is absurdly high (probably an OCR error), light fix
  if (result.energy_kj && result.energy_kj > 10000) {
    // Could be a decimal error
  }

  return result;
}

function extractNutrient(text, namePattern, unit) {
  // Method 1: Look for the nutrient name on the same or next line, extract number+unit
  // Chinese labels often: "蛋白质    12.3 g   20%"
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (namePattern.test(line)) {
      if (unit === 'g') {
        const m = line.match(/(\d+\.?\d*)\s*g/i);
        if (m) return parseFloat(m[1]);
      } else if (unit === 'mg') {
        const m = line.match(/(\d+\.?\d*)\s*mg/i);
        if (m) return parseFloat(m[1]);
      }
    }
  }

  // Method 2: Fuzzy - find name pattern, then grab the first number after it
  // even if across multiple lines
  const idx = text.search(namePattern);
  if (idx !== -1) {
    const after = text.slice(idx);
    const m = after.match(/(\d+\.?\d+)/);
    if (m) {
      const val = parseFloat(m[1]);
      // Sanity checks
      if (unit === 'g' && val > 100) return null; // unlikely more than 100g per 100g
      if (unit === 'mg' && val > 10000) return null;
      return val;
    }
  }

  return null;
}

// Fix common OCR mistakes in numbers
function fixOCRNumber(str) {
  return str
    .replace(/O/g, '0')
    .replace(/o/g, '0')
    .replace(/l/g, '1')
    .replace(/I/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/,/g, '.');
}
