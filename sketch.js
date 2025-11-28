const NUM_BLOBS = 13;
let blobs = []; // 存所有線團的參數物件

const lineCounts = [15, 8, 3, 2, 5, 8, 5, 2, 3, 4, 7, 5, 4];
const baseFreqs = [
  0.2, 0.08, 0.12, 0.1, 0.15, 0.5, 0.6, 0.25, 0.3, 0.2, 0.1, 0.08, 0.25,
]; // 基本頻率
const amps = [20, 15, 13, 19, 5, 1, 10, 25, 10, 25, 15, 8, 15]; // 振幅
const lens = [100, 120, 140, 140, 110, 130, 130, 170, 140, 125, 130, 160, 150]; // 線長
const noiseScales = [
  0.02, 0.03, 0.025, 0.04, 0.035, 0.03, 0.05, 0.045, 0.028, 0.038, 0.06, 0.033,
  0.05,
]; // 不用改
const noiseSpeeds = [
  0.05, 0.01, 0.008, 0.015, 0.012, 0.007, 0.02, 0.018, 0.01, 0.014, 0.025,
  0.016, 0.03,
]; // 不用改
const jitters = [10, 10, 7, 3, 15, 20, 7, 7, 9, 15, 5, 3, 8]; // 扭動幅度
const timeScales = [
  1.5, 1.2, 0.7, 0.6, 1.0, 0.9, 1.5, 1.3, 2.0, 1.5, 1.3, 1.8, 1.2,
]; // 每個狀態運動速度

const margin = 20; // ← 點擊範圍外擴的距離，一定要先宣告

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(5);
  stroke(0);
  noFill();
  initBlobs();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initBlobs();
}

function initBlobs() {
  blobs = [];
  background(255);

  const cols = 4;
  const spacingX = width / 5;
  const spacingY = height / 5;

  let index = 0;
  for (let row = 0; row < 4 && index < NUM_BLOBS; row++) {
    for (let col = 0; col < cols && index < NUM_BLOBS; col++) {
      const cx = (col + 1) * spacingX;
      const cy = (row + 1) * spacingY;

      const blob = {
        id: index, // ★ 很重要：給每個狀態一個 id
        cx,
        cy,
        lineCount: lineCounts[index],
        baseFreq: baseFreqs[index],
        amp: amps[index],
        len: lens[index],
        noiseScale: noiseScales[index],
        noiseSpeed: noiseSpeeds[index],
        jitterAmount: jitters[index],
        timeScale: timeScales[index],
        phaseOffset: random(0.5, 1.5),
        seed: random(10000),
        bounds: null, // ★ 之後存點擊範圍
      };
      blobs.push(blob);
      index++;
    }
  }

  // 讓第 13 個（index 12）在水平中央
  if (blobs.length === NUM_BLOBS) {
    blobs[12].cx = width / 2;
  }
}

function draw() {
  background(255);
  const t = frameCount; // 全局時間，用來讓線扭動

  for (let i = 0; i < blobs.length; i++) {
    drawBlob(blobs[i], t);
  }
}

// 畫一個線團（多條線纏繞在一起、會扭動）
function drawBlob(blob, t) {
  strokeWeight(1);

  const tLocal = t * blob.timeScale;

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  for (let k = 0; k < blob.lineCount; k++) {
    beginShape();

    const phase = k * blob.phaseOffset;
    const localAmp = blob.amp * map(k, 0, blob.lineCount - 1, 0.6, 1.1);
    const len = blob.len;
    const step = 4; // 頂點間距

    for (let x = -len / 2; x <= len / 2; x += step) {
      // 基本正弦波，控制線條大致上下起伏
      const angle = x * blob.baseFreq + phase;
      let y = sin(angle) * localAmp;

      // 加上 noise 做扭動（動態變化）
      const nx = blob.seed + x * blob.noiseScale + k * 10.0;
      const ny = tLocal * blob.noiseSpeed + k * 0.15; // ★ 用 tLocal，timeScale 才生效
      const n = noise(nx, ny);

      const jitterX = map(n, 0, 1, -blob.jitterAmount, blob.jitterAmount);
      const jitterY = map(n, 0, 1, -blob.jitterAmount, blob.jitterAmount);

      const px = blob.cx + x + jitterX;
      const py = blob.cy + y + jitterY;

      vertex(px, py);

      // 計算邊界
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

    endShape();
  }

  // 存成點擊範圍
  blob.bounds = {
    x1: minX - margin,
    y1: minY - margin,
    x2: maxX + margin,
    y2: maxY + margin,
  };
}

// ===== 點擊 / 觸控偵測，跳到單一線條頁 =====

function isInsideBounds(x, y, b) {
  return x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2;
}

function handlePointer(px, py) {
  for (let blob of blobs) {
    if (blob.bounds && isInsideBounds(px, py, blob.bounds)) {
      window.location.href = `./line.html?id=${blob.id}`;
      break;
    }
  }
}

// 桌面滑鼠
function mousePressed() {
  handlePointer(mouseX, mouseY);
}

// 平板觸控
function touchStarted() {
  const tx = touches[0]?.x ?? mouseX;
  const ty = touches[0]?.y ?? mouseY;
  handlePointer(tx, ty);
  return false;
}


