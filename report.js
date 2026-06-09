const snapshotKey = "eye-health-hud-snapshot";

const reportDom = {
  grid: document.getElementById("reportGrid"),
  indicatorList: document.getElementById("indicatorList"),
  advisoryList: document.getElementById("advisoryList"),
  fortuneStream: document.getElementById("fortuneStream"),
  horoscopeList: document.getElementById("horoscopeList"),
  heroHeadline: document.getElementById("heroHeadline"),
  heroSummary: document.getElementById("heroSummary"),
  capturedAtChip: document.getElementById("capturedAtChip"),
  hudMount: document.getElementById("reportHud"),
  reportClock: document.getElementById("reportClock"),
  fortuneMode: document.getElementById("fortuneMode"),
  auraTierValue: document.getElementById("auraTierValue"),
  destinyPulseValue: document.getElementById("destinyPulseValue"),
  cosmicWarningValue: document.getElementById("cosmicWarningValue")
};

const snapshot = loadSnapshot();
const reportItems = buildReport(snapshot);
const fortuneProfile = buildFortuneProfile(snapshot);

renderReport();
mountHud();

function loadSnapshot() {
  try {
    const raw = localStorage.getItem(snapshotKey);
    if (!raw) {
      return {
        capturedAt: null,
        fatigue: 0.36,
        dryEye: 0.41,
        focus: 0.58,
        recovery: 0.52,
        sync: 0.62,
        blinkRate: 16,
        perclos: 0.14,
        averageBlinkMs: 210,
        partialBlinkRatio: 0.18,
        irisDrift: 0.032,
        pulse: 0.55
      };
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn("snapshot load failed", error);
    return {
      capturedAt: null,
      fatigue: 0.4,
      dryEye: 0.4,
      focus: 0.55,
      recovery: 0.5,
      sync: 0.6,
      blinkRate: 15,
      perclos: 0.16,
      averageBlinkMs: 225,
      partialBlinkRatio: 0.2,
      irisDrift: 0.038,
      pulse: 0.5
    };
  }
}

function buildReport(data) {
  const fatigue = Math.round((data.fatigue || 0) * 100);
  const dryEye = Math.round((data.dryEye || 0) * 100);
  const focus = Math.round((data.focus || 0) * 100);
  const recovery = Math.round((data.recovery || 0) * 100);
  const sync = Math.round((data.sync || 0) * 100);
  const perclos = Math.round((data.perclos || 0) * 100);

  return [
    item("Neural Fatigue Drift", fatigue, fatigue > 65 ? "elevated" : "moderate", "眼瞼閉鎖時間からの模擬推定"),
    item("Tear Film Stability", 100 - dryEye, dryEye > 55 ? "fragile" : "stable", "瞬き不足と部分瞬きからの演出値"),
    item("Visual Recovery Reserve", recovery, recovery > 60 ? "buffered" : "reduced", "視線安定性と疲労から生成"),
    item("Cognitive Focus Coherence", focus, focus > 65 ? "locked" : "drifting", "虹彩ドリフトの模擬評価"),
    item("Ocular Symmetry Sync", sync, sync > 70 ? "balanced" : "uneven", "左右眼の開閉バランス"),
    item("Circadian Drag Index", clampPercent(fatigue + perclos * 0.3), fatigue > 60 ? "late-phase" : "nominal", "眠気寄りの演出パラメータ"),
    item("Desk Burnout Vector", clampPercent((fatigue + dryEye) * 0.58), dryEye > 60 ? "rising" : "contained", "画面負荷の複合スコア"),
    item("Retinal Load Projection", clampPercent((100 - focus) * 0.62 + dryEye * 0.18), focus < 45 ? "heavy" : "light", "フォーカス低下ベース"),
    item("Hydration Suggestion Flux", clampPercent(dryEye * 0.9), dryEye > 58 ? "prompt" : "passive", "ドライアイ寄りの補助値"),
    item("Micropause Deficit", clampPercent((100 - recovery) * 0.72), recovery < 45 ? "high" : "manageable", "休憩不足の演出用指標"),
    item("Attention Scatter Field", clampPercent((100 - focus) * 0.85), focus < 50 ? "wide" : "tight", "視線散乱の模擬値"),
    item("Sleep Debt Echo", clampPercent(perclos * 1.9), perclos > 20 ? "echoing" : "minimal", "PERCLOS 派生の演出項目"),
    item("Screen Overexposure Flag", clampPercent(dryEye * 0.66 + fatigue * 0.24), dryEye > 52 ? "watch" : "low", "画面暴露の参考表示"),
    item("Autonomic Calm Estimate", clampPercent(recovery * 0.7 + focus * 0.2), recovery > 55 ? "steady" : "strained", "リカバリー重視の模擬項目"),
    item("Mental Throughput Forecast", clampPercent(focus * 0.74 + recovery * 0.16), focus > 68 ? "high" : "variable", "集中持続の演出値"),
    item("Executive Bandwidth", clampPercent(focus * 0.5 + (100 - fatigue) * 0.3), fatigue > 65 ? "compressed" : "open", "負荷と集中の複合値")
  ];
}

function item(title, value, state, note) {
  return { title, value: Math.round(value), state, note };
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function renderReport() {
  reportDom.heroHeadline.textContent =
    snapshot.fatigue > 0.65
      ? "Your neon aura is overheating in spectacular fashion"
      : snapshot.focus > 0.65
        ? "Your optic field has entered a rare focus constellation"
        : "Your bio-signal haze suggests a balanced cyber-mood";

  reportDom.heroSummary.textContent =
    "この画面は直前の観測値を元にした、サイバーパンク演出つきの模擬ヘルス占いです。すべて entertainment 用の synthetic projection であり、診断結果ではありません。";

  reportDom.capturedAtChip.textContent = snapshot.capturedAt
    ? `CAPTURED ${new Date(snapshot.capturedAt).toLocaleTimeString("ja-JP", { hour12: false })}`
    : "DEMO SNAPSHOT";
  reportDom.auraTierValue.textContent = fortuneProfile.auraTier;
  reportDom.destinyPulseValue.textContent = `${fortuneProfile.destinyPulse}%`;
  reportDom.cosmicWarningValue.textContent = fortuneProfile.cosmicWarning;
  reportDom.fortuneMode.textContent = `MODE / ${fortuneProfile.mode}`;

  reportDom.grid.innerHTML = reportItems
    .map(
      (entry) => `
        <article class="report-card">
          <div class="report-card-head">
            <span class="report-card-title">${entry.title}</span>
            <span class="report-card-state">${entry.state}</span>
          </div>
          <div class="report-card-value">${entry.value}%</div>
          <p class="report-card-note">${entry.note}</p>
        </article>
      `
    )
    .join("");

  const indicators = [
    `Blink rate snapshot: ${Math.round(snapshot.blinkRate || 0)} /min`,
    `PERCLOS projection: ${Math.round((snapshot.perclos || 0) * 100)}%`,
    `Average blink duration: ${Math.round(snapshot.averageBlinkMs || 0)} ms`,
    `Partial blink presence: ${Math.round((snapshot.partialBlinkRatio || 0) * 100)}%`,
    `Iris drift index: ${(snapshot.irisDrift || 0).toFixed(3)}`,
    `Ocular sync estimate: ${Math.round((snapshot.sync || 0) * 100)}%`
  ];

  const advisories = [
    "SIMULATED: visual reset window within 12 minutes",
    "SIMULATED: hydration prompt recommended if dry-eye tendency rises",
    "SIMULATED: deep focus window remains viable for short bursts",
    "SIMULATED: microsleep risk monitor should remain passive unless fatigue spikes",
    "SIMULATED: maintain frontal lighting for cleaner signal lock",
    "SIMULATED: repeated scans improve display stability, not medical certainty"
  ];

  const fortuneLines = [
    `ENTERTAINMENT: 今日のオーラ層は ${fortuneProfile.auraTier}`,
    `ENTERTAINMENT: 未来12時間の集中運は ${fortuneProfile.focusLuck}`,
    `ENTERTAINMENT: あなたのサイバー気力属性は ${fortuneProfile.energyAnimal}`,
    `ENTERTAINMENT: 深夜作業との相性は ${fortuneProfile.nightAffinity}`,
    `ENTERTAINMENT: 目薬を差したくなる確率は ${fortuneProfile.eyeDropChance}%`,
    `ENTERTAINMENT: 明日のデスク戦闘力は ${fortuneProfile.deskPower}%`
  ];

  const horoscopeLines = [
    `HOROSCOPE: ${fortuneProfile.prediction}`,
    `HOROSCOPE: ラッキーカラーは ${fortuneProfile.luckyColor}`,
    `HOROSCOPE: ラッキー休憩法は ${fortuneProfile.luckyBreak}`,
    `HOROSCOPE: 今日は ${fortuneProfile.moodForecast}`,
    `HOROSCOPE: 集中が切れたら ${fortuneProfile.rebootRitual} を実行`,
    `HOROSCOPE: あなたの視線星座は ${fortuneProfile.gazeConstellation}`
  ];

  reportDom.indicatorList.innerHTML = indicators.map((text) => `<div class="forecast-row">${text}</div>`).join("");
  reportDom.advisoryList.innerHTML = advisories.map((text) => `<div class="forecast-row">${text}</div>`).join("");
  reportDom.fortuneStream.innerHTML = fortuneLines.map((text, index) => `<div class="forecast-row ${index < 2 ? "emphasis" : ""}">${text}</div>`).join("");
  reportDom.horoscopeList.innerHTML = horoscopeLines.map((text, index) => `<div class="forecast-row ${index === 0 ? "emphasis" : ""}">${text}</div>`).join("");
}

function buildFortuneProfile(data) {
  const fatigue = Math.round((data.fatigue || 0) * 100);
  const dryEye = Math.round((data.dryEye || 0) * 100);
  const focus = Math.round((data.focus || 0) * 100);
  const recovery = Math.round((data.recovery || 0) * 100);
  const sync = Math.round((data.sync || 0) * 100);
  const index = (fatigue + dryEye + focus + recovery + sync) % 5;

  const auraTiers = ["NEON MIST", "SOLAR STATIC", "GLASS COMET", "VOID BLOSSOM", "LASER LOTUS"];
  const modes = ["AURA DIVINATION", "DREAM SCAN", "FOCUS PROPHECY", "CIRCADIAN ORACLE", "RETINA RITUAL"];
  const animals = ["Pixel Fox", "Chrome Owl", "Plasma Cat", "Quantum Whale", "Neon Wolf"];
  const affinities = ["危険なほど高い", "妙に高い", "そこそこ良い", "少し不安定", "完全に夜型の気配"];
  const colors = ["electric cyan", "burnt amber", "acid mint", "laser coral", "moonlit silver"];
  const breaks = ["20秒だけ遠くを見る", "水をひと口飲む", "ゆっくり完全瞬きを3回", "肩を一度だけ回す", "窓の外を10秒スキャン"];
  const moods = ["静かな勝ち運がある", "妙に締切に強い", "夕方に覚醒しやすい", "午後に物欲が増える", "なぜかコードが光って見える"];
  const rituals = ["視線を左上に逃がす", "背筋を起動する", "デスクに触れて再同期する", "深呼吸してHUDをリセットする", "ゆっくり瞬いてチャージする"];
  const constellations = ["Blink Draco", "Retina Lyra", "Ocular Phoenix", "Sleep Echo Orion", "Neon Hydrae"];
  const predictions = [
    "今夜のあなたは『5分休憩しただけで世界を救える気になる』運勢です。",
    "次に飲む飲み物で集中モードが切り替わる暗示があります。",
    "午後に一度だけ、異様に作業が進む黄金の15分が訪れます。",
    "今日は『少し休むと全部うまくいく』タイプの未来線が強いです。",
    "目を労わるほど、なぜか発想がSF寄りになる日です。"
  ];

  return {
    auraTier: auraTiers[index],
    destinyPulse: clampPercent(Math.round(focus * 0.42 + recovery * 0.26 + (100 - fatigue) * 0.18 + sync * 0.14)),
    cosmicWarning: fatigue > 68 ? "EMBER STORM" : dryEye > 58 ? "DRY COMET" : focus > 70 ? "CLEAR SKY" : "SOFT STATIC",
    mode: modes[index],
    focusLuck: focus > 70 ? "伝説級" : focus > 55 ? "高め" : "揺らぎあり",
    energyAnimal: animals[index],
    nightAffinity: affinities[(index + 2) % affinities.length],
    eyeDropChance: clampPercent(Math.round(dryEye * 0.88)),
    deskPower: clampPercent(Math.round((focus + recovery + sync) / 3)),
    prediction: predictions[index],
    luckyColor: colors[index],
    luckyBreak: breaks[index],
    moodForecast: moods[index],
    rebootRitual: rituals[index],
    gazeConstellation: constellations[index]
  };
}

function mountHud() {
  new p5((p) => {
    const isPop = document.body.classList.contains("pop-body");
    const palette = isPop
      ? {
          grid: [0, 0, 0, 34],
          fatigue: [222, 61, 74, 185],
          recovery: [123, 199, 189, 170],
          sync: [232, 170, 69, 180],
          ticks: [0, 0, 0, 120],
          cross: [0, 0, 0, 130],
          core: [93, 149, 173, 165],
          orbitDot: [93, 149, 173, 175],
          shard: [232, 170, 69, 105],
          sweep: [222, 61, 74, 34],
          band: [93, 149, 173, 20],
          title: [0, 0, 0, 210],
          subtitle: [222, 61, 74, 190]
        }
      : {
          grid: [90, 245, 255, 65],
          fatigue: [255, 148, 94, 160],
          recovery: [130, 255, 220, 150],
          sync: [255, 205, 105, 160],
          ticks: [92, 244, 255, 180],
          cross: [99, 244, 255, 190],
          core: [255, 154, 92, 140],
          orbitDot: [99, 244, 255, 150],
          shard: [255, 154, 92, 70],
          sweep: [255, 154, 92, 30],
          band: [99, 244, 255, 14],
          title: [180, 245, 255, 220],
          subtitle: [255, 208, 132, 220]
        };
    const orbitDots = Array.from({ length: 84 }, (_, index) => ({
      angle: (Math.PI * 2 * index) / 84,
      radius: 110 + (index % 4) * 28
    }));
    const shards = Array.from({ length: 18 }, () => ({
      offset: Math.random() * Math.PI * 2,
      radius: 180 + Math.random() * 90,
      speed: 0.003 + Math.random() * 0.012,
      size: 8 + Math.random() * 14
    }));

    p.setup = () => {
      const canvas = p.createCanvas(reportDom.hudMount.clientWidth || 300, 360);
      canvas.parent(reportDom.hudMount);
      p.pixelDensity(1);
    };

    p.windowResized = () => {
      p.resizeCanvas(reportDom.hudMount.clientWidth || 300, 360);
    };

    p.draw = () => {
      p.clear();
      if (reportDom.reportClock) {
        reportDom.reportClock.textContent = new Date().toLocaleTimeString("ja-JP", { hour12: false });
      }
      p.translate(p.width / 2, p.height / 2);

      p.noFill();
      p.stroke(...palette.grid);
      p.strokeWeight(1);
      for (let i = 0; i < 8; i += 1) {
        p.circle(0, 0, 112 + i * 34);
      }

      p.stroke(...palette.fatigue);
      p.strokeWeight(6);
      p.arc(0, 0, 180, 180, -p.HALF_PI, -p.HALF_PI + p.TAU * (snapshot.fatigue || 0.4));

      p.stroke(...palette.recovery);
      p.arc(0, 0, 236, 236, p.PI * 0.15, p.PI * 0.15 + p.TAU * (snapshot.recovery || 0.5) * 0.7);

      p.stroke(...palette.sync);
      p.arc(0, 0, 306, 306, p.PI * 1.08, p.PI * 1.08 + p.TAU * (snapshot.sync || 0.5) * 0.55);

      p.stroke(...palette.ticks);
      p.strokeWeight(2);
      for (let a = 0; a < 360; a += 18) {
        const r1 = 164;
        const r2 = a % 36 === 0 ? 228 : 206;
        p.line(Math.cos(p.radians(a)) * r1, Math.sin(p.radians(a)) * r1, Math.cos(p.radians(a)) * r2, Math.sin(p.radians(a)) * r2);
      }

      p.stroke(...palette.cross);
      p.line(-180, 0, 180, 0);
      p.line(0, -180, 0, 180);
      p.line(-128, -128, 128, 128);
      p.line(-128, 128, 128, -128);

      p.noFill();
      p.stroke(...palette.core);
      p.strokeWeight(3);
      p.arc(0, 0, 94, 94, p.frameCount * 0.03, p.frameCount * 0.03 + p.PI * 0.9);
      p.arc(0, 0, 124, 124, -p.frameCount * 0.024, -p.frameCount * 0.024 + p.PI * 0.72);

      p.noStroke();
      for (const dot of orbitDots) {
        const angle = dot.angle + p.frameCount * 0.01 * ((dot.radius % 2) ? 1 : -1);
        p.fill(...palette.orbitDot);
        p.circle(Math.cos(angle) * dot.radius, Math.sin(angle) * dot.radius, 3.4);
      }

      for (const shard of shards) {
        const angle = shard.offset + p.frameCount * shard.speed;
        const x = Math.cos(angle) * shard.radius;
        const y = Math.sin(angle) * shard.radius;
        p.push();
        p.translate(x, y);
        p.rotate(angle);
        p.fill(...palette.shard);
        p.rect(-shard.size * 0.5, -2, shard.size, 4);
        p.pop();
      }

      if (p.frameCount % 80 < 26) {
        p.fill(...palette.sweep);
        p.rect(-p.width / 2, -10, p.width, 20);
      }

      if (p.frameCount % 120 < 40) {
        p.fill(...palette.band);
        p.rect(-p.width / 2, -p.height / 2 + 40, p.width, 18);
        p.rect(-p.width / 2, p.height / 2 - 58, p.width, 14);
      }

      p.fill(...palette.title);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(16);
      p.text(fortuneProfile.auraTier, 0, -8);
      p.textSize(10);
      p.fill(...palette.subtitle);
      p.text("ENTERTAINMENT HEALTH ORACLE", 0, 16);
    };
  });
}
