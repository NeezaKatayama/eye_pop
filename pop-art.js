const snapshotKey = "eye-health-hud-snapshot";

const artDom = {
  mount: document.getElementById("artCanvasMount"),
  signalList: document.getElementById("artSignalList"),
  readingList: document.getElementById("artReadingList"),
  saveButton: document.getElementById("saveArtButton")
};

const eyeData = loadSnapshot();
const artProfile = buildArtProfile(eyeData);
let artCanvasElement = null;

renderPanels();
mountArt();
bindSaveAction();

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
  const blinkRate = Math.max(6, data.blinkRate || 14);
  const irisDrift = data.irisDrift || 0;

  return {
    focus,
    fatigue,
    dryEye,
    recovery,
    sync,
    perclos,
    blinkRate,
    irisDrift,
    gridCount: Math.round(7 + sync * 4),
    layerMin: Math.round(2 + focus * 2),
    layerMax: Math.round(5 + recovery * 3 + focus * 2),
    spin: 0.35 + fatigue * 1.2,
    swell: 0.45 + dryEye * 1.5,
    lineMin: 0.05 + perclos * 0.08,
    lineMax: 0.2 + recovery * 0.18,
    drift: 0.6 + Math.abs(irisDrift) * 18,
    paletteBias: focus > fatigue ? "cool" : fatigue > dryEye ? "warm" : "mixed",
    title:
      focus > 0.72
        ? "Focus Orbit Bloom"
        : fatigue > 0.62
          ? "Drowsy Arc Parade"
          : dryEye > 0.56
            ? "Fractured Blink Garden"
            : "Signal Circle Field"
  };
}

function renderPanels() {
  const signals = [
    "Source: saved eye snapshot",
    `Grid count: ${artProfile.gridCount} x ${artProfile.gridCount}`,
    `Arc layers: ${artProfile.layerMin}-${artProfile.layerMax}`,
    `Spin factor: ${artProfile.spin.toFixed(2)}`,
    `Swell factor: ${artProfile.swell.toFixed(2)}`,
    `Palette bias: ${artProfile.paletteBias}`
  ];

  const readings = [
    `Artwork title: ${artProfile.title}`,
    "Focus は青系と白の比率、層の整い方に反映されます。",
    "Fatigue は回転速度と赤・橙の存在感に反映されます。",
    "Dry eye は円弧の伸び縮みと切れ方の激しさに反映されます。",
    "Recovery は太い明るい弧の増え方に反映されます。",
    "Iris drift は全体のゆらぎと配置のわずかな偏位に反映されます。"
  ];

  artDom.signalList.innerHTML = signals.map((text, index) => `<div class="forecast-row ${index === 0 ? "emphasis" : ""}">${text}</div>`).join("");
  artDom.readingList.innerHTML = readings.map((text, index) => `<div class="forecast-row ${index === 0 ? "emphasis" : ""}">${text}</div>`).join("");
}

function mountArt() {
  new p5((p) => {
    let arcUnits = [];
    const palette = buildPalette();

    p.setup = () => {
      const canvas = p.createCanvas(artDom.mount.clientWidth || 920, 860);
      canvas.parent(artDom.mount);
      artCanvasElement = canvas.elt;
      p.pixelDensity(1);
      p.angleMode(p.DEGREES);
      p.strokeCap(p.SQUARE);
      buildScene();
    };

    p.windowResized = () => {
      p.resizeCanvas(artDom.mount.clientWidth || 920, 860);
      buildScene();
    };

    p.draw = () => {
      p.background(247, 245, 239);
      for (const arcUnit of arcUnits) {
        arcUnit.show();
        arcUnit.move();
      }
      drawCaption(p);
    };

    function buildScene() {
      p.randomSeed(100 + artProfile.gridCount * 17);
      arcUnits = [];
      const count = artProfile.gridCount;
      const panelSize = Math.min(p.width, p.height) * 0.8;
      const gap = panelSize / (count + 1.6);
      const offsetX = (p.width - gap * (count - 1)) * 0.5;
      const offsetY = (p.height - gap * (count - 1)) * 0.4;

      for (let i = 0; i < count; i += 1) {
        for (let j = 0; j < count; j += 1) {
          if ((i + j) % 2 !== 0) {
            continue;
          }

          const x = offsetX + i * gap;
          const y = offsetY + j * gap;
          const layers = p.floor(p.random(artProfile.layerMin, artProfile.layerMax + 1));
          for (let n = 0; n < layers; n += 1) {
            arcUnits.push(new ArcUnit(p, x, y, gap * p.random(0.42, 0.68), palette));
          }
        }
      }
    }

    function buildPalette() {
      const cool = ["#329fe3", "#154296", "#16e0bd", "#ffffff"];
      const warm = ["#ffd630", "#c4071d", "#ff9f1c", "#98ce00"];
      if (artProfile.paletteBias === "cool") {
        return [...cool, ...cool, ...warm];
      }
      if (artProfile.paletteBias === "warm") {
        return [...warm, ...warm, ...cool];
      }
      return [...warm, ...cool];
    }

    class ArcUnit {
      constructor(sketch, x, y, diameter, colors) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.d = diameter;
        this.d0 = diameter;
        this.rot = sketch.random(360);
        this.arcAngle = 0;
        this.t = sketch.random(10000);
        this.tStr1 = sketch.random(0.35, 1.4) + artProfile.spin * 0.35;
        this.tStr2 = sketch.random(0.35, 1.5) + artProfile.swell * 0.25;
        this.sw = sketch.random(this.d0 * artProfile.lineMin, this.d0 * artProfile.lineMax);
        this.col = sketch.color(sketch.random(colors));
        this.col.setAlpha(sketch.random(180, 255));
        this.orbit = sketch.random(0.4, 1.8) * artProfile.drift;
        this.phase = sketch.random(360);
      }

      show() {
        p.noFill();
        p.strokeWeight(this.sw);
        p.stroke(this.col);
        p.push();
        p.translate(this.x, this.y);
        p.rotate(this.rot);
        drawArcShape(0, 0, this.d, this.arcAngle);
        p.pop();
      }

      move() {
        this.arcAngle = p.sin(this.t * this.tStr1) * (220 + artProfile.focus * 120);
        this.d = p.map(
          p.sin(this.t * this.tStr2),
          -1,
          1,
          this.sw,
          this.d0 * (1 + artProfile.dryEye * 0.38)
        );
        this.rot += 0.12 + artProfile.spin * 0.28;
        this.x = this.baseX + p.cos(this.t * 0.8 + this.phase) * this.orbit * 0.32;
        this.y = this.baseY + p.sin(this.t * 0.7 + this.phase) * this.orbit * 0.32;
        this.t += 0.7 + artProfile.fatigue * 0.9;
      }
    }

    function drawArcShape(x, y, diameter, angle) {
      const r = diameter * 0.5;
      p.beginShape();
      if (angle > 0) {
        for (let i = 0; i < angle; i += 1) {
          p.vertex(x + r * p.cos(i), y + r * p.sin(i));
        }
      } else {
        for (let i = 0; i > angle; i -= 1) {
          p.vertex(x + r * p.cos(i), y + r * p.sin(i));
        }
      }
      p.endShape();
    }
  });
}

function bindSaveAction() {
  if (!artDom.saveButton) {
    return;
  }

  artDom.saveButton.addEventListener("click", () => {
    if (!artCanvasElement) {
      return;
    }

    const link = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.download = `pop-media-art-${stamp}.png`;
    link.href = artCanvasElement.toDataURL("image/png");
    link.click();
  });
}

function drawCaption(p) {
  return;
}
