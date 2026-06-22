(() => {
  "use strict";

  const START_WEIGHT = 82.7;
  const TARGET_WEIGHT = 77.5;
  const TARGET_DATE = new Date("2026-07-15T23:59:59");
  const STORAGE_KEY = "khutwati-state-v1";
  const WATER_CUP_LITERS = 0.25;
  const WATER_TARGET_LITERS = 2;

  const videoSearch = query => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const workoutTemplates = {
    treadmill: {
      title: "مشي متدرّج", equipment: "جهاز المشي", icon: "🏃",
      image: "images/exercises/treadmill.png",
      description: "مشي متواصل بسرعة مريحة مع إحماء وتهدئة.",
      steps: [
        "امشِ 5 دقائق ببطء للإحماء.",
        "امشِ في الجزء الرئيسي بسرعة تستطيع معها الكلام بجمل قصيرة.",
        "اختم بـ5 دقائق بطيئة للتهدئة.",
        "اجعل ظهرك مستقيماً ولا تمسك المقابض إلا للتوازن."
      ],
      links: [
        ["طريقة المشي الصحيحة على جهاز المشي", videoSearch("طريقة المشي الصحيحة على جهاز المشي للمبتدئين")]
      ]
    },
    bikeBands: {
      title: "دراجة وحبال", equipment: "الدراجة وحبال المقاومة", icon: "🚴",
      image: "images/exercises/bike-bands.png",
      description: "دراجة ثابتة تليها تمارين سحب خفيفة للجزء العلوي.",
      steps: [
        "اضبط المقعد بحيث تبقى الركبة مثنية قليلاً عند أسفل الدواسة.",
        "ابدأ بـ5 دقائق خفيفة ثم انتقل إلى مقاومة متوسطة.",
        "اختم بـ3 دقائق هادئة.",
        "بعد الدراجة نفّذ سحب الحبل نحو الصدر وفتح الذراعين."
      ],
      links: [
        ["ضبط واستخدام الدراجة الثابتة", videoSearch("طريقة استخدام الدراجة الثابتة للمبتدئين ضبط المقعد")],
        ["سحب حبل المقاومة نحو الصدر", videoSearch("تمرين سحب حبل المقاومة للمبتدئين resistance band row")],
        ["فتح الذراعين بحبل المقاومة", videoSearch("تمرين فتح الذراعين بحبل المقاومة band pull apart")]
      ]
    },
    matBall: {
      title: "قوة على الحصيرة", equipment: "الحصيرة والكرة الطبية", icon: "💪",
      image: "images/exercises/mat-ball.png",
      description: "تقوية لطيفة للساقين والحوض والجذع باستخدام الحصيرة والكرة.",
      steps: [
        "ابدأ بإحماء خفيف لمدة 5 دقائق.",
        "نفّذ الجلوس والقيام من كرسي، ثم جسر الحوض.",
        "اضغط الكرة بين الكفين وارفعها من الصدر ببطء.",
        "نفّذ تمرين الطائر مع إبقاء الظهر ثابتاً.",
        "استرح 60 ثانية بين الجولات."
      ],
      links: [
        ["الجلوس والقيام من كرسي", videoSearch("تمرين الجلوس والقيام من الكرسي للمبتدئين")],
        ["جسر الحوض", videoSearch("طريقة تمرين جسر الحوض glute bridge للمبتدئين")],
        ["تمرين الطائر", videoSearch("تمرين bird dog للمبتدئين الطريقة الصحيحة")],
        ["تمارين الكرة الطبية للمبتدئين", videoSearch("تمارين الكرة الطبية للمبتدئين medicine ball")]
      ]
    },
    recovery: {
      title: "راحة نشطة وتمدد", equipment: "الحصيرة", icon: "🧘",
      image: "images/exercises/stretch.png",
      description: "حركة خفيفة وتمدد مريح يساعدان الجسم على الاستشفاء.",
      steps: [
        "امشِ بخفة 5 دقائق.",
        "مدد عضلة الساق وخلف الفخذ 20 ثانية لكل جهة.",
        "اسحب الركبة نحو الصدر أثناء الاستلقاء.",
        "نفّذ حركة القطة والبقرة ببطء.",
        "التمدد مريح؛ لا تضغط حتى الألم."
      ],
      links: [
        ["تمدد الساق وخلف الفخذ", videoSearch("تمارين تمدد الساق وخلف الفخذ للمبتدئين")],
        ["حركة القطة والبقرة", videoSearch("تمرين القطة والبقرة cat cow بالعربي")]
      ]
    },
    intervals: {
      title: "فترات على المشي", equipment: "جهاز المشي", icon: "⏱️",
      image: "images/exercises/treadmill.png",
      description: "تبديل منظم بين سرعة مريحة وسرعة أعلى من دون جري.",
      steps: [
        "ابدأ بـ5 دقائق مشي بطيء.",
        "تناوب بين دقيقتين مريحتين ودقيقة أسرع.",
        "السرعة الأعلى يجب أن تبقى تحت السيطرة ومن دون جري.",
        "اختم بـ5 دقائق بطيئة."
      ],
      links: [
        ["مشي الفترات للمبتدئين", videoSearch("تمرين مشي فترات على جهاز المشي للمبتدئين treadmill intervals")]
      ]
    },
    circuit: {
      title: "دائرة منزلية", equipment: "الحبال والكرة والحصيرة", icon: "🔁",
      image: "images/exercises/resistance-row.png",
      description: "مجموعة تمارين متتابعة للجسم كله مع راحة بين الجولات.",
      steps: [
        "اسحب حبل المقاومة نحو الصدر.",
        "اجلس وقم من كرسي بتحكم.",
        "احمل الكرة وامشِ في مكانك.",
        "ادفع الحبل أمام الصدر.",
        "نفّذ جسر الحوض ثم امشِ في المكان دقيقة.",
        "استرح دقيقة بين الجولات."
      ],
      links: [
        ["سحب حبل المقاومة", videoSearch("تمرين resistance band row للمبتدئين")],
        ["سكوات الكرسي", videoSearch("تمرين chair squat للمبتدئين")],
        ["المشي بالكرة الطبية", videoSearch("medicine ball march exercise beginner")],
        ["دفع حبل المقاومة أمام الصدر", videoSearch("resistance band chest press beginner")]
      ]
    },
    rest: {
      title: "راحة واستشفاء", equipment: "راحة أو مشي خفيف", icon: "🌿",
      image: "images/exercises/stretch.png",
      description: "يوم لاستعادة النشاط مع حركة خفيفة اختيارية.",
      steps: [
        "خذ راحة كاملة أو امشِ بهدوء حسب شعورك.",
        "اهتم بالنوم والسوائل والطعام المتوازن.",
        "لا تعوّض يوم الراحة بتقليل الطعام بشدة."
      ],
      links: [
        ["تمدد خفيف في يوم الراحة", videoSearch("تمارين تمدد خفيفة يوم الراحة للمبتدئين")]
      ]
    }
  };

  const scheduleRows = [
    ["2026-06-22", "bikeBands", 25, "الأسبوع 1 · بداية هادئة", ["دراجة 17 دقيقة، ثم جولة واحدة من الحبال × 10 تكرارات."]],
    ["2026-06-23", "matBall", 20, "الأسبوع 1 · تأسيس", ["جولة واحدة إلى جولتين، 8 تكرارات لكل حركة."]],
    ["2026-06-24", "recovery", 20, "الأسبوع 1 · استشفاء", ["ثبت كل تمدد 20 ثانية وكرر مرتين."]],
    ["2026-06-25", "intervals", 30, "الأسبوع 1 · فترات خفيفة", ["كرر 6 مرات: دقيقتان مريحتان ودقيقة أسرع، من دون ميل."]],
    ["2026-06-26", "circuit", 22, "الأسبوع 1 · دائرتان", ["نفّذ جولتين، 8 تكرارات لكل حركة، و30 ثانية لحمل الكرة."]],
    ["2026-06-27", "rest", 0, "الأسبوع 1 · راحة", ["مشي اختياري من 10 إلى 15 دقيقة فقط."]],
    ["2026-06-28", "treadmill", 35, "الأسبوع 1 · تثبيت التحمل", ["20 دقيقة بسرعة متوسطة، ثم 5 دقائق أسرع قليلاً."]],
    ["2026-06-29", "bikeBands", 30, "الأسبوع 2 · زيادة بسيطة", ["دراجة 20 دقيقة، ثم جولتان من الحبال × 10 تكرارات."]],
    ["2026-06-30", "matBall", 25, "الأسبوع 2 · جولتان", ["جولتان كاملتان، 10 تكرارات لكل حركة و6 للطائر لكل جانب."]],
    ["2026-07-01", "recovery", 20, "الأسبوع 2 · استشفاء", ["أضف دقيقتين من التنفس الهادئ في النهاية."]],
    ["2026-07-02", "intervals", 35, "الأسبوع 2 · فترات متوسطة", ["كرر 7 مرات، ويمكن إضافة ميل 1% إن كان المشي سهلاً."]],
    ["2026-07-03", "circuit", 26, "الأسبوع 2 · ثلاث جولات", ["نفّذ 3 جولات، 10 تكرارات لكل حركة."]],
    ["2026-07-04", "rest", 15, "الأسبوع 2 · راحة نشطة", ["مشي هادئ 15 دقيقة أو راحة كاملة عند التعب."]],
    ["2026-07-05", "treadmill", 40, "الأسبوع 2 · تحمل أطول", ["25 دقيقة متوسطة، 5 دقائق أسرع، ثم تهدئة."]],
    ["2026-07-06", "bikeBands", 35, "الأسبوع 3 · تقدم", ["دراجة 23 دقيقة، ثم جولتان من الحبال × 12 تكراراً."]],
    ["2026-07-07", "matBall", 30, "الأسبوع 3 · ثلاث جولات", ["3 جولات، 10 تكرارات؛ خفّضها إلى جولتين إذا تدهورت الوضعية."]],
    ["2026-07-08", "recovery", 20, "الأسبوع 3 · استشفاء", ["حركة بطيئة وتركيز على التنفس، من دون ألم."]],
    ["2026-07-09", "intervals", 40, "الأسبوع 3 · أعلى جلسة", ["كرر 8 مرات، ويمكن ميل 1–2% فقط إذا كان مريحاً."]],
    ["2026-07-10", "circuit", 30, "الأسبوع 3 · دائرة كاملة", ["3 جولات، 12 تكراراً لكل حركة و45 ثانية لحمل الكرة."]],
    ["2026-07-11", "rest", 0, "الأسبوع 3 · راحة", ["راحة كاملة مع نوم جيد وماء منتظم."]],
    ["2026-07-12", "treadmill", 45, "الأسبوع 3 · أطول مشي", ["30 دقيقة متوسطة، 5 دقائق أسرع، ثم تهدئة. لا تحاول الجري."]],
    ["2026-07-13", "bikeBands", 30, "المرحلة الأخيرة · تخفيف", ["دراجة 20 دقيقة وجولة واحدة خفيفة من الحبال."]],
    ["2026-07-14", "matBall", 20, "المرحلة الأخيرة · تنشيط", ["جولتان خفيفتان، 8 تكرارات، من دون إجهاد."]],
    ["2026-07-15", "recovery", 20, "يوم الهدف · حركة لطيفة", ["مشي خفيف وتمدد فقط؛ لا تستخدم تمريناً قاسياً لمحاولة تغيير رقم الميزان."]]
  ];

  const dailyPlan = scheduleRows.map(([date, type, minutes, phase, adjustments]) => ({
    date, type, minutes, phase, adjustments, ...workoutTemplates[type]
  }));

  const defaultState = {
    currentWeight: START_WEIGHT,
    weights: [],
    water: { date: "", count: 0 },
    completedWorkouts: [],
    workoutFeedback: {}
  };

  let state = loadState();
  let timer = { remaining: 35 * 60, running: false, interval: null };

  const $ = (id) => document.getElementById(id);

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        ...defaultState,
        ...saved,
        workoutFeedback: saved.workoutFeedback || {}
      };
    } catch {
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function dateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatArabicDate(date) {
    return new Intl.DateTimeFormat("ar-KW", { day: "numeric", month: "long" }).format(date);
  }

  function currentWorkout() {
    const today = dateKey();
    return dailyPlan.find(item => item.date === today)
      || dailyPlan.find(item => item.date > today)
      || dailyPlan[dailyPlan.length - 1];
  }

  const sectionLibrary = {
    warmup: {
      icon: "🔥", title: "الإحماء والحركة",
      detail: "مشي في المكان وتحريك الكتفين والكاحلين",
      link: ["إحماء قبل التمرين", videoSearch("تمارين إحماء للمبتدئين قبل الرياضة")]
    },
    treadmill: {
      icon: "🏃", title: "جهاز المشي",
      detail: "مشي متدرّج بسرعة تسمح بالكلام",
      link: ["المشي الصحيح على جهاز المشي", videoSearch("طريقة المشي الصحيحة على جهاز المشي للمبتدئين")]
    },
    bike: {
      icon: "🚴", title: "الدراجة الثابتة",
      detail: "مقاومة خفيفة إلى متوسطة مع ظهر مستقيم",
      link: ["استخدام الدراجة الثابتة", videoSearch("طريقة استخدام الدراجة الثابتة للمبتدئين ضبط المقعد")]
    },
    resistance: {
      icon: "💪", title: "الحبال وتمارين المقاومة",
      detail: "سحب الحبل، دفع الصدر، وجلوس وقيام من كرسي",
      link: ["تمارين حبال المقاومة", videoSearch("تمارين حبال المقاومة للمبتدئين resistance bands full body")]
    },
    matBall: {
      icon: "⚫", title: "الحصيرة والكرة الطبية",
      detail: "جسر الحوض، تمرين الطائر، وضغط الكرة",
      link: ["تمارين الحصيرة والكرة الطبية", videoSearch("تمارين الكرة الطبية والحصيرة للمبتدئين medicine ball mat")]
    },
    mobility: {
      icon: "🧘", title: "التهدئة والتمدد",
      detail: "تمدد الساقين والظهر مع تنفس هادئ",
      link: ["تمدد بعد التمرين", videoSearch("تمارين تمدد بعد الرياضة للمبتدئين")]
    }
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function adaptiveProfile() {
    const today = dateKey();
    const recentDates = dailyPlan.filter(item => item.date <= today).slice(-7).map(item => item.date);
    const recentFeedback = recentDates.map(date => state.workoutFeedback[date]).filter(Boolean);
    const adherence = recentDates.length
      ? recentDates.filter(date => state.workoutFeedback[date]?.completion >= 75).length / recentDates.length
      : 0;
    const avgEffort = recentFeedback.length
      ? recentFeedback.reduce((sum, item) => sum + Number(item.effort || 5), 0) / recentFeedback.length
      : 5;
    const avgCompletion = recentFeedback.length
      ? recentFeedback.reduce((sum, item) => sum + Number(item.completion || 0), 0) / recentFeedback.length
      : 0;
    const painRecently = recentFeedback.slice(-3).some(item => item.pain);
    const recentWeights = state.weights
      .map(item => ({ ...item, time: new Date(item.date).getTime() }))
      .filter(item => Number.isFinite(item.time))
      .sort((a, b) => a.time - b.time)
      .slice(-7);
    let weeklyWeightChange = null;
    if (recentWeights.length >= 2) {
      const first = recentWeights[0];
      const last = recentWeights[recentWeights.length - 1];
      const spanDays = (last.time - first.time) / 86400000;
      if (spanDays >= 4) weeklyWeightChange = ((Number(first.weight) - Number(last.weight)) / spanDays) * 7;
    }
    let adjustment = 0;
    let level = "خطة متوازنة";
    let reason = "هذه هي نقطة البداية. قيّم الجلسة بعد الانتهاء ليصبح التكيف أدق.";

    if (painRecently) {
      adjustment = -2;
      level = "استشفاء وحمل منخفض";
      reason = "تم تخفيف الحمل لأنك سجلت ألماً غير معتاد مؤخراً.";
    } else if (avgEffort >= 8) {
      adjustment = -1;
      level = "تخفيف ذكي";
      reason = `متوسط الجهد الأخير ${avgEffort.toFixed(1)}/10؛ خفّضنا المدة والجولات.`;
    } else if (recentFeedback.length >= 2 && (avgCompletion < 65 || adherence < 0.5)) {
      adjustment = -1;
      level = "عودة تدريجية";
      reason = "تم تخفيف الجلسة لمساعدتك على استعادة الانتظام بعد جلسات غير مكتملة.";
    } else if (recentFeedback.length >= 2 && avgEffort <= 6 && avgCompletion >= 85 && adherence >= 0.7) {
      adjustment = 1;
      level = "تقدّم محسوب";
      reason = "إنجازك جيد والجهد مناسب؛ أضفنا دقائق قليلة أو جولة واحدة فقط.";
    } else if (recentFeedback.length) {
      level = "ثبات وتوازن";
      reason = `إنجازك المتوسط ${Math.round(avgCompletion)}% والجهد ${avgEffort.toFixed(1)}/10؛ أبقينا الحمل مستقراً.`;
    }

    if (weeklyWeightChange !== null && weeklyWeightChange > 0.9 && adjustment > 0) {
      adjustment = 0;
      level = "ثبات للحفاظ على التعافي";
      reason = "اتجاه الوزن ينخفض بسرعة؛ أبقينا الحمل ثابتاً ولم نضف جهداً جديداً.";
    }

    return { adjustment, level, reason, adherence, avgEffort, avgCompletion, weeklyWeightChange };
  }

  function buildSession(workout) {
    const profile = adaptiveProfile();
    const isRecovery = workout.type === "rest" || workout.type === "recovery";
    const baseMinutes = workout.minutes || 15;
    const total = clamp(baseMinutes + profile.adjustment * 5, isRecovery ? 15 : 20, isRecovery ? 25 : 50);
    const warmup = isRecovery ? 3 : 4;
    const mobility = isRecovery ? 7 : 5;
    const strength = isRecovery ? 0 : Math.max(6, Math.round(total * 0.26));
    const cardio = total - warmup - mobility - strength;
    const treadmill = Math.max(3, Math.ceil(cardio * (workout.type === "bikeBands" ? 0.4 : 0.58)));
    const bike = Math.max(3, cardio - treadmill);
    const resistanceKey = workout.type === "matBall" ? "matBall" : "resistance";
    const rounds = profile.adjustment > 0 ? 3 : profile.adjustment < 0 ? 1 : 2;
    const reps = profile.adjustment > 0 ? 12 : profile.adjustment < 0 ? 8 : 10;
    const sections = [
      { key: "warmup", minutes: warmup, note: sectionLibrary.warmup.detail },
      { key: workout.type === "bikeBands" ? "bike" : "treadmill", minutes: workout.type === "bikeBands" ? bike : treadmill, note: workout.type === "intervals" ? "تناوب بين دقيقتين مريحتين ودقيقة أسرع." : undefined },
      { key: workout.type === "bikeBands" ? "treadmill" : "bike", minutes: workout.type === "bikeBands" ? treadmill : bike },
      ...(strength ? [{ key: resistanceKey, minutes: strength, note: `${rounds} ${rounds === 1 ? "جولة" : "جولات"} × ${reps} تكرارات لكل حركة.` }] : []),
      { key: "mobility", minutes: mobility, note: sectionLibrary.mobility.detail }
    ].map(section => ({ ...sectionLibrary[section.key], ...section }));

    return { ...workout, totalMinutes: sections.reduce((sum, item) => sum + item.minutes, 0), sections, profile };
  }

  function planDate(item) {
    const date = new Date(`${item.date}T12:00:00`);
    return {
      day: new Intl.DateTimeFormat("ar-KW", { weekday: "long" }).format(date),
      date: new Intl.DateTimeFormat("ar-KW", { day: "numeric", month: "short" }).format(date),
      shortDay: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][date.getDay()]
    };
  }

  function refreshDailyWater() {
    const today = dateKey();
    if (state.water.date !== today) state.water = { date: today, count: 0 };
  }

  function render() {
    refreshDailyWater();
    const now = new Date();
    const days = Math.max(0, Math.ceil((TARGET_DATE - now) / 86400000));
    const lost = Math.max(0, START_WEIGHT - state.currentWeight);
    const total = START_WEIGHT - TARGET_WEIGHT;
    const progress = Math.min(100, Math.max(0, (lost / total) * 100));
    const workout = currentWorkout();
    const session = buildSession(workout);

    $("todayDate").textContent = formatArabicDate(now);
    $("daysRemaining").textContent = new Intl.NumberFormat("ar").format(days);
    $("goalProgress").style.width = `${progress}%`;
    $("currentWeightTop").textContent = state.currentWeight.toFixed(1);
    $("currentWeightCard").textContent = state.currentWeight.toFixed(1);
    const waterLiters = state.water.count * WATER_CUP_LITERS;
    $("waterLiters").textContent = waterLiters.toFixed(2).replace(/\.00$/, ".0");
    $("waterCups").textContent = `${state.water.count} أكواب`;
    $("lostWeight").textContent = `${lost.toFixed(1)} كجم`;
    $("remainingWeight").textContent = `${Math.max(0, state.currentWeight - TARGET_WEIGHT).toFixed(1)} كجم`;
    $("completedCount").textContent = state.completedWorkouts.length;
    $("workoutTitle").textContent = "جلسة متكاملة";
    $("equipmentIcon").textContent = "✦";
    $("equipmentName").textContent = "مشي + دراجة + مقاومة";
    $("workoutMinutes").textContent = session.totalMinutes;
    $("workoutDescription").textContent = `${workout.phase}. ${session.profile.reason}`;
    $("adaptiveLevel").textContent = session.profile.level;
    $("adaptiveReason").textContent = session.profile.reason;
    $("todaySections").innerHTML = session.sections.map(section => `
      <div class="session-section">
        <span class="section-icon">${section.icon}</span>
        <span><strong>${section.title}</strong><small>${section.note || section.detail}</small></span>
        <span class="section-time">${section.minutes} د</span>
      </div>
    `).join("");
    if (!timer.running) timer.remaining = session.totalMinutes * 60;
    updateTimerDisplay();

    const completedToday = Boolean(state.workoutFeedback[dateKey()]);
    $("completeWorkoutBtn").classList.toggle("hidden", completedToday);
    $("completeWorkoutBtn").textContent = completedToday ? "✓ تم إكمال تمرين اليوم" : "✓ تسجيل إكمال التمرين";
    $("startWorkoutBtn").classList.remove("hidden");

    $("weeklyPlan").innerHTML = dailyPlan.map(item => {
      const label = planDate(item);
      const isToday = item.date === dateKey();
      const itemSession = buildSession(item);
      return `
      <details class="plan-day-details"${isToday ? " open" : ""}>
        <summary class="plan-day">
          <span class="day-badge" dir="ltr">${label.shortDay}</span>
          <span>
            <strong>${label.day} ${label.date} · جلسة متكاملة</strong>
            <small>${item.phase} · ${itemSession.totalMinutes} دقيقة · ${itemSession.profile.level}</small>
          </span>
          <span class="plan-toggle" aria-hidden="true">⌄</span>
        </summary>
        <div class="exercise-details">
          <img class="exercise-image" src="${item.image}" alt="رسم توضيحي لتمرين ${item.title}" loading="lazy">
          <div class="exercise-detail-title"><span>✦</span><strong>أقسام الجلسة</strong></div>
          <div class="day-session-list">
            ${itemSession.sections.map(section => `
              <div class="day-session-item">
                <strong>${section.icon} ${section.title} · ${section.minutes} دقائق</strong>
                <small>${section.note || section.detail}</small>
              </div>
            `).join("")}
          </div>
          <p class="day-progress-step"><strong>تدرّج اليوم:</strong> ${item.adjustments[0]}</p>
          <div class="video-links">
            <strong>شاهد طريقة الأداء</strong>
            ${itemSession.sections.map(section => section.link).filter(Boolean).filter((link, index, all) => all.findIndex(item => item[1] === link[1]) === index).map(([title, url]) => `<a href="${url}" target="_blank" rel="noopener">${title} ↗</a>`).join("")}
          </div>
        </div>
      </details>
    `;
    }).join("");

    $("weightHistory").innerHTML = state.weights.length
      ? state.weights.slice().reverse().map(entry => `
          <div class="history-row">
            <span>${new Intl.DateTimeFormat("ar-KW", { day: "numeric", month: "short", year: "numeric" }).format(new Date(entry.date))}</span>
            <strong>${Number(entry.weight).toFixed(1)} كجم</strong>
          </div>
        `).join("")
      : '<p class="empty-state">سجّل وزنك الأول ليظهر سجل التقدم هنا.</p>';

    saveState();
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(timer.remaining / 60);
    const seconds = timer.remaining % 60;
    $("timerValue").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function stopTimer() {
    clearInterval(timer.interval);
    timer.interval = null;
    timer.running = false;
    $("timerToggleBtn").textContent = "استمرار";
    $("timerStatus").textContent = "المؤقت متوقف";
  }

  function toggleTimer() {
    if (timer.running) return stopTimer();
    if (timer.remaining <= 0) timer.remaining = currentWorkout().minutes * 60;
    timer.running = true;
    $("timerToggleBtn").textContent = "إيقاف مؤقت";
    $("timerStatus").textContent = "أحسنت، استمر!";
    timer.interval = setInterval(() => {
      timer.remaining -= 1;
      updateTimerDisplay();
      if (timer.remaining <= 0) {
        stopTimer();
        $("timerStatus").textContent = "اكتمل الوقت! سجّل إنجازك.";
        navigator.vibrate?.([200, 100, 200]);
      }
    }, 1000);
  }

  $("waterCard").addEventListener("click", () => {
    refreshDailyWater();
    if (state.water.count < WATER_TARGET_LITERS / WATER_CUP_LITERS) {
      state.water.count += 1;
      showToast(`تمت إضافة 250 مل · المجموع ${(state.water.count * WATER_CUP_LITERS).toFixed(2)} لتر 💧`);
    } else {
      showToast("رائع! أكملت هدف الماء اليوم");
    }
    render();
  });

  $("weightCard").addEventListener("click", () => {
    $("weightInput").value = state.currentWeight.toFixed(1);
    $("weightDialog").showModal();
    setTimeout(() => $("weightInput").select(), 50);
  });

  $("weightForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const value = Number($("weightInput").value);
    if (!Number.isFinite(value) || value < 40 || value > 200) return;
    state.currentWeight = value;
    state.weights.push({ date: new Date().toISOString(), weight: value });
    saveState();
    $("weightDialog").close();
    render();
    showToast("تم حفظ وزنك الجديد");
  });

  $("startWorkoutBtn").addEventListener("click", () => {
    $("timerDialog").showModal();
  });
  $("closeTimerBtn").addEventListener("click", () => $("timerDialog").close());
  $("timerToggleBtn").addEventListener("click", toggleTimer);
  $("timerResetBtn").addEventListener("click", () => {
    stopTimer();
    timer.remaining = buildSession(currentWorkout()).totalMinutes * 60;
    $("timerStatus").textContent = "جاهز للبدء";
    $("timerToggleBtn").textContent = "ابدأ";
    updateTimerDisplay();
  });

  $("completeWorkoutBtn").addEventListener("click", () => {
    $("effortInput").value = "5";
    $("effortValue").textContent = "5";
    $("painInput").checked = false;
    $("feedbackDialog").showModal();
  });

  $("effortInput").addEventListener("input", event => {
    $("effortValue").textContent = event.target.value;
  });

  $("feedbackForm").addEventListener("submit", event => {
    event.preventDefault();
    const today = dateKey();
    const completion = Number(document.querySelector('input[name="completion"]:checked')?.value || 100);
    state.workoutFeedback[today] = {
      completion,
      effort: Number($("effortInput").value),
      pain: $("painInput").checked,
      savedAt: new Date().toISOString()
    };
    if (!state.completedWorkouts.includes(today)) state.completedWorkouts.push(today);
    saveState();
    $("feedbackDialog").close();
    render();
    showToast("تم حفظ الإنجاز وتحديث الخطة القادمة ✦");
  });

  $("showPlanBtn").addEventListener("click", () => $("planSection").scrollIntoView());

  document.querySelectorAll(".bottom-nav button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".bottom-nav button").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      const target = button.dataset.target;
      if (target === "top") window.scrollTo({ top: 0 });
      else $(target).scrollIntoView();
    });
  });

  $("shareBtn").addEventListener("click", async () => {
    const text = `هدفي في خطوتي: الوصول من ${START_WEIGHT} إلى ${TARGET_WEIGHT} كجم بحلول 15 يوليو 2026. وزني الحالي ${state.currentWeight.toFixed(1)} كجم.`;
    try {
      if (navigator.share) await navigator.share({ title: "خطوتي", text, url: location.href });
      else {
        await navigator.clipboard.writeText(`${text}\n${location.href}`);
        showToast("تم نسخ ملخص التقدم");
      }
    } catch (error) {
      if (error.name !== "AbortError") showToast("تعذرت المشاركة الآن");
    }
  });

  window.addEventListener("load", () => {
    render();
    if ("serviceWorker" in navigator && !window.cordova) {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    }
  });
})();
