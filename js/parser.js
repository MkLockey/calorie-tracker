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

  // Name defaults to empty (photos typically show only nutrition table, not product name)

  // Name detection: try explicit fields first, then first short text line before table
  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let nameMatch = cleaned.match(/(?:产\s*品\s*名\s*称|食\s*品\s*名\s*称|品\s*名)\s*[:：]?\s*(.+)/);
  if (nameMatch) {
    result.name = nameMatch[1].trim().replace(/\s+/g, '').slice(0, 50);
  }
  if (!result.name) {
    for (const line of lines) {
      // Skip lines that are clearly part of the nutrition table
      if (/营养成分|项目|每\s*100|NRV|能量|蛋白|脂肪|碳水|纤维|钠|糖/.test(line)) break;
      if (/^\d/.test(line)) break;
      // Skip pure-ASCII noise (short garbled text like "AH", "A1")
      const hasChinese = /[一-鿿]/.test(line);
      const minLen = hasChinese ? 2 : 5;
      if (line.length >= minLen && line.length <= 30 && !/[<>{}]/.test(line)) {
        result.name = line.slice(0, 50);
        break;
      }
    }
  }

  // Detect per-100g or per-serving
  const isPer100g = /每\s*100\s*(克|g|G|毫升|ml|mL)/i.test(cleaned) ||
                    /per\s*100\s*g/i.test(cleaned) ||
                    /100\s*g/i.test(cleaned) ||
                    /100g/i.test(cleaned);

  // Extract energy (kJ) — try multiple patterns for OCR noise resilience
  let m;
  // Method 1: energy keyword + number + kJ unit
  m = cleaned.match(/(?:能量|热量|能\s*量)[^\d\n]*?(\d+\.?\d*)\s*(kj|kJ|KJ|千\s*焦)/i);
  if (m) result.energy_kj = parseFloat(m[1]);
  // Method 2: energy keyword + number + kcal unit (convert to kJ)
  if (!result.energy_kj) {
    m = cleaned.match(/(?:能量|热量|能\s*量)[^\d\n]*?(\d+\.?\d*)\s*(kcal|KCAL|千卡|大卡)/i);
    if (m) result.energy_kj = Math.round(parseFloat(m[1]) / KJ_TO_KCAL);
  }
  // Method 3: number + kJ anywhere after energy keyword (relaxed)
  if (!result.energy_kj) {
    const energyIdx = cleaned.search(/能量|热量/i);
    if (energyIdx !== -1) {
      const after = cleaned.slice(energyIdx);
      m = after.match(/(\d+\.?\d*)[^\n]{0,6}?(kj|kJ|千\s*焦)/i);
      if (m) result.energy_kj = parseFloat(m[1]);
    }
  }
  // Method 4: first number on any line containing energy keyword
  if (!result.energy_kj) {
    for (const line of lines) {
      if (/能量|热量/.test(line)) {
        m = line.match(/(\d+\.?\d*)/);
        if (m) {
          const val = parseFloat(m[1]);
          // Heuristic: if value > 50 and < 5000, treat as kJ (fits typical label range)
          // if value < 50, might be kcal — try dividing
          if (val >= 50 && val <= 5000) {
            result.energy_kj = val;
          } else if (val > 0 && val < 50) {
            // Could be kcal, but unlikely — skip to be safe
          }
          break;
        }
      }
    }
  }
  // Method 5: scan for the first "kJ" in the entire text
  if (!result.energy_kj) {
    m = cleaned.match(/(\d+\.?\d*)[^\n]{0,6}?(kj|kJ|千\s*焦)/i);
    if (m) result.energy_kj = parseFloat(m[1]);
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

  // Optional: fiber (膳食纤维) — broad patterns to handle OCR noise/missed characters
  result.fiber_g = extractNutrient(cleaned, /膳食纤维|膳[食\s]*纤维|纤[维難维]|纤维[素]?/, 'g');
  // Fallback 1: direct line-by-line scan for 纤维 with number+g
  if (!result.fiber_g) {
    for (const line of cleaned.split('\n')) {
      if (/纤维/.test(line)) {
        m = line.match(/(\d+\.?\d*)\s*g/i);
        if (!m) m = line.match(/(\d+\.?\d*)\s*克/);
        if (m) { result.fiber_g = parseFloat(m[1]); break; }
      }
    }
  }
  // Fallback 2: scan text after 碳水化合物 (fiber often follows carbs)
  if (!result.fiber_g) {
    const carbsIdx = cleaned.search(/碳水/);
    if (carbsIdx !== -1) {
      const tail = cleaned.slice(carbsIdx);
      const fibIdx = tail.search(/纤维/);
      if (fibIdx !== -1) {
        const fibPart = tail.slice(fibIdx);
        m = fibPart.match(/(\d+\.?\d*)\s*g/i);
        if (!m) m = fibPart.match(/(\d+\.?\d*)/);
        if (m) result.fiber_g = parseFloat(m[1]);
      }
    }
  }
  // Fallback 3: look for the last "g" value in the text (fiber is often last row)
  if (!result.fiber_g) {
    const fiberIdx = cleaned.search(/纤维/);
    if (fiberIdx !== -1) {
      const after = cleaned.slice(fiberIdx);
      // Prefer number with unit
      m = after.match(/(\d+\.?\d*)\s*g/i);
      if (m) result.fiber_g = parseFloat(m[1]);
    }
  }

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
  let val = null;

  // Method 1: line-by-line with unit suffix (bottom-up — nutrition table is at the end)
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0 && val === null; i--) {
    const line = lines[i];
    if (namePattern.test(line)) {
      if (unit === 'g') {
        let m = line.match(/(\d+\.?\d*)\s*g/i);
        if (!m) m = line.match(/(\d+\.?\d*)\s*克/);
        if (!m && i + 1 < lines.length) {
          m = lines[i + 1].match(/(\d+\.?\d*)\s*g/i);
          if (!m) m = lines[i + 1].match(/(\d+\.?\d*)\s*克/);
        }
        if (m) val = parseFloat(m[1]);
      } else if (unit === 'mg') {
        let m = line.match(/(\d+\.?\d*)\s*mg/i);
        if (!m) m = line.match(/(\d+\.?\d*)\s*毫\s*克/);
        if (!m && i + 1 < lines.length) {
          m = lines[i + 1].match(/(\d+\.?\d*)\s*mg/i);
          if (!m) m = lines[i + 1].match(/(\d+\.?\d*)\s*毫\s*克/);
        }
        if (m) val = parseFloat(m[1]);
      }
    }
  }

  // Method 2: fuzzy — find name pattern, prefer number+unit, fallback to any number
  if (val === null) {
    const idx = text.search(namePattern);
    if (idx !== -1) {
      const after = text.slice(idx);
      let m;
      if (unit === 'g') {
        m = after.match(/(\d+\.?\d*)\s*g/i);
        if (!m) m = after.match(/(\d+\.?\d*)\s*克/);
      } else if (unit === 'mg') {
        m = after.match(/(\d+\.?\d*)\s*mg/i);
        if (!m) m = after.match(/(\d+\.?\d*)\s*毫\s*克/);
      }
      if (!m) m = after.match(/(\d+\.?\d*)/);
      if (m) val = parseFloat(m[1]);
    }
  }

  // Sanity checks + OCR error correction (applies to both methods)
  if (val !== null) {
    // OCR fix: "10.9g" → "1099" (decimal lost, g→9)
    if (unit === 'g' && val > 100) {
      const fixed = val / 100;
      if (fixed >= 0.5 && fixed <= 50) val = Math.round(fixed * 10) / 10;
    }
    if (unit === 'g' && val > 100) return null;
    if (unit === 'mg' && val > 10000) return null;
    return val;
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
