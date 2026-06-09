const snapshotKey = "eye-health-hud-snapshot";

const artDom = {
  mount: document.getElementById("artCanvasMount"),
  signalList: document.getElementById("artSignalList"),
  readingList: document.getElementById("artReadingList")
};

const eyeData = loadSnapshot();
let artProfile = buildArtProfile(eyeData);

renderPanels();
mountArt();

function loadSnapshot() {
  try {
    const raw = localStorage.getItem(snapshotKey);
    if (!raw) {
      return fallbackSnapshot();
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn("snapshot load failed", error);
    return fallbackSnapshot();
  }
}

function fallbackSnapshot() {
  return {
    fatigue: 0.42,
    dryEye: 0.34,
    focus: 0.61,
    recovery: 0.54,
    sync: 0.68,
    blinkRate: 16,
    perclos: 0.14,
    averageBlinkMs: 214,
    partialBlinkRatio: 0.18,
    irisDrift: 0.03
  };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value || 0));
}

function buildArtProfile(data) {
  const focus = clamp01(data.focus);
  const fatigue = clamp01(data.fatigue);
  const dryEye = clamp01(data.dryEye);
  const recovery = clamp01(data.recovery);
  const sync = clamp01(data.sync);
  const perclos = clamp01(data.perclos);
  const partialBlinkRatio = clamp01(data.partialBlinkRatio);
  const averageBlinkMs = Math.max(90, data.averageBlinkMs || 180);
  const blinkRate = Math.max(4, data.blinkRate || 14);
  const irisDrift = Math.max(-0.35, Math.min(0.35, data.irisDrift || 0));

  return {
    focus,
    fatigue,
    dryEye,
    recovery,
    sync,
    perclos,
    partialBlinkRatio,
    averageBlinkMs,
    blinkRate,
    irisDrift,
    coreRings: Math.round(5 + focus * 10),
    beamCount: Math.round(14 + focus * 26),
    fractureCount: Math.round(10 + dryEye * 34),
    fractureJitter: 18 + dryEye * 70,
    latticeRows: Math.round(4 + sync * 7),
    latticeCols: Math.round(5 + sync * 9),
    driftOffset: 26 + Math.abs(irisDrift) * 680,
    veilHeight: 42 + perclos * 210,
    veilSpeed: 0.3 + fatigue * 1.8,
    pulseDepth: 8 + fatigue * 32,
    pulseSpeed: 0.7 + blinkRate * 0.032,
    orbitLayers: Math.round(3 + recovery * 5),
    threadCount: Math.round(28 + recovery * 56),
    nodeSize: 2 + sync * 5 + recovery * 2,
    lineWeight: 0.85 + focus * 1.45 + recovery * 0.9,
    grainAlpha: 10 + partialBlinkRatio * 36,
    title:
      focus > 0.78
        ? "Spectral Lock Engine"
        : dryEye > 0.58
          ? "Fracture Blink Cathedral"
          : fatigue > 0.62
            ? "Nocturne Sweep Array"
            : "Ocular Signal Monolith"
  };
}

function renderPanels() {
  const signals = [
    "Source: saved eye snapshot",
    `Focus core rings: ${artProfile.coreRings}`,
    `Fatigue veil height: ${artProfile.veilHeight.toFixed(0)} px`,
    `Dry-eye fractures: ${artProfile.fractureCount}`,
    `Sync lattice: ${artProfile.latticeCols} x ${artProfile.latticeRows}`,
    `Drift offset: ${artProfile.driftOffset.toFixed(0)} px`
  ];

  const readings = [
    `Artwork title: ${artProfile.title}`,
    "Focus は中心核のリング密度と照準ビーム本数になります。",
    "Fatigue と PERCLOS は上下シャッターの閉じ方と走査速度になります。",
    "Dry eye は外周の破断リングとノイズの荒れ方になります。",
    "Sync は左右対称グリッドの精度と接続の安定感になります。",
    "Iris drift は作品全体の重心とドリフト軸の偏位になります。"
  ];

  artDom.signalList.innerHTML = signals
    .map((text, index) => `<div class="forecast-row ${index === 0 ? "emphasis" : ""}">${text}</div>`)
    .join("");
  artDom.readingList.innerHTML = readings
    .map((text, index) => `<div class="forecast-row ${index === 0 ? "emphasis" : ""}">${text}</div>`)
    .join("");
}

function mountArt() {
  new p5((p) => {
    let particles = [];
    let anchors = [];
    let filaments = [];
    let seed = Math.random() * 1000;

    p.setup = () => {
      const canvas = p.createCanvas(artDom.mount.clientWidth || 800, 820);
      canvas.parent(artDom.mount);
      p.pixelDensity(1);
      p.angleMode(p.DEGREES);
      p.strokeCap(p.SQUARE);
      rebuildScene();
    };

    p.windowResized = () => {
      p.resizeCanvas(artDom.mount.clientWidth || 800, 820);
      rebuildScene();
    };

    p.mousePressed = () => {
      seed = Math.random() * 1000;
      rebuildScene();
    };

    p.draw = () => {
      const t = p.frameCount * 0.01;
      const driftSign = artProfile.irisDrift >= 0 ? 1 : -1;
      const cx = p.width / 2 + driftSign * artProfile.driftOffset * 0.28 + p.sin(t * 13) * artProfile.driftOffset * 0.03;
      const cy = p.height / 2 + p.cos(t * 11) * artProfile.driftOffset * 0.018;

      p.background(0);
      drawBackdrop(p, t);
      drawVeils(p, t);
      drawDriftAxis(p, t, cx, cy, driftSign);
      drawOrbitThreads(p, t, cx, cy);
      drawCoreEngine(p, t, cx, cy);
      drawFractureHalo(p, t, cx, cy);
      drawLattice(p, t, cx, cy);
      drawFilaments(p, t, cx, cy);
      drawParticleRain(p, t, cx, cy);
      drawScanningReticle(p, t, cx, cy);
      drawFrame(p, t);
      drawFooterLabel(p);
    };

    function rebuildScene() {
      p.randomSeed(seed);
      p.noiseSeed(seed);

      anchors = [];
      const rowSpan = p.height * 0.42;
      const colSpan = p.width * 0.34;

      for (let row = 0; row < artProfile.latticeRows; row += 1) {
        for (let col = 0; col < artProfile.latticeCols; col += 1) {
          const x = p.map(col, 0, Math.max(1, artProfile.latticeCols - 1), -colSpan, colSpan);
          const y = p.map(row, 0, Math.max(1, artProfile.latticeRows - 1), -rowSpan, rowSpan);
          const jitter = (1 - artProfile.sync) * 26;
          anchors.push({
            x: x + p.random(-jitter, jitter),
            y: y + p.random(-jitter, jitter),
            size: artProfile.nodeSize + p.random(-1.2, 2.2),
            phase: p.random(360),
            alpha: p.random(70, 180)
          });
        }
      }

      filaments = Array.from({ length: artProfile.threadCount }, () => ({
        a: p.floor(p.random(anchors.length)),
        b: p.floor(p.random(anchors.length)),
        bend: p.random(-90, 90),
        alpha: p.random(16, 62),
        speed: p.random(0.4, 1.3)
      })).filter((item) => item.a !== item.b);

      particles = Array.from({ length: 120 + artProfile.threadCount }, () => ({
        x: p.random(p.width),
        y: p.random(p.height),
        vx: p.random(-0.5, 0.5),
        vy: p.random(0.4, 1.8),
        alpha: p.random(18, 90),
        size: p.random(0.8, 2.8),
        phase: p.random(360)
      }));
    }
  });
}

function drawBackdrop(p, t) {
  p.strokeWeight(1);
  for (let x = 0; x < p.width; x += 42) {
    const alpha = 8 + ((x / 42) % 3) * 3;
    p.stroke(255, alpha);
    p.line(x, 0, x, p.height);
  }
  for (let y = 0; y < p.height; y += 42) {
    p.stroke(255, 7);
    p.line(0, y, p.width, y);
  }

  for (let y = 0; y < p.height; y += 3) {
    p.stroke(255, 2 + p.noise(y * 0.02, t * 0.6) * artProfile.grainAlpha);
    p.line(0, y, p.width, y);
  }
}

function drawVeils(p, t) {
  const veil = artProfile.veilHeight + p.sin(t * 70 * artProfile.veilSpeed) * artProfile.pulseDepth * 0.3;
  p.noStroke();

  for (let i = 0; i < 11; i += 1) {
    const alpha = 6 + i * 2;
    const thickness = veil * (1 - i * 0.06);
    p.fill(255, alpha);
    p.rect(0, 0, p.width, thickness);
    p.rect(0, p.height - thickness, p.width, thickness);
  }

  p.fill(255, 18);
  p.rect(0, veil * 0.7, p.width, 2);
  p.rect(0, p.height - veil * 0.7, p.width, 2);
}

function drawDriftAxis(p, t, cx, cy, driftSign) {
  const axisSpan = p.width * 0.42;
  const wobble = p.sin(t * 24) * artProfile.pulseDepth * 0.35;
  p.push();
  p.translate(cx, cy);
  p.rotate(driftSign * (artProfile.irisDrift * 65 + wobble * 0.08));

  p.stroke(255, 44);
  p.strokeWeight(artProfile.lineWeight);
  p.line(-axisSpan, 0, axisSpan, 0);

  p.stroke(255, 18);
  p.strokeWeight(1);
  for (let i = -8; i <= 8; i += 1) {
    const x = (axisSpan / 8) * i;
    p.line(x, -12, x, 12);
  }
  p.pop();
}

function drawOrbitThreads(p, t, cx, cy) {
  p.push();
  p.translate(cx, cy);
  p.noFill();

  for (let layer = 0; layer < artProfile.orbitLayers; layer += 1) {
    const radius = 90 + layer * 48;
    const phase = t * (18 + layer * 4) * artProfile.pulseSpeed;
    const wobble = artProfile.pulseDepth * (0.5 + layer * 0.12);
    p.stroke(255, 16 + layer * 8);
    p.strokeWeight(layer % 2 === 0 ? artProfile.lineWeight * 0.8 : 1);
    p.beginShape();
    for (let a = 0; a <= 360; a += 8) {
      const r = radius + p.sin(a * (1.4 + artProfile.dryEye) + phase) * wobble;
      p.vertex(p.cos(a) * r, p.sin(a * (0.94 + artProfile.sync * 0.22)) * r);
    }
    p.endShape();
  }
  p.pop();
}

function drawCoreEngine(p, t, cx, cy) {
  p.push();
  p.translate(cx, cy);
  p.noFill();

  for (let i = 0; i < artProfile.coreRings; i += 1) {
    const radius = 28 + i * 17;
    const alpha = 22 + i * 7;
    p.stroke(255, alpha);
    p.strokeWeight(i % 3 === 0 ? artProfile.lineWeight + 0.4 : 1);
    p.circle(0, 0, (radius + p.sin(t * 46 + i * 18) * artProfile.pulseDepth * 0.08) * 2);
  }

  for (let i = 0; i < artProfile.beamCount; i += 1) {
    const angle = (360 / artProfile.beamCount) * i + t * 14;
    const inner = 20;
    const outer = 86 + artProfile.focus * 165;
    p.stroke(255, i % 4 === 0 ? 120 : 54);
    p.strokeWeight(i % 5 === 0 ? 2.1 : 1);
    p.line(p.cos(angle) * inner, p.sin(angle) * inner, p.cos(angle) * outer, p.sin(angle) * outer);
  }

  p.stroke(255, 180);
  p.strokeWeight(2.4);
  p.arc(0, 0, 42, 42, t * 110, t * 110 + 146);
  p.arc(0, 0, 72, 72, -t * 90, -t * 90 + 100);

  p.noStroke();
  p.fill(255, 220);
  p.circle(0, 0, 8 + artProfile.recovery * 8);
  p.fill(255, 55);
  p.circle(0, 0, 24 + p.sin(t * 90) * 5);
  p.pop();
}

function drawFractureHalo(p, t, cx, cy) {
  p.push();
  p.translate(cx, cy);
  p.noFill();

  for (let i = 0; i < artProfile.fractureCount; i += 1) {
    const radius = 170 + i * 8.5;
    const start = i * (360 / artProfile.fractureCount) + t * 12 * (i % 2 === 0 ? 1 : -1);
    const span = 8 + artProfile.dryEye * 44 + (i % 4) * 4;
    const jitter = artProfile.fractureJitter * 0.12;

    p.stroke(255, 24 + (i % 6) * 14);
    p.strokeWeight(0.8 + (i % 3) * 0.55);
    p.arc(0, 0, radius * 2, radius * 2, start, start + span);

    const x1 = p.cos(start) * radius;
    const y1 = p.sin(start) * radius;
    const x2 = p.cos(start + span) * (radius + p.random(-jitter, jitter));
    const y2 = p.sin(start + span) * (radius + p.random(-jitter, jitter));
    p.line(x1, y1, x2, y2);
  }
  p.pop();
}

function drawLattice(p, t, cx, cy) {
  p.push();
  p.translate(cx, cy);

  for (const anchor of anchors) {
    const phase = t * (14 + artProfile.sync * 18) + anchor.phase;
    const x = anchor.x;
    const y = anchor.y + p.sin(phase) * (1 - artProfile.sync) * 12;
    const mirrorX = -x * (0.45 + artProfile.sync * 0.55);

    p.stroke(255, 22 + artProfile.sync * 52);
    p.strokeWeight(artProfile.lineWeight * 0.5);
    p.line(x, y, mirrorX, -y);

    p.noStroke();
    p.fill(255, anchor.alpha);
    p.circle(x, y, anchor.size);
    p.fill(255, 65);
    p.circle(mirrorX, -y, anchor.size * 0.82);
  }
  p.pop();
}

function drawFilaments(p, t, cx, cy) {
  p.push();
  p.translate(cx, cy);
  p.noFill();

  for (const filament of filaments) {
    const a = anchors[filament.a];
    const b = anchors[filament.b];
    if (!a || !b) {
      continue;
    }

    const pulse = p.sin(t * 28 * filament.speed + filament.bend);
    const mx = (a.x + b.x) * 0.5 + pulse * filament.bend * 0.25;
    const my = (a.y + b.y) * 0.5 - pulse * (14 + artProfile.pulseDepth * 0.5);

    p.stroke(255, filament.alpha);
    p.strokeWeight(0.6 + artProfile.recovery * 0.9);
    p.beginShape();
    p.vertex(a.x, a.y);
    p.quadraticVertex(mx, my, b.x, b.y);
    p.endShape();
  }
  p.pop();
}

function drawParticleRain(p, t, cx, cy) {
  p.push();
  p.translate(cx * 0.02, cy * 0.02);
  p.noStroke();

  for (const particle of particles) {
    particle.y += particle.vy + artProfile.fatigue * 0.5;
    particle.x += particle.vx + artProfile.irisDrift * 1.8;
    if (particle.y > p.height + 10) {
      particle.y = -10;
      particle.x = p.random(p.width);
    }
    if (particle.x < -10) {
      particle.x = p.width + 10;
    }
    if (particle.x > p.width + 10) {
      particle.x = -10;
    }

    const tail = 6 + artProfile.recovery * 14;
    p.fill(255, particle.alpha);
    p.rect(particle.x, particle.y, 1.2, tail);
    p.circle(
      particle.x + p.sin(t * 40 + particle.phase) * 0.8,
      particle.y + p.cos(t * 22 + particle.phase) * 0.8,
      particle.size
    );
  }
  p.pop();
}

function drawScanningReticle(p, t, cx, cy) {
  const radius = 30 + artProfile.pulseDepth * 0.8 + p.sin(t * 95) * 5;

  p.noFill();
  p.stroke(255, 185);
  p.strokeWeight(1.8);
  p.arc(cx, cy, radius * 1.2, radius * 1.2, t * 140, t * 140 + 130);
  p.arc(cx, cy, radius * 2.1, radius * 2.1, -t * 110, -t * 110 + 100);
  p.arc(cx, cy, radius * 3.2, radius * 3.2, 90 + t * 60, 160 + t * 60);

  p.stroke(255, 86);
  p.line(cx - radius * 2.4, cy, cx + radius * 2.4, cy);
  p.line(cx, cy - radius * 2.4, cx, cy + radius * 2.4);

  p.stroke(255, 42);
  p.line(cx - radius * 3.6, cy - radius * 3.6, cx + radius * 3.6, cy + radius * 3.6);
  p.line(cx + radius * 3.6, cy - radius * 3.6, cx - radius * 3.6, cy + radius * 3.6);
}

function drawFrame(p, t) {
  p.noFill();
  p.stroke(255, 65);
  p.strokeWeight(1.3);
  p.rectMode(p.CORNER);
  p.rect(22, 22, p.width - 44, p.height - 44);
  p.rect(52, 52, p.width - 104, p.height - 104);

  p.stroke(255, 150);
  p.strokeWeight(2.4);
  p.line(22, 22, 104, 22);
  p.line(22, 22, 22, 104);
  p.line(p.width - 104, 22, p.width - 22, 22);
  p.line(p.width - 22, 22, p.width - 22, 104);
  p.line(22, p.height - 22, 104, p.height - 22);
  p.line(22, p.height - 104, 22, p.height - 22);
  p.line(p.width - 104, p.height - 22, p.width - 22, p.height - 22);
  p.line(p.width - 22, p.height - 104, p.width - 22, p.height - 22);

  const sweepY = 98 + ((t * artProfile.veilSpeed * 140) % (p.height - 196));
  p.stroke(255, 30);
  p.line(60, sweepY, p.width - 60, sweepY);
}

function drawFooterLabel(p) {
  p.noStroke();
  p.fill(255, 230);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(24);
  p.text(artProfile.title, p.width / 2, p.height - 66);
  p.textSize(11);
  p.fill(255, 155);
  p.text(
    "SAVED EYE SNAPSHOT / FOCUS CORE + FATIGUE VEIL + DRY-EYE FRACTURE + SYNC LATTICE / CLICK TO RESEED",
    p.width / 2,
    p.height - 36
  );
}
