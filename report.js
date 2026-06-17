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
  destinyPulseNote: document.getElementById("destinyPulseNote"),
  cosmicWarningValue: document.getElementById("cosmicWarningValue"),
  cosmicWarningNote: document.getElementById("cosmicWarningNote"),
  matrixModal: document.getElementById("matrixDetailModal"),
  matrixModalBackdrop: document.getElementById("matrixModalBackdrop"),
  matrixModalClose: document.getElementById("matrixModalClose"),
  matrixModalTitle: document.getElementById("matrixModalTitle"),
  matrixModalLiteral: document.getElementById("matrixModalLiteral"),
  matrixModalDescription: document.getElementById("matrixModalDescription")
};

const snapshot = loadSnapshot();
const reportItems = buildReport(snapshot);
const fortuneProfile = buildFortuneProfile(snapshot);
const matrixDetails = buildMatrixDetails();

renderReport();
mountHud();
bindMatrixDetailInteractions();

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
    item("Neural Fatigue Drift", fatigue, fatigue > 65 ? "elevated" : "moderate", "神経疲労の蓄積度", "pulse", "red"),
    item("Tear Film Stability", 100 - dryEye, dryEye > 55 ? "fragile" : "stable", "涙液層の安定性", "tear", "yellow"),
    item("Visual Recovery Reserve", recovery, recovery > 60 ? "buffered" : "reduced", "視覚回復の余力", "bloom", "mint"),
    item("Cognitive Focus Coherence", focus, focus > 65 ? "locked" : "drifting", "集中力の持続性とブレ", "focus", "blue"),
    item("Ocular Symmetry Sync", sync, sync > 70 ? "balanced" : "uneven", "左右の眼の開閉バランス", "sync", "blue"),
    item("Circadian Drag Index", clampPercent(fatigue + perclos * 0.3), fatigue > 60 ? "late-phase" : "nominal", "概日リズムの遅れ（眠気度）", "moon", "yellow"),
    item("Desk Burnout Vector", clampPercent((fatigue + dryEye) * 0.58), dryEye > 60 ? "rising" : "contained", "デスクワーク総合負荷", "burn", "red"),
    item("Retinal Load Projection", clampPercent((100 - focus) * 0.62 + dryEye * 0.18), focus < 45 ? "heavy" : "light", "網膜への蓄積負荷", "retina", "blue"),
    item("Hydration Suggestion Flux", clampPercent(dryEye * 0.9), dryEye > 58 ? "prompt" : "passive", "ドライアイ警戒度", "drop", "mint"),
    item("Micropause Deficit", clampPercent((100 - recovery) * 0.72), recovery < 45 ? "high" : "manageable", "小休止（マイクロポーズ）の不足度", "pause", "yellow"),
    item("Attention Scatter Field", clampPercent((100 - focus) * 0.85), focus < 50 ? "wide" : "tight", "視線の散らばり具合", "scatter", "red"),
    item("Sleep Debt Echo", clampPercent(perclos * 1.9), perclos > 20 ? "echoing" : "minimal", "睡眠負債の影響度", "echo", "mint"),
    item("Screen Overexposure Flag", clampPercent(dryEye * 0.66 + fatigue * 0.24), dryEye > 52 ? "watch" : "low", "画面の長時間注視フラグ", "screen", "blue"),
    item("Autonomic Calm Estimate", clampPercent(recovery * 0.7 + focus * 0.2), recovery > 55 ? "steady" : "strained", "自律神経の安定度（リラックス度）", "calm", "mint"),
    item("Mental Throughput Forecast", clampPercent(focus * 0.74 + recovery * 0.16), focus > 68 ? "high" : "variable", "処理能力・集中力の持続予測", "flow", "yellow"),
    item("Executive Bandwidth", clampPercent(focus * 0.5 + (100 - fatigue) * 0.3), fatigue > 65 ? "compressed" : "open", "脳の処理キャパシティ（認知資源）", "grid", "red")
  ];
}

function item(title, value, state, note, icon, tone) {
  return { title, value: Math.round(value), state, note, icon, tone };
}

function buildMatrixDetails() {
  return {
    "Neural Fatigue Drift": {
      literal: "神経疲労の漂流（ドリフト）",
      description:
        "「Drift（徐々にずれていくこと）」の通り、時間が経つにつれて脳や神経の疲労がジワジワと蓄積していく状態を表します。まぶたが閉じている時間（PERCLOSなど）から、脳がどれくらい「トビかけているか（居眠りに近づいているか）」を推定する指標です。"
    },
    "Tear Film Stability": {
      literal: "涙液層（るいえきそう）の安定性",
      description:
        "眼球の表面を覆う涙の膜（Tear Film）が、どれくらい安定して目を保護できているかを示します。PC作業に没頭してまばたきが減ったり、瞬きが浅く（部分瞬き）なったりすると、この安定性が下がって目が乾きやすくなります。"
    },
    "Visual Recovery Reserve": {
      literal: "視覚回復のリザーブ（蓄え・余力）",
      description:
        "目が受けたダメージや疲労から、どれくらい自力で回復できるかという「目の体力の残りHP」です。視線のフラつき（安定性）と全体の疲労度から算出され、これが減ると「目を休めないと回復が追いつかない状態」になります。"
    },
    "Cognitive Focus Coherence": {
      literal: "認知フォーカスの干渉度（一貫性）",
      description:
        "脳が目の前のタスクにどれくらい「迷いなく、深く集中できているか」を示します。「Coherence」は光などの波が綺麗に揃っている状態を意味し、これが高いとゾーンに入った状態（locked）、低いと虹彩（黒目）が微小に彷徨う散漫な状態（drifting）になります。"
    },
    "Ocular Symmetry Sync": {
      literal: "眼球の対称性シンクロ率",
      description:
        "左右の目の動きや、まぶたの開閉がどれくらい「左右対称（シンクロ）に動いているか」を評価する指標です。極度に疲れてくると、片目だけが先にトロンとしたり、左右のバランスが崩れたり（uneven）するため、疲労の偏りを見分けるのに使われます。"
    },
    "Circadian Drag Index": {
      literal: "概日（がいじつ）リズムの引きずり指数",
      description:
        "体内時計（サーカディアンリズム）による強烈な眠気の引っ張り（Drag）を測定する指標です。夕方や深夜など、時間の経過とともに「起きていようとする意志」を、眠気がどれくらい後ろに引っ張っているか（ late-phase = 睡眠相の遅れ）を表します。"
    },
    "Desk Burnout Vector": {
      literal: "デスクワーク・バーンアウト・ベクトル",
      description:
        "目の乾き（物理的負荷）と脳の疲労（精神的負荷）が掛け合わさることで、「どのくらいの勢いでデスクワークの限界（燃え尽き）に向かっているか」を示す総合的なエネルギー消耗メーターです。"
    },
    "Retinal Load Projection": {
      literal: "網膜負荷の予測・投影",
      description:
        "ディスプレイの光や、視線が定まらない状態で画面を見続けることによって、目の奥の「網膜（Retina）」にどれくらい光のストレス・負荷が蓄積しているかを予測（Projection）した数値です。フォーカスが合っていない時ほど網膜への負担が増します。"
    },
    "Hydration Suggestion Flux": {
      literal: "水分補給推奨の流動（フラックス）",
      description:
        "体内、あるいは眼球の「水分不足（ドライアイ）」を検知し、水分補給（目薬や飲水）を促すためのリアルタイムなアラート変動値です。「Flux（流動）」という名の通り、目の乾き具合に応じて「今すぐ補給すべき（prompt）」と、シグナルの強さが変動します。"
    },
    "Micropause Deficit": {
      literal: "マイクロポーズ（小休止）の不足額（赤字）",
      description:
        "作業中に数秒〜数十秒間、画面から目を離してぼーっとするような「小さな休憩（Micropause）」が、どれくらい不足（Deficit）しているかを示す指標です。これが赤字（high）になると、休憩を挟まずにぶっ続けで作業している危険なサインになります。"
    },
    "Attention Scatter Field": {
      literal: "注意力散乱フィールド",
      description:
        "集中力が切れて、視線があちコチに散らばっている（Scatter）範囲や度合いを可視化した空間的な指標です。数値が高く範囲が広がる（wide）ほど、1点に集中できず、上の空で画面を見つめているか、視線が泳いでいる状態を意味します。"
    },
    "Sleep Debt Echo": {
      literal: "睡眠負債のエコー（反響）",
      description:
        "過去の睡眠不足（睡眠負債）が、現在のパフォーマンスにどれくらい「影を落としているか（Echoとして響いているか）」を示す指標です。まぶたが閉じている時間の割合（PERCLOS）から、蓄積した寝不足のダメージを検出します。"
    },
    "Screen Overexposure Flag": {
      literal: "画面過剰暴露フラグ",
      description:
        "ディスプレイの光（ブルーライトなど）に、目がどれほど「過剰に晒されているか（Overexposure）」を警戒するためのフラグです。ドライアイと疲労の掛け合わせから、これ以上画面を見続けるのはリスクが高い（watch）と判断するために使われます。"
    },
    "Autonomic Calm Estimate": {
      literal: "自律神経の平穏度推定",
      description:
        "心身がどれくらいリラックスして落ち着いた（Calm）状態にあるかを、目の回復力（リザーブ）と集中度からシミュレートした数値です。これが低い（strained）と、交感神経が優位になりすぎて緊張・ストレス状態が続いていることを示します。"
    },
    "Mental Throughput Forecast": {
      literal: "メンタル・スループット（処理能力）予測",
      description:
        "脳が情報を処理できるペース（Throughput）が、この先どれくらい維持できそうかを予測（Forecast）したものです。集中力と回復力が高ければ「高い処理能力を維持できる（high）」、低下していれば「能率がガタガタになる（variable）」と予測されます。"
    },
    "Executive Bandwidth": {
      literal: "実行機能の帯域幅（キャパシティ）",
      description:
        "脳の司令塔である「実行機能（計画を立てる、判断する、感情をコントロールするなど）」に、あとどれくらい処理容量（Bandwidth）が残されているかを示します。疲労で脳の帯域が圧迫されると「容量不足（compressed）」になり、単純なミスが増えたり思考が停止したりします。"
    }
  };
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function renderReport() {
  reportDom.heroHeadline.textContent = "Rendering report from your latest ocular telemetry.";

  reportDom.heroSummary.textContent =
    "直前の目のシグナルをもとに、視覚化したレポートを表示しています。";

  reportDom.capturedAtChip.textContent = snapshot.capturedAt
    ? `CAPTURED ${new Date(snapshot.capturedAt).toLocaleTimeString("ja-JP", { hour12: false })}`
    : "DEMO SNAPSHOT";
  reportDom.auraTierValue.textContent =
    "Destiny Pulse は目と集中の総合スコア、Cosmic Warning はいま注目したい目のサインです。";
  reportDom.destinyPulseValue.textContent = `${fortuneProfile.destinyPulse}%`;
  reportDom.destinyPulseNote.textContent = fortuneProfile.destinyPulseNote;
  reportDom.cosmicWarningValue.textContent = fortuneProfile.cosmicWarning;
  reportDom.cosmicWarningNote.textContent = fortuneProfile.cosmicWarningNote;
  reportDom.fortuneMode.textContent = `MODE / ${fortuneProfile.mode}`;

  reportDom.grid.innerHTML = reportItems
    .map(
      (entry) => `
        ${(() => {
          const detail = matrixDetails[entry.title];
          return `
        <article
          class="report-card matrix-card"
          role="button"
          tabindex="0"
          data-matrix-title="${entry.title}"
        >
          <div class="report-card-head">
            <div class="report-card-head-left">
              <div class="report-card-icon tone-${entry.tone} icon-${entry.icon}" aria-hidden="true">
                <span class="icon-layer icon-ring"></span>
                <span class="icon-layer icon-core"></span>
                <span class="icon-layer icon-mark"></span>
              </div>
              <div>
                <span class="report-card-title">${entry.title}</span>
                <span class="report-card-kicker">${entry.note}</span>
              </div>
            </div>
            <span class="report-card-state">${entry.state}</span>
          </div>
          <div class="report-card-value">${entry.value}%</div>
          <p class="report-card-note">タップすると説明が開きます。</p>
          <div class="report-card-detail" aria-hidden="true">
            <div class="report-card-detail-block">
              <span class="report-card-detail-label">直訳</span>
              <p class="report-card-detail-text">${detail.literal}</p>
            </div>
            <div class="report-card-detail-block">
              <span class="report-card-detail-label">解説</span>
              <p class="report-card-detail-text">${detail.description}</p>
            </div>
          </div>
        </article>
      `;
        })()}
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
    "あと10分ほどで、いったん目を休める時間を入れると楽になりそうです。",
    "乾きが気になるときは、目薬や水分補給を挟むと状態が整いやすくなります。",
    "短い時間であれば、まだしっかり集中できる余力が残っています。",
    "強い眠気の兆候は目立ちませんが、疲れが増えてきたら早めの休憩がおすすめです。",
    "顔の正面からやわらかく光が当たる環境のほうが、目の状態を安定して読み取りやすくなります。",
    "何度か測定を重ねると表示は安定しますが、医療的な診断を行うものではありません。"
  ];

  const fortuneLines = [
    `ENTERTAINMENT: 今日のオーラ： ${fortuneProfile.auraTier}`,
    `ENTERTAINMENT: これから12時間の集中運： ${fortuneProfile.focusLuck}`,
    `ENTERTAINMENT: 今のあなたの属性アニマル： ${fortuneProfile.energyAnimal}`,
    `ENTERTAINMENT: 深夜作業との相性は ${fortuneProfile.nightAffinity}`,
    `ENTERTAINMENT: 目薬が恋しくなる確率： ${fortuneProfile.eyeDropChance}%`,
    `ENTERTAINMENT: 明日のデスク戦闘力は ${fortuneProfile.deskPower}%`
  ];

  const horoscopeLines = [
    `HOROSCOPE: ${fortuneProfile.prediction}`,
    `HOROSCOPE: ラッキーカラー： ${fortuneProfile.luckyColor}`,
    `HOROSCOPE: おすすめのひと休み： ${fortuneProfile.luckyBreak}`,
    `HOROSCOPE: 今日のあなた： ${fortuneProfile.moodForecast}`,
    `HOROSCOPE: 集中が切れたら： ${fortuneProfile.rebootRitual}`,
    `HOROSCOPE: あなたの視線星座： ${fortuneProfile.gazeConstellation}`
  ];

  reportDom.indicatorList.innerHTML = indicators.map((text) => `<div class="forecast-row">${text}</div>`).join("");
  reportDom.advisoryList.innerHTML = advisories.map((text) => `<div class="forecast-row">${text}</div>`).join("");
  reportDom.fortuneStream.innerHTML = fortuneLines.map((text, index) => `<div class="forecast-row ${index < 2 ? "emphasis" : ""}">${text}</div>`).join("");
  reportDom.horoscopeList.innerHTML = horoscopeLines.map((text, index) => `<div class="forecast-row ${index === 0 ? "emphasis" : ""}">${text}</div>`).join("");
}

function bindMatrixDetailInteractions() {
  if (!reportDom.grid) {
    return;
  }

  for (const card of reportDom.grid.querySelectorAll(".matrix-card")) {
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      toggleMatrixDetail(card);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      toggleMatrixDetail(card);
    });
  }

  reportDom.matrixModalClose?.addEventListener("click", closeMatrixDetail);
  reportDom.matrixModalBackdrop?.addEventListener("click", closeMatrixDetail);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && reportDom.matrixModal?.classList.contains("is-open")) {
      closeMatrixDetail();
    }
  });
}

function toggleMatrixDetail(card) {
  const isOpen = card.classList.contains("is-open");
  for (const entry of reportDom.grid.querySelectorAll(".matrix-card")) {
    entry.classList.remove("is-open");
    entry.setAttribute("aria-expanded", "false");
    entry.querySelector(".report-card-detail")?.setAttribute("aria-hidden", "true");
  }
  if (isOpen) {
    return;
  }
  card.classList.add("is-open");
  card.setAttribute("aria-expanded", "true");
  card.querySelector(".report-card-detail")?.setAttribute("aria-hidden", "false");
}

function openMatrixDetail(title) {
  const detail = matrixDetails[title];
  if (!detail || !reportDom.matrixModal) {
    return;
  }

  reportDom.matrixModalTitle.textContent = title;
  reportDom.matrixModalLiteral.textContent = detail.literal;
  reportDom.matrixModalDescription.textContent = detail.description;
  reportDom.matrixModal.classList.add("is-open");
  reportDom.matrixModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

window.openMatrixDetail = openMatrixDetail;

function closeMatrixDetail() {
  if (!reportDom.matrixModal) {
    return;
  }

  reportDom.matrixModal.classList.remove("is-open");
  reportDom.matrixModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function buildDestinyPulseNote(score) {
  if (score >= 70) {
    return "集中と回復がそろっていて、目の総合コンディションは良好です。";
  }
  if (score >= 50) {
    return "大きな問題はなく、全体としてはまずまずの状態です。";
  }
  return "疲労や乾きの影響で、少し休憩がおすすめです。";
}

function buildCosmicWarningNote(warning) {
  const notes = {
    "EMBER STORM": "疲労・眠気が高め。休憩を意識してください。",
    "DRY COMET": "目の乾き傾向。水分補給とまばたきを意識してください。",
    "CLEAR SKY": "視線が安定し、集中状態は良好です。",
    "SOFT STATIC": "大きな問題はなく、やや波がある状態です。"
  };
  return notes[warning] || notes["SOFT STATIC"];
}

function buildFortuneProfile(data) {
  const fatigue = Math.round((data.fatigue || 0) * 100);
  const dryEye = Math.round((data.dryEye || 0) * 100);
  const focus = Math.round((data.focus || 0) * 100);
  const recovery = Math.round((data.recovery || 0) * 100);
  const sync = Math.round((data.sync || 0) * 100);
  const index = (fatigue + dryEye + focus + recovery + sync) % 5;

  const auraTiers = [
    "冴え渡るクリアブルー",
    "ほっと落ち着くライムグリーン",
    "じんわり温かいオレンジ",
    "AURORA BLOOM",
    "元気がみなぎるサンシャインレッド"
  ];
  const modes = ["AURA DIVINATION", "DREAM SCAN", "FOCUS PROPHECY", "CIRCADIAN ORACLE", "RETINA RITUAL"];
  const animals = [
    "賢く立ち回るキツネ",
    "夜更かしが得意なフクロウ",
    "自由気ままなネコ",
    "ゆったり構えるクジラ",
    "一途に突き進むオオカミ"
  ];
  const affinities = ["恐ろしいほど抜群", "なぜかめちゃくちゃ高い", "悪くない感じ", "ちょっとムラがあるかも", "どっぷり夜型モードの気配"];
  const colors = [
    "目が覚めるような青",
    "深みのある琥珀色",
    "爽やかなミントグリーン",
    "優しいコーラルピンク",
    "静かに輝くシルバー"
  ];
  const breaks = ["20秒間遠くをぼーっと眺める", "水をひと口飲んでリフレッシュする", "ぎゅっと目をつむってゆっくり3回まばたきする", "肩をぐるっと大きく一回まわす", "窓の外の景色を10秒眺める"];
  const moods = ["静かにゾーンに入れそうな予感", "なぜか締切直前にめちゃくちゃ強い", "夕方になると急に元気が出るタイプ", "午後になると急に買い物したくなるかも", "なぜか画面の文字がすらすら頭に入る"];
  const rituals = ["視線を一度左上にそらしてみる", "グッと背筋をのばしてみる", "デスクに手を置いて一度落ち着く", "深呼吸して頭をからっぽにする", "ゆっくりまばたきして目を休める"];
  const constellations = [
    "まばたきを忘れたオリオン座",
    "遠くを静かに見つめる北斗七星",
    "ひと休み中のはくちょう座",
    "潤いあふれるみずがめ座",
    "ひらめきが止まらないペガサス座"
  ];
  const predictions = [
    "今夜のあなたは5分休むだけでなんだかいけそうな気がすると思える無敵の運勢です。",
    "次に口にする飲み物が集中モードに入る良いスイッチになりそうです。",
    "今日の午後なぜか信じられないくらい作業がはかどる黄金の15分がやってきます。",
    "今日はちょっと休憩を挟むだけで不思議と全部うまくいく日です。",
    "目をいたわってあげるほど面白いアイデアがどんどん湧いてくる日です。"
  ];

  const destinyPulse = clampPercent(Math.round(focus * 0.42 + recovery * 0.26 + (100 - fatigue) * 0.18 + sync * 0.14));
  const cosmicWarning = fatigue > 68 ? "EMBER STORM" : dryEye > 58 ? "DRY COMET" : focus > 70 ? "CLEAR SKY" : "SOFT STATIC";

  return {
    auraTier: auraTiers[index],
    destinyPulse,
    destinyPulseNote: buildDestinyPulseNote(destinyPulse),
    cosmicWarning,
    cosmicWarningNote: buildCosmicWarningNote(cosmicWarning),
    mode: modes[index],
    focusLuck: focus > 70 ? "神がかってます" : focus > 55 ? "かなり高め" : "ちょっと波があるかも",
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
          fatigue: [73, 132, 214, 185],
          recovery: [123, 199, 189, 170],
          sync: [232, 170, 69, 180],
          ticks: [186, 181, 174, 136],
          cross: [186, 181, 174, 136],
          core: [93, 149, 173, 165],
          orbitDot: [93, 149, 173, 175],
          shard: [232, 170, 69, 105],
          sweep: [73, 132, 214, 34],
          band: [93, 149, 173, 20],
          title: [0, 0, 0, 210],
          subtitle: [73, 132, 214, 190]
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
    const radialNodes = Array.from({ length: 12 }, (_, index) => ({
      angle: (Math.PI * 2 * index) / 12,
      radius: 154 + (index % 3) * 34,
      size: 7 + (index % 4) * 2,
      speed: 0.004 + index * 0.0009
    }));
    const orbitBands = [154, 194, 236, 278];

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

      for (let i = 0; i < orbitBands.length; i += 1) {
        const diameter = orbitBands[i] * 2;
        const spin = p.frameCount * (0.008 + i * 0.0018);
        const primaryBand = i < 2 ? palette.core : palette.sync;
        const secondaryBand = i < 2 ? palette.fatigue : palette.recovery;
        p.strokeWeight(i % 2 === 0 ? 2 : 1.4);
        p.stroke(...primaryBand);
        p.arc(0, 0, diameter, diameter, spin, spin + p.PI * (0.28 + i * 0.08));
        p.stroke(...secondaryBand);
        p.arc(0, 0, diameter, diameter, spin + p.PI * 0.9, spin + p.PI * (1.08 + i * 0.06));
      }

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
      p.stroke(...palette.recovery);
      p.strokeWeight(7);
      p.arc(0, 0, 72, 72, -p.frameCount * 0.018, -p.frameCount * 0.018 + p.PI * 0.46);
      p.stroke(...palette.fatigue);
      p.strokeWeight(4);
      p.arc(0, 0, 58, 58, p.frameCount * 0.036, p.frameCount * 0.036 + p.PI * 0.34);

      p.noStroke();
      for (const dot of orbitDots) {
        const angle = dot.angle + p.frameCount * 0.01 * ((dot.radius % 2) ? 1 : -1);
        p.fill(...palette.orbitDot);
        p.circle(Math.cos(angle) * dot.radius, Math.sin(angle) * dot.radius, 3.4);
      }

      for (const node of radialNodes) {
        const angle = node.angle + p.frameCount * node.speed;
        const x = Math.cos(angle) * node.radius;
        const y = Math.sin(angle) * node.radius;
        p.fill(...palette.sync);
        p.circle(x, y, node.size + Math.sin(angle * 3 + p.frameCount * 0.02) * 1.8);
        p.fill(...palette.fatigue);
        p.circle(x * 0.86, y * 0.86, node.size * 0.34);
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

      p.noFill();
      p.stroke(...palette.band);
      p.strokeWeight(18);
      p.arc(0, 0, 340, 340, -p.HALF_PI + p.frameCount * 0.008, -p.HALF_PI + p.frameCount * 0.008 + p.PI * 0.2);
      p.stroke(...palette.sweep);
      p.strokeWeight(12);
      p.arc(0, 0, 356, 356, p.PI * 0.2 - p.frameCount * 0.01, p.PI * 0.34 - p.frameCount * 0.01);

      if (p.frameCount % 80 < 26) {
        p.fill(...palette.sweep);
        p.rect(-p.width / 2, -10, p.width, 20);
      }

      if (p.frameCount % 120 < 40) {
        p.fill(...palette.band);
        p.rect(-p.width / 2, -p.height / 2 + 40, p.width, 18);
        p.rect(-p.width / 2, p.height / 2 - 58, p.width, 14);
      }
    };
  });
}
