// sketch-line.js

let mode = "line"; // "line", "morph", "unmorph"
let blob;
let lineId = 0;

// 多條線：每一條線是一個 points array
let cachedLines = []; // 當幀動態線條（給 hit test 用）
let baseLines = []; // 開始打結那一刻的線條（morph 起點）
let hitCenter = null; // 使用者按下的位置
let morphProgress = 0; // 0~1

const SCALE = 10;

// ========= 和首頁完全一致的參數 =========
const lineCounts = [15, 8, 3, 2, 5, 8, 5, 2, 3, 4, 7, 5, 4];
const baseFreqs = [
  0.2, 0.08, 0.12, 0.1, 0.15, 0.5, 0.6, 0.25, 0.3, 0.2, 0.1, 0.08, 0.25,
];
const amps = [20, 15, 13, 19, 5, 1, 10, 25, 10, 25, 15, 8, 15];
const lens = [140, 120, 140, 140, 110, 130, 130, 170, 140, 125, 130, 160, 150];
const noiseScales = [
  0.02, 0.03, 0.025, 0.04, 0.035, 0.03, 0.05, 0.045, 0.028, 0.038, 0.06, 0.033,
  0.05,
];
const noiseSpeeds = [
  0.05, 0.01, 0.008, 0.015, 0.012, 0.007, 0.02, 0.018, 0.01, 0.014, 0.025,
  0.016, 0.03,
];
const jitters = [10, 10, 7, 3, 15, 20, 7, 7, 9, 15, 5, 3, 8];
const timeScales = [
  1.5, 1.2, 0.7, 0.6, 1.0, 0.9, 1.5, 1.3, 2.0, 1.5, 1.3, 1.8, 1.2,
];
// =========================================

const NUM_STATES = lineCounts.length;

// 讀取 URL 中的 id：同時支援 ?id=3 和 #3
function getLineIdFromUrl() {
  let id = 0;

  // 1) 先試 query string: ?id=3
  const params = new URLSearchParams(window.location.search);
  if (params.has("id")) {
    id = parseInt(params.get("id"), 10);
  } else if (window.location.hash) {
    // 2) 再看 hash: #3
    const h = window.location.hash.replace("#", "");
    id = parseInt(h, 10);
  }

  if (isNaN(id)) id = 0;

  // 不用 p5 的 constrain，自己做 clamp，避免奇怪情況
  id = Math.max(0, Math.min(NUM_STATES - 1, id));

  return id;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(2);
  stroke(0);
  strokeWeight(1);
  noFill();

  lineId = getLineIdFromUrl();
  // 可以暫時開著 debug 看看每頁拿到的 id 是不是有變
  // console.log("lineId =", lineId, "url =", window.location.href);

  initBlob(lineId);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initBlob(lineId);
}

function initBlob(id) {
  mode = "line";
  morphProgress = 0;
  cachedLines = [];
  baseLines = [];
  hitCenter = null;

  blob = {
    id,
    cx: width / 2,
    cy: height / 2,
    lineCount: lineCounts[id],
    baseFreq: baseFreqs[id],
    amp: amps[id],
    len: lens[id],
    noiseScale: noiseScales[id],
    noiseSpeed: noiseSpeeds[id],
    jitterAmount: jitters[id],
    timeScale: timeScales[id],
    phaseOffset: 0.7 + id * 0.13,
    seed: 1000 + id * 777,
  };
}

function draw() {
  background(255);

  if (mode === "line") {
    const t = frameCount;
    drawBlob(blob, t, true, SCALE); // 畫整團線，並收集點到 cachedLines
  } else if (mode === "morph" || mode === "unmorph") {
    updateMorph();
    drawMorphing();
  }
}

// ========== 多條線：和首頁一樣，只是放大 ==========
function drawBlob(blob, t, collectPoints, scaleFactor = 1) {
  const tLocal = t * blob.timeScale;
  const cx = blob.cx;
  const cy = blob.cy;

  if (collectPoints) cachedLines = [];

  for (let k = 0; k < blob.lineCount; k++) {
    beginShape();
    let linePoints = []; // 這一條線自己的點

    const phase = k * blob.phaseOffset;
    const localAmp = blob.amp * map(k, 0, blob.lineCount - 1, 0.6, 1.1);
    const len = blob.len;
    const step = 4;

    for (let x = -len / 2; x <= len / 2; x += step) {
      const angle = x * blob.baseFreq + phase;
      let y = sin(angle) * localAmp;

      const nx = blob.seed + x * blob.noiseScale + k * 10.0;
      const ny = tLocal * blob.noiseSpeed + k * 0.15;
      const n = noise(nx, ny);

      const jitterX = map(n, 0, 1, -blob.jitterAmount, blob.jitterAmount);
      const jitterY = map(n, 0, 1, -blob.jitterAmount, blob.jitterAmount);

      const px0 = cx + x + jitterX;
      const py0 = cy + y + jitterY;

      const dx = px0 - cx;
      const dy = py0 - cy;

      const px = cx + dx * scaleFactor;
      const py = cy + dy * scaleFactor;

      vertex(px, py);

      if (collectPoints) linePoints.push(createVector(px, py));
    }

    endShape();

    if (collectPoints) cachedLines.push(linePoints);
  }
}

// ==================== Morph 過程 ====================
function updateMorph() {
  if (mode === "morph") {
    morphProgress += 0.02; // 打結速度
    if (morphProgress >= 1) morphProgress = 1;
  } else if (mode === "unmorph") {
    morphProgress -= 0.03; // 回復速度
    if (morphProgress <= 0) {
      morphProgress = 0;
      mode = "line"; // 回到正常狀態
    }
  }
}

// 把「整團線」一起變成亂線球，但每條線自己畫自己的路徑
function drawMorphing() {
  if (!baseLines.length || !hitCenter) return;

  const e = ease(morphProgress); // 0~1

  const baseRadius = min(width, height) * 0.12;
  const loops = 6 + blob.id; // 圈數：越大越密

  for (let li = 0; li < baseLines.length; li++) {
    const linePts = baseLines[li];
    const total = linePts.length;
    if (total === 0) continue;

    beginShape();

    for (let i = 0; i < total; i++) {
      const p0 = linePts[i];
      const u = total <= 1 ? 0 : i / (total - 1); // 0~1

      // 基本螺旋角度（不同線加一點位移，避免完全重疊）
      const thetaBase = u * TWO_PI * loops + li * 0.2;

      // 半徑亂度
      const nR = noise(blob.id * 10 + li * 5.0 + u * 10.0, morphProgress * 5.0);
      const r = baseRadius * (0.4 + 0.6 * nR); // 0.4~1.0

      // 角度亂度
      const nA = noise(blob.id * 33 + li * 8.0 + u * 15.0, morphProgress * 7.0);
      const jitterAngle = (nA - 0.5) * TWO_PI * 0.8;
      const theta = thetaBase + jitterAngle;

      const tx = hitCenter.x + cos(theta) * r;
      const ty = hitCenter.y + sin(theta) * r;

      const px = lerp(p0.x, tx, e);
      const py = lerp(p0.y, ty, e);

      vertex(px, py);
    }

    endShape();
  }
}

function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2;
}

// ==================== 觸控 / 滑鼠 ====================

function checkHit(tx, ty) {
  const threshold = 20;
  for (let line of cachedLines) {
    for (let p of line) {
      if (dist(tx, ty, p.x, p.y) < threshold) return true;
    }
  }
  return false;
}

function startMorph(tx, ty) {
  // 深拷貝 cachedLines → baseLines
  baseLines = cachedLines.map((line) => line.map((p) => p.copy()));
  hitCenter = createVector(tx, ty);
  morphProgress = 0;
  mode = "morph";
}

function stopMorph() {
  if (mode === "morph") mode = "unmorph";
}

function touchStarted() {
  const tx = touches[0]?.x ?? mouseX;
  const ty = touches[0]?.y ?? mouseY;
  if (mode === "line" && checkHit(tx, ty)) {
    startMorph(tx, ty);
    return false; // 點到線才阻止預設行為，避免畫面滑動
  }
  // 點其他地方（例如返回箭頭）就不擋
}

function touchEnded() {
  stopMorph();
}

function mousePressed() {
  const tx = mouseX;
  const ty = mouseY;
  if (mode === "line" && checkHit(tx, ty)) {
    startMorph(tx, ty);
  }
}

function mouseReleased() {
  stopMorph();
}

