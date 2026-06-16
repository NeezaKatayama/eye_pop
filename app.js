const LEFT_EYE = {
  outer: 33,
  inner: 133,
  topA: 159,
  bottomA: 145,
  topB: 160,
  bottomB: 144,
  iris: [468, 469, 470, 471, 472]
};

const RIGHT_EYE = {
  outer: 263,
  inner: 362,
  topA: 386,
  bottomA: 374,
  topB: 385,
  bottomB: 380,
  iris: [473, 474, 475, 476, 477]
};

const dom = {
  video: document.getElementById("video"),
  canvas: document.getElementById("visionCanvas"),
  overlay: document.getElementById("hudOverlay"),
  startButton: document.getElementById("startButton"),
  connectionStatus: document.getElementById("connectionStatus"),
  fatigueValue: document.getElementById("fatigueValue"),
  fatigueText: document.getElementById("fatigueText"),
  dryEyeValue: document.getElementById("dryEyeValue"),
  dryEyeText: document.getElementById("dryEyeText"),
  focusValue: document.getElementById("focusValue"),
  focusText: document.getElementById("focusText"),
  recoveryValue: document.getElementById("recoveryValue"),
  recoveryText: document.getElementById("recoveryText"),
  blinkRateValue: document.getElementById("blinkRateValue"),
  perclosValue: document.getElementById("perclosValue"),
  blinkDurationValue: document.getElementById("blinkDurationValue"),
  partialBlinkValue: document.getElementById("partialBlinkValue"),
  irisDriftValue: document.getElementById("irisDriftValue"),
  summaryText: document.getElementById("summaryText"),
  signalLockValue: document.getElementById("signalLockValue"),
  eyeClosureValue: document.getElementById("eyeClosureValue"),
  blinkPatternValue: document.getElementById("blinkPatternValue"),
  visualLoadValue: document.getElementById("visualLoadValue"),
  reticlePhaseValue: document.getElementById("reticlePhaseValue"),
  meshConfidenceValue: document.getElementById("meshConfidenceValue"),
  ocularSyncValue: document.getElementById("ocularSyncValue"),
  scanPulseValue: document.getElementById("scanPulseValue"),
  liveClock: document.getElementById("liveClock"),
  scanModeLabel: document.getElementById("scanModeLabel")
};

const hudState = {
  faceDetected: false,
  eyeCenters: [],
  scanLine: 0,
  pulse: 0,
  glitch: 0,
  metrics: {
    fatigue: 0,
    dryEye: 0,
    focus: 0,
    recovery: 0
  },
  sync: 0
};

const analysisState = {
  baselineEar: null,
  smoothedEar: null,
  eyeClosed: false,
  blinkStartedAt: null,
  lastFrameAt: null,
  closureHistory: [],
  blinkEvents: [],
  partialBlinkCount: 0,
  totalBlinkCount: 0,
  irisHistory: [],
  latest: {
    blinkRate: 0,
    perclos: 0,
    averageBlinkMs: 0,
    partialBlinkRatio: 0,
    irisDrift: 0,
    fatigue: 0,
    dryEye: 0,
    focus: 0,
    recovery: 0
  }
};

let faceMesh = null;
let camera = null;
let ctx = null;

dom.startButton.addEventListener("click", startExperience);

async function startExperience() {
  dom.startButton.disabled = true;
  dom.startButton.textContent = "Initializing";
  updateStatus("Starting camera link", true);

  try {
    await setupFaceMesh();
    dom.startButton.textContent = "Live";
  } catch (error) {
    console.error(error);
    updateStatus("Camera init failed", false);
    dom.startButton.disabled = false;
    dom.startButton.textContent = "Retry";
    dom.summaryText.textContent =
      "カメラや CDN ライブラリの初期化に失敗しました。ブラウザ権限とネット接続を確認してください。";
  }
}

async function setupFaceMesh() {
  ctx = dom.canvas.getContext("2d");
  dom.video.style.opacity = "0";

  faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  faceMesh.onResults(handleResults);

  camera = new Camera(dom.video, {
    onFrame: async () => {
      await faceMesh.send({ image: dom.video });
    },
    width: 1280,
    height: 720
  });

  await camera.start();
  updateStatus("Camera live", true);
}

function handleResults(results) {
  resizeStage();
  ctx.clearRect(0, 0, dom.canvas.clientWidth, dom.canvas.clientHeight);
  drawVideoFrame(results.image || dom.video);

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];
    hudState.faceDetected = true;
    analyzeEyes(landmarks);
    drawVisionMesh(landmarks);
  } else {
    hudState.faceDetected = false;
    hudState.eyeCenters = [];
    decayMetrics();
  }
}

function resizeStage() {
  const { width, height } = dom.video.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  dom.canvas.style.width = `${width}px`;
  dom.canvas.style.height = `${height}px`;
  dom.canvas.width = width * pixelRatio;
  dom.canvas.height = height * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function analyzeEyes(landmarks) {
  const now = performance.now();
  const left = extractEyeMetrics(landmarks, LEFT_EYE);
  const right = extractEyeMetrics(landmarks, RIGHT_EYE);
  const avgEar = (left.ear + right.ear) * 0.5;
  const smoothFactor = 0.2;

  analysisState.smoothedEar =
    analysisState.smoothedEar == null
      ? avgEar
      : analysisState.smoothedEar * (1 - smoothFactor) + avgEar * smoothFactor;

  if (analysisState.baselineEar == null) {
    analysisState.baselineEar = analysisState.smoothedEar;
  } else {
    analysisState.baselineEar = analysisState.baselineEar * 0.98 + Math.max(analysisState.baselineEar, analysisState.smoothedEar) * 0.02;
  }

  const closureThreshold = analysisState.baselineEar * 0.7;
  const partialThreshold = analysisState.baselineEar * 0.86;
  const eyesClosedNow = analysisState.smoothedEar < closureThreshold;

  analysisState.closureHistory.push({ t: now, closed: eyesClosedNow ? 1 : 0 });
  pruneHistory(analysisState.closureHistory, now - 60000);

  const irisDrift = computeIrisDrift(left, right);
  analysisState.irisHistory.push({ t: now, x: irisDrift });
  pruneHistory(analysisState.irisHistory, now - 15000);

  if (eyesClosedNow && !analysisState.eyeClosed) {
    analysisState.eyeClosed = true;
    analysisState.blinkStartedAt = now;
  } else if (!eyesClosedNow && analysisState.eyeClosed) {
    const duration = now - (analysisState.blinkStartedAt || now);
    analysisState.eyeClosed = false;
    if (duration > 45 && duration < 900) {
      analysisState.totalBlinkCount += 1;
      const partial = analysisState.smoothedEar > closureThreshold && analysisState.smoothedEar < partialThreshold;
      if (partial) {
        analysisState.partialBlinkCount += 1;
      }
      analysisState.blinkEvents.push({
        t: now,
        duration,
        partial
      });
      pruneHistory(analysisState.blinkEvents, now - 60000);
    }
    analysisState.blinkStartedAt = null;
  }

  const blinkRate = analysisState.blinkEvents.length;
  const perclos = analysisState.closureHistory.reduce((sum, item) => sum + item.closed, 0) / Math.max(analysisState.closureHistory.length, 1);
  const averageBlinkMs =
    analysisState.blinkEvents.reduce((sum, item) => sum + item.duration, 0) / Math.max(analysisState.blinkEvents.length, 1);
  const partialBlinkRatio =
    analysisState.blinkEvents.filter((item) => item.partial).length / Math.max(analysisState.blinkEvents.length, 1);

  const fatigue = clamp01(perclos * 1.55 + normalize(averageBlinkMs, 180, 420) * 0.22);
  const dryEye = clamp01(normalize(8 - blinkRate, 0, 8) * 0.55 + partialBlinkRatio * 0.35 + normalize(irisDrift, 0.02, 0.12) * 0.1);
  const focus = clamp01(1 - normalize(irisDrift, 0.012, 0.09) * 0.65 - normalize(perclos, 0.12, 0.32) * 0.35);
  const recovery = clamp01(1 - fatigue * 0.45 - dryEye * 0.35 + focus * 0.3);
  const sync = clamp01(1 - Math.abs(left.ear - right.ear) * 12 - irisDrift * 0.24);

  analysisState.latest = {
    blinkRate,
    perclos,
    averageBlinkMs: Number.isFinite(averageBlinkMs) ? averageBlinkMs : 0,
    partialBlinkRatio,
    irisDrift,
    fatigue,
    dryEye,
    focus,
    recovery,
    sync
  };

  hudState.metrics = { fatigue, dryEye, focus, recovery };
  hudState.eyeCenters = [left.center, right.center];
  hudState.sync = sync;
  updateDashboard();
}

function extractEyeMetrics(landmarks, eyeConfig) {
  const outer = projectPoint(landmarks[eyeConfig.outer]);
  const inner = projectPoint(landmarks[eyeConfig.inner]);
  const topA = projectPoint(landmarks[eyeConfig.topA]);
  const bottomA = projectPoint(landmarks[eyeConfig.bottomA]);
  const topB = projectPoint(landmarks[eyeConfig.topB]);
  const bottomB = projectPoint(landmarks[eyeConfig.bottomB]);
  const irisPoints = eyeConfig.iris.map((index) => projectPoint(landmarks[index]));

  const width = dist2d(outer, inner);
  const verticalA = dist2d(topA, bottomA);
  const verticalB = dist2d(topB, bottomB);
  const ear = (verticalA + verticalB) / Math.max(2 * width, 0.0001);

  const center = averagePoint([outer, inner, topA, bottomA, topB, bottomB]);
  const irisCenter = averagePoint(irisPoints);

  return {
    outer,
    inner,
    topA,
    bottomA,
    topB,
    bottomB,
    center,
    irisCenter,
    width,
    ear
  };
}

function projectPoint(point) {
  const layout = getVideoCoverLayout();
  return {
    x: dom.canvas.clientWidth - (layout.offsetX + point.x * layout.renderedWidth),
    y: layout.offsetY + point.y * layout.renderedHeight
  };
}

function drawVideoFrame(source) {
  if (!source) {
    return;
  }

  const layout = getVideoCoverLayout();
  ctx.save();
  ctx.translate(dom.canvas.clientWidth, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, layout.offsetX, layout.offsetY, layout.renderedWidth, layout.renderedHeight);
  ctx.restore();
}

function drawVisionMesh(landmarks) {
  const isPop = document.body.classList.contains("pop-body");
  drawConnectorSet(landmarks, FACEMESH_LEFT_EYE, isPop ? "rgba(0, 0, 0, 0.72)" : "rgba(87, 243, 255, 0.82)", isPop ? 1.1 : 1.3);
  drawConnectorSet(landmarks, FACEMESH_RIGHT_EYE, isPop ? "rgba(0, 0, 0, 0.72)" : "rgba(87, 243, 255, 0.82)", isPop ? 1.1 : 1.3);
  drawConnectorSet(landmarks, FACEMESH_LEFT_IRIS, isPop ? "rgba(222, 61, 74, 0.92)" : "rgba(255, 151, 83, 0.86)", isPop ? 1.5 : 1.8);
  drawConnectorSet(landmarks, FACEMESH_RIGHT_IRIS, isPop ? "rgba(222, 61, 74, 0.92)" : "rgba(255, 151, 83, 0.86)", isPop ? 1.5 : 1.8);
  drawConnectorSet(landmarks, FACEMESH_FACE_OVAL, isPop ? "rgba(0, 0, 0, 0.28)" : "rgba(87, 243, 255, 0.24)", 1);

  for (const center of hudState.eyeCenters) {
    ctx.beginPath();
    ctx.arc(center.x, center.y, 10, 0, Math.PI * 2);
    ctx.strokeStyle = isPop ? "rgba(93, 149, 173, 0.9)" : "rgba(255, 154, 92, 0.82)";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(center.x - 18, center.y);
    ctx.lineTo(center.x + 18, center.y);
    ctx.moveTo(center.x, center.y - 18);
    ctx.lineTo(center.x, center.y + 18);
    ctx.strokeStyle = isPop ? "rgba(0, 0, 0, 0.48)" : "rgba(87, 243, 255, 0.7)";
    ctx.lineWidth = isPop ? 1 : 1.2;
    ctx.stroke();
  }
}

function drawConnectorSet(landmarks, connectors, strokeStyle, lineWidth) {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;

  for (const [startIndex, endIndex] of connectors) {
    const start = projectPoint(landmarks[startIndex]);
    const end = projectPoint(landmarks[endIndex]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
}

function getVideoCoverLayout() {
  const displayWidth = dom.canvas.clientWidth || 1;
  const displayHeight = dom.canvas.clientHeight || 1;
  const sourceWidth = dom.video.videoWidth || displayWidth;
  const sourceHeight = dom.video.videoHeight || displayHeight;
  const scale = Math.max(displayWidth / sourceWidth, displayHeight / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;

  return {
    renderedWidth,
    renderedHeight,
    offsetX: (displayWidth - renderedWidth) * 0.5,
    offsetY: (displayHeight - renderedHeight) * 0.5
  };
}

function computeIrisDrift(left, right) {
  const leftRatio = (left.irisCenter.x - left.inner.x) / Math.max(left.outer.x - left.inner.x, 0.0001);
  const rightRatio = (right.irisCenter.x - right.outer.x) / Math.max(right.inner.x - right.outer.x, 0.0001);
  return Math.abs(leftRatio - 0.5) + Math.abs(rightRatio - 0.5);
}

function updateDashboard() {
  const { blinkRate, perclos, averageBlinkMs, partialBlinkRatio, irisDrift, fatigue, dryEye, focus, recovery, sync } = analysisState.latest;

  dom.blinkRateValue.textContent = `${Math.round(blinkRate)} /min`;
  dom.perclosValue.textContent = `${Math.round(perclos * 100)} %`;
  dom.blinkDurationValue.textContent = `${Math.round(averageBlinkMs || 0)} ms`;
  dom.partialBlinkValue.textContent = `${Math.round(partialBlinkRatio * 100)} %`;
  dom.irisDriftValue.textContent = `${irisDrift.toFixed(3)}`;

  setMetric(dom.fatigueValue, dom.fatigueText, fatigue, ["low load", "mild fatigue", "elevated fatigue", "high drowsiness risk"]);
  setMetric(dom.dryEyeValue, dom.dryEyeText, dryEye, ["tear film stable", "slight strain", "dry-eye tendency", "blink recovery advised"]);
  setMetric(dom.focusValue, dom.focusText, focus, ["unstable", "recovering", "stable", "locked in"]);
  setMetric(dom.recoveryValue, dom.recoveryText, recovery, ["depleted", "fragile", "functional", "well recovered"]);

  dom.signalLockValue.textContent = hudState.faceDetected ? "LOCKED" : "SEARCH";
  dom.eyeClosureValue.textContent = `${Math.round(perclos * 100)}%`;
  dom.blinkPatternValue.textContent = blinkRate < 8 ? "DRY" : blinkRate > 28 ? "RAPID" : "STABLE";
  dom.visualLoadValue.textContent = fatigue > 0.65 ? "HEAVY" : dryEye > 0.55 ? "MEDIUM" : "LOW";
  dom.reticlePhaseValue.textContent = hudState.pulse.toFixed(2);
  dom.meshConfidenceValue.textContent = hudState.faceDetected ? "FACE LOCK" : "NO LOCK";
  dom.ocularSyncValue.textContent = `${Math.round(sync * 100)}%`;
  dom.scanPulseValue.textContent = `${Math.round(hudState.pulse * 100)}%`;
  dom.scanModeLabel.textContent = `MODE / ${fatigue > 0.65 ? "FATIGUE ALERT" : dryEye > 0.55 ? "DRY-EYE WATCH" : "PASSIVE SWEEP"}`;
  dom.summaryText.textContent = buildSummary(fatigue, dryEye, focus, recovery);
  persistSnapshot();
}

function setMetric(valueEl, textEl, score, labels) {
  const percent = Math.round(score * 100);
  valueEl.textContent = `${percent}%`;
  let idx = 0;
  if (score > 0.75) idx = 3;
  else if (score > 0.5) idx = 2;
  else if (score > 0.25) idx = 1;
  textEl.textContent = labels[idx];
}

function buildSummary(fatigue, dryEye, focus, recovery) {
  if (fatigue > 0.68) {
    return "少し疲れが出ているようです。短く休憩して目線をリセットすると、落ち着きやすくなります。";
  }
  if (dryEye > 0.62) {
    return "やや乾燥気味の傾向があります。画面から目を離して、しっかり瞬きをすると整いやすいです。";
  }
  if (focus > 0.68 && recovery > 0.58) {
    return "視線はかなり安定しています。今の姿勢や明るさを保つと、この状態を維持しやすそうです。";
  }
  return "大きな負荷は見られません。もう少し測定を続けると、スコアが安定してきます。";
}

function decayMetrics() {
  hudState.metrics.fatigue *= 0.96;
  hudState.metrics.dryEye *= 0.96;
  hudState.metrics.focus *= 0.94;
  hudState.metrics.recovery *= 0.95;
}

function updateStatus(text, live) {
  dom.connectionStatus.textContent = live ? text.toUpperCase() : text.toUpperCase();
  dom.connectionStatus.className = `status-pill ${live ? "status-live" : "status-idle"}`;
}

function pruneHistory(items, cutoff) {
  while (items.length && items[0].t < cutoff) {
    items.shift();
  }
}

function averagePoint(points) {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length
  };
}

function dist2d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function normalize(value, min, max) {
  return clamp01((value - min) / Math.max(max - min, 0.0001));
}

function persistSnapshot() {
  try {
    const payload = {
      capturedAt: new Date().toISOString(),
      faceDetected: hudState.faceDetected,
      pulse: hudState.pulse,
      ...analysisState.latest
    };
    localStorage.setItem("eye-health-hud-snapshot", JSON.stringify(payload));
  } catch (error) {
    console.warn("snapshot persistence failed", error);
  }
}

new p5((p) => {
  const particles = Array.from({ length: 42 }, () => ({
    x: Math.random(),
    y: Math.random(),
    speed: 0.001 + Math.random() * 0.004,
    size: 1 + Math.random() * 3
  }));

  p.setup = () => {
    const canvas = p.createCanvas(dom.overlay.clientWidth || 100, dom.overlay.clientHeight || 100);
    canvas.parent(dom.overlay);
    p.pixelDensity(1);
    p.noFill();
  };

  p.windowResized = () => {
    p.resizeCanvas(dom.overlay.clientWidth || 100, dom.overlay.clientHeight || 100);
  };

  p.draw = () => {
    p.clear();
    hudState.scanLine = (hudState.scanLine + 2.4) % p.height;
    hudState.pulse = 0.5 + 0.5 * Math.sin(p.frameCount * 0.06);
    hudState.glitch = p.noise(p.frameCount * 0.07);
    if (dom.liveClock) {
      dom.liveClock.textContent = new Date().toLocaleTimeString("ja-JP", {
        hour12: false
      });
    }

    drawBackgroundGrid(p);
    drawScanline(p);
    drawOuterFrame(p);
    drawReticle(p);
    drawEyeLocks(p);
    drawDataArcs(p);
    drawMetricBars(p);
    drawParticleRain(p, particles);
    drawGlitchStrips(p);
    drawCornerTicks(p);
  };
});

function drawOuterFrame(p) {
  p.noFill();
  p.stroke(0, 255, 255, 90);
  p.strokeWeight(2);
  p.rect(16, 16, p.width - 32, p.height - 32);
  p.stroke(0, 255, 255, 40);
  p.rect(34, 34, p.width - 68, p.height - 68);
}

function drawBackgroundGrid(p) {
  p.stroke(90, 240, 255, 28);
  p.strokeWeight(1);
  for (let x = 0; x < p.width; x += 42) {
    p.line(x, 0, x, p.height);
  }
  for (let y = 0; y < p.height; y += 42) {
    p.line(0, y, p.width, y);
  }
}

function drawScanline(p) {
  p.stroke(255, 140, 92, 140);
  p.strokeWeight(2);
  p.line(0, hudState.scanLine, p.width, hudState.scanLine);
  p.stroke(255, 140, 92, 24);
  p.strokeWeight(18);
  p.line(0, hudState.scanLine - 5, p.width, hudState.scanLine - 5);
}

function drawReticle(p) {
  p.push();
  p.translate(p.width * 0.5, p.height * 0.5);
  p.stroke(80, 245, 255, 90);
  for (let i = 0; i < 4; i += 1) {
    p.circle(0, 0, 160 + i * 76 + hudState.pulse * 8);
  }
  p.stroke(120, 255, 255, 150);
  p.line(-210, 0, 210, 0);
  p.line(0, -210, 0, 210);
  p.pop();
}

function drawDataArcs(p) {
  p.push();
  p.translate(p.width * 0.5, p.height * 0.5);
  p.noFill();
  p.strokeWeight(6);
  p.stroke(255, 146, 90, 180);
  p.arc(0, 0, 270, 270, -p.HALF_PI, -p.HALF_PI + p.TAU * hudState.metrics.fatigue);
  p.stroke(99, 244, 255, 170);
  p.arc(0, 0, 332, 332, p.PI * 0.1, p.PI * 0.1 + p.TAU * hudState.metrics.focus * 0.7);
  p.stroke(160, 255, 190, 160);
  p.arc(0, 0, 392, 392, p.PI * 0.86, p.PI * 0.86 + p.TAU * hudState.sync * 0.5);
  p.pop();
}

function drawEyeLocks(p) {
  if (!hudState.eyeCenters.length) {
    return;
  }

  for (const eye of hudState.eyeCenters) {
    p.push();
    p.translate(eye.x, eye.y);
    p.stroke(110, 255, 255, 220);
    p.strokeWeight(1.4);
    p.circle(0, 0, 52 + hudState.pulse * 6);
    p.circle(0, 0, 76 + hudState.pulse * 10);

    p.stroke(255, 141, 84, 190);
    p.arc(0, 0, 96, 96, p.frameCount * 0.04, p.frameCount * 0.04 + p.PI * 0.8);
    p.arc(0, 0, 118, 118, -p.frameCount * 0.05, -p.frameCount * 0.05 + p.PI * 0.55);

    p.line(-46, 0, -18, 0);
    p.line(18, 0, 46, 0);
    p.line(0, -46, 0, -18);
    p.line(0, 18, 0, 46);
    p.pop();
  }
}

function drawMetricBars(p) {
  const metrics = [
    ["FATIGUE", hudState.metrics.fatigue, [255, 145, 88]],
    ["DRY EYE", hudState.metrics.dryEye, [255, 185, 110]],
    ["FOCUS", hudState.metrics.focus, [102, 255, 230]],
    ["RECOVERY", hudState.metrics.recovery, [125, 255, 176]]
  ];

  let y = p.height - 140;
  for (const [label, value, rgb] of metrics) {
    p.noStroke();
    p.fill(5, 20, 28, 190);
    p.rect(26, y, 170, 16);
    p.fill(rgb[0], rgb[1], rgb[2], 230);
    p.rect(26, y, 170 * value, 16);
    p.fill(180, 245, 255, 220);
    p.textSize(11);
    p.text(label, 26, y - 6);
    y += 30;
  }
}

function drawCornerTicks(p) {
  const pad = 24;
  const len = 110;
  p.stroke(120, 255, 255, 160);
  p.strokeWeight(1.4);
  p.line(pad, pad + len, pad, pad);
  p.line(pad, pad, pad + len, pad);
  p.line(p.width - pad - len, pad, p.width - pad, pad);
  p.line(p.width - pad, pad, p.width - pad, pad + len);
  p.line(pad, p.height - pad - len, pad, p.height - pad);
  p.line(pad, p.height - pad, pad + len, p.height - pad);
  p.line(p.width - pad - len, p.height - pad, p.width - pad, p.height - pad);
  p.line(p.width - pad, p.height - pad - len, p.width - pad, p.height - pad);
}

function drawParticleRain(p, particles) {
  p.strokeWeight(1.4);
  for (const particle of particles) {
    particle.y += particle.speed;
    if (particle.y > 1.08) {
      particle.y = -0.08;
      particle.x = Math.random();
    }
    const x = particle.x * p.width;
    const y = particle.y * p.height;
    p.stroke(90, 255, 255, 70);
    p.line(x, y, x, y + 14 * particle.size);
  }
}

function drawGlitchStrips(p) {
  if (hudState.glitch < 0.78) {
    return;
  }

  for (let i = 0; i < 4; i += 1) {
    const y = p.random(p.height);
    const h = p.random(8, 24);
    p.noStroke();
    p.fill(255, 154, 92, 18);
    p.rect(0, y, p.width, h);
    p.fill(99, 244, 255, 20);
    p.rect(p.random(-20, 20), y + 1, p.width, h * 0.35);
  }
}
