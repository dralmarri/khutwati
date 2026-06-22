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
    completedWorkouts: []
  };

  let state = loadState();
  let timer = { remaining: 35 * 60, running: false, interval: null };

  const $ = (id) => document.getElementById(id);

  function loadState() {
    try {
      return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
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
    $("workoutTitle").textContent = workout.title;
    $("equipmentIcon").textContent = workout.icon;
    $("equipmentName").textContent = workout.equipment;
    $("workoutMinutes").textContent = workout.minutes;
    $("workoutDescription").textContent = workout.minutes
      ? `${workout.description} ${workout.adjustments[0]} توقف عند الشعور بألم غير معتاد.`
      : "يوم استشفاء: اهتم بالنوم والماء وحركة خفيفة.";
    timer.remaining = workout.minutes * 60;
    updateTimerDisplay();

    const completedToday = state.completedWorkouts.includes(dateKey());
    $("completeWorkoutBtn").classList.toggle("hidden", completedToday || !workout.minutes);
    $("completeWorkoutBtn").textContent = completedToday ? "✓ تم إكمال تمرين اليوم" : "✓ تسجيل إكمال التمرين";
    $("startWorkoutBtn").classList.toggle("hidden", !workout.minutes);

    $("weeklyPlan").innerHTML = dailyPlan.map(item => {
      const label = planDate(item);
      const isToday = item.date === dateKey();
      return `
      <details class="plan-day-details"${isToday ? " open" : ""}>
        <summary class="plan-day">
          <span class="day-badge" dir="ltr">${label.shortDay}</span>
          <span>
            <strong>${label.day} ${label.date} · ${item.title}</strong>
            <small>${item.phase} · ${item.minutes ? `${item.minutes} دقيقة` : "راحة"} · ${item.equipment}</small>
          </span>
          <span class="plan-toggle" aria-hidden="true">⌄</span>
        </summary>
        <div class="exercise-details">
          <img class="exercise-image" src="${item.image}" alt="رسم توضيحي لتمرين ${item.title}" loading="lazy">
          <div class="exercise-detail-title"><span>${item.icon}</span><strong>طريقة أداء التمرين</strong></div>
          <ol>
            ${item.steps.map(step => `<li>${step}</li>`).join("")}
            ${item.adjustments.map(step => `<li class="day-progress-step"><strong>مستوى هذا اليوم:</strong> ${step}</li>`).join("")}
          </ol>
          <div class="video-links">
            <strong>شاهد طريقة الأداء</strong>
            ${item.links.map(([title, url]) => `<a href="${url}" target="_blank" rel="noopener">${title} ↗</a>`).join("")}
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
    timer.remaining = currentWorkout().minutes * 60;
    $("timerStatus").textContent = "جاهز للبدء";
    $("timerToggleBtn").textContent = "ابدأ";
    updateTimerDisplay();
  });

  $("completeWorkoutBtn").addEventListener("click", () => {
    const today = dateKey();
    if (!state.completedWorkouts.includes(today)) state.completedWorkouts.push(today);
    saveState();
    render();
    showToast("تم تسجيل تمرين اليوم، بطل! 🎉");
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
