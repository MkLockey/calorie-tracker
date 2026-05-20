// OCR module using Tesseract.js
// Loads from CDN: tesseract.js@5

let ocrWorker = null;
let ocrInitialized = false;

// Dynamically load Tesseract.js
function loadTesseract() {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve(window.Tesseract);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = () => {
      if (window.Tesseract) resolve(window.Tesseract);
      else reject(new Error('Tesseract load failed'));
    };
    script.onerror = () => reject(new Error('Network error loading Tesseract.js'));
    document.head.appendChild(script);
  });
}

async function initOCR(onProgress) {
  if (ocrInitialized && ocrWorker) return ocrWorker;

  await loadTesseract();
  onProgress?.('正在下载中文语言包（约 10MB，仅首次需要）...');

  const worker = await Tesseract.createWorker('chi_sim+eng', 1, {
    logger: (m) => {
      if (m.status === 'loading tesseract core' || m.status === 'loading language traineddata') {
        const pct = m.progress ? Math.round(m.progress * 100) : 0;
        onProgress?.(`${m.status}... ${pct}%`);
        const bar = document.getElementById('ocr-progress');
        if (bar) bar.style.width = pct + '%';
      } else if (m.status === 'recognizing text') {
        onProgress?.('正在识别文字...');
      }
    },
  });

  // PSM 6: uniform block of text — better for table-like nutrition labels
  await worker.setParameters({ tessedit_pageseg_mode: '6' });

  ocrWorker = worker;
  ocrInitialized = true;
  return worker;
}

async function runOCR(imageDataUrl, onProgress) {
  const worker = await initOCR(onProgress);
  onProgress?.('正在识别文字...');

  const { data } = await worker.recognize(imageDataUrl);
  return data.text;
}

async function preprocessImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Resize large images to max 1500px for faster OCR
      const MAX = 1500;
      let w = img.width;
      let h = img.height;
      if (w > MAX || h > MAX) {
        const ratio = Math.min(MAX / w, MAX / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Moderate enhancement — thin text (like fiber row) needs contrast boost
      ctx.filter = 'contrast(1.15) brightness(1.02)';
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, w, h);

      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        width: w,
        height: h,
      });
    };
    img.src = URL.createObjectURL(file);
  });
}
