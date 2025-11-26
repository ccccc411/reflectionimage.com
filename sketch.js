const NUM_BLOBS = 13;
let blobs = []; // 存所有線團的參數物件

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
        cx,
        cy,
        lineCount: lineCounts[index], // 每個線團裡有幾條線
        baseFreq: baseFreqs[index], // 基本波動頻率
        amp: amps[index], // 振幅（上下晃動高度）
        len: lens[index], // 線的長度
        noiseScale: noiseScales[index], // noise 在 x 方向的縮放
        noiseSpeed: noiseSpeeds[index], // noise 在時間上的速度
        jitterAmount: jitters[index], // 扭動幅度
        timeScale: timeScales[index], // 每個狀態運動速度
        phaseOffset: random(0.5, 1.5), // 每條線之間的相位差
        seed: random(10000), // 每個線團自己的 noise 起始值
      };
      blobs.push(blob);
      index++;
    }
  }
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
  for (let k = 0; k < blob.lineCount; k++) {
    beginShape();
    // 讓每條線有一點點不同的相位與偏移
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
      const ny = t * blob.noiseSpeed + k * 0.15;
      const n = noise(nx, ny);
      const jitterX = map(n, 0, 1, -blob.jitterAmount, blob.jitterAmount);
      const jitterY = map(n, 0, 1, -blob.jitterAmount, blob.jitterAmount);
      const px = blob.cx + x + jitterX;
      const py = blob.cy + y + jitterY;
      vertex(px, py);
    }
    endShape();
  }
}
