(() => {
  "use strict";

  const STORAGE_KEY = "khutwati-state-v1";
  const WATER_CUP_LITERS = 0.25;
  const WATER_TARGET_LITERS = 2;
  const AI_SUBSCRIPTION_PRODUCT_ID = "com.khutwati.ai.monthly";
  const DEFAULT_PROFILE = {
    startWeight: 82.7,
    targetWeight: 77.5,
    targetDate: "2026-07-15",
    sessionMinutes: 30,
    location: "home",
    equipment: ["treadmill", "bike", "bands", "mat", "medicineBall"],
    durationOverrides: {}
  };
  const DEFAULT_NUTRITION = {
    age: "",
    height: "",
    sex: "male",
    activity: 1.375,
    dietStyle: "lowCarb",
    healthConditions: [],
    otherHealthCondition: "",
    meals: []
  };
  const DEFAULT_AI = {
    endpoint: "",
    lastPlan: null,
    appliedCalorieAdjustment: 0
  };
  const DEFAULT_SUBSCRIPTION = {
    active: false,
    productId: AI_SUBSCRIPTION_PRODUCT_ID,
    price: "",
    entitlementToken: "",
    expiresAt: ""
  };

  const videoSearch = query => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const matBallGuides = [
    {
      requires: ["mat"],
      title: "جسر الحوض على الحصيرة",
      dose: "10 تكرارات ببطء",
      video: ["شاهد طريقة جسر الحوض", videoSearch("طريقة تمرين جسر الحوض للمبتدئين glute bridge")],
      steps: [
        "استلقِ على ظهرك، اثنِ الركبتين وضع القدمين على الأرض بعرض الحوض، والذراعين بجانب الجسم.",
        "شدّ البطن برفق واضغط بالكعبين، ثم ارفع الحوض حتى يصبح الجسم خطاً مائلاً من الكتفين إلى الركبتين.",
        "اثبت ثانية واحدة واعصر عضلات المؤخرة، ثم أنزل الحوض ببطء من دون إسقاطه.",
        "ازفر أثناء الرفع وخذ شهيقاً أثناء النزول. لا تبالغ في تقويس أسفل الظهر."
      ]
    },
    {
      requires: ["mat"],
      title: "تمرين الطائر Bird Dog",
      dose: "8 تكرارات لكل جهة",
      video: ["شاهد طريقة تمرين الطائر", videoSearch("طريقة تمرين bird dog للمبتدئين بالعربي")],
      steps: [
        "ابدأ على اليدين والركبتين: اليدان تحت الكتفين والركبتان تحت الحوض، والظهر في وضع محايد.",
        "مدّ الذراع اليمنى إلى الأمام والساق اليسرى إلى الخلف حتى تقتربا من مستوى الظهر.",
        "اثبت ثانية أو ثانيتين مع إبقاء الحوض مواجهاً للأرض، ثم عد ببطء وبدّل الجهة.",
        "لا ترفع الساق أعلى من الظهر ولا تحبس النفس. صغّر مدى الحركة إذا اهتز الجسم."
      ]
    },
    {
      requires: ["medicineBall"],
      title: "ضغط الكرة الطبية بين الكفين",
      dose: "8 ضغطات، كل ضغطة 5 ثوانٍ",
      video: ["شاهد طريقة ضغط الكرة", videoSearch("medicine ball chest squeeze exercise beginner")],
      steps: [
        "اجلس على كرسي أو قف باستقامة، وامسك الكرة أمام منتصف الصدر بكلتا اليدين مع ثني المرفقين.",
        "اضغط الكفين نحو الكرة تدريجياً حتى تشعر بعمل عضلات الصدر والذراعين، من دون رفع الكتفين.",
        "حافظ على الضغط 5 ثوانٍ مع تنفس طبيعي، ثم خفف الضغط ببطء.",
        "استخدم ضغطاً متوسطاً؛ لا تدفع الكرة بعيداً ولا تحبس النفس."
      ]
    },
    {
      requires: ["medicineBall"],
      title: "المشي في المكان مع الكرة",
      dose: "30 ثانية",
      video: ["شاهد طريقة المشي بالكرة", videoSearch("medicine ball march in place beginner exercise")],
      steps: [
        "قف قرب جدار أو كرسي ثابت، واحمل الكرة ملاصقة للصدر بكلتا اليدين.",
        "ارفع ركبة واحدة قليلاً ثم أنزلها، وبدّل بين الساقين بإيقاع هادئ.",
        "حافظ على الصدر مرفوعاً والبطن مشدوداً بخفة، ولا تمل بجسمك إلى الخلف.",
        "توقف فوراً إذا فقدت التوازن، ويمكن تنفيذ الحركة من وضع الجلوس."
      ]
    }
  ];
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

  let dailyPlan = [];

  const defaultState = {
    currentWeight: DEFAULT_PROFILE.startWeight,
    weights: [],
    water: { date: "", count: 0 },
    completedWorkouts: [],
    workoutFeedback: {},
    profile: DEFAULT_PROFILE,
    nutrition: DEFAULT_NUTRITION,
    ai: DEFAULT_AI,
    subscription: DEFAULT_SUBSCRIPTION
  };

  let state = loadState();
  let timer = {
    sections: [],
    sectionIndex: 0,
    remaining: 0,
    running: false,
    interval: null,
    sessionDate: "",
    started: false,
    hidden: false
  };

  const $ = (id) => document.getElementById(id);

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        ...defaultState,
        ...saved,
        workoutFeedback: saved.workoutFeedback || {},
        profile: { ...DEFAULT_PROFILE, ...(saved.profile || {}) },
        nutrition: {
          ...DEFAULT_NUTRITION,
          ...(saved.nutrition || {}),
          healthConditions: saved.nutrition?.healthConditions || [],
          meals: saved.nutrition?.meals || []
        },
        ai: { ...DEFAULT_AI, ...(saved.ai || {}) },
        subscription: { ...DEFAULT_SUBSCRIPTION, ...(saved.subscription || {}) }
      };
    } catch {
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function subscriptionIsActive() {
    if (!state.subscription.active || !state.subscription.entitlementToken) return false;
    if (!state.subscription.expiresAt) return true;
    return new Date(state.subscription.expiresAt).getTime() > Date.now();
  }

  function renderSubscription() {
    const active = subscriptionIsActive();
    if (!active && state.subscription.active) {
      state.subscription.active = false;
      state.subscription.entitlementToken = "";
    }
    $("subscriptionPrice").textContent = state.subscription.price || "يظهر السعر من App Store";
    $("subscriptionStatus").textContent = active
      ? `✓ اشتراك المدرب الذكي فعال${state.subscription.expiresAt ? ` حتى ${formatArabicDate(new Date(state.subscription.expiresAt))}` : ""}`
      : "الخطة العادية مجانية · المدرب الذكي غير مشترك";
    $("subscriptionStatus").classList.toggle("active", active);
    $("requestAiPlanBtn").textContent = active
      ? "حلّل تقدمي واقترح خطة"
      : "اشترك واستخدم المدرب الذكي";
  }

  function subscriptionEndpoint() {
    const aiEndpoint = state.ai.endpoint.trim() || (window.cordova ? "" : "/api/ai-plan");
    if (!aiEndpoint) return "";
    return aiEndpoint.replace(/\/api\/ai-plan\/?$/, "/api/subscription/verify");
  }

  async function verifySubscriptionTransaction(transactionId) {
    const endpoint = subscriptionEndpoint();
    if (!endpoint || !transactionId) throw new Error("تعذر التحقق من الاشتراك على الخادم");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId,
        productId: AI_SUBSCRIPTION_PRODUCT_ID,
        platform: "apple"
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.active || !data.entitlementToken) {
      throw new Error(data.error || "لم يتم تأكيد الاشتراك");
    }
    state.subscription = {
      ...state.subscription,
      active: true,
      entitlementToken: data.entitlementToken,
      expiresAt: data.expiresAt || ""
    };
    saveState();
    renderSubscription();
    $("subscriptionDialog").close();
    showToast("تم تفعيل اشتراك المدرب الذكي ✦");
  }

  function initializePurchases() {
    if (!window.CdvPurchase || !window.cordova) return;
    const { store, ProductType, Platform, ErrorCode } = window.CdvPurchase;
    store.register([{
      id: AI_SUBSCRIPTION_PRODUCT_ID,
      platform: Platform.APPLE_APPSTORE,
      type: ProductType.PAID_SUBSCRIPTION
    }]);
    store.when()
      .productUpdated(product => {
        if (product.id !== AI_SUBSCRIPTION_PRODUCT_ID) return;
        const offer = product.getOffer?.();
        state.subscription.price = offer?.pricingPhases?.[0]?.price || product.pricing?.price || "";
        saveState();
        renderSubscription();
      })
      .approved(async transaction => {
        try {
          await verifySubscriptionTransaction(transaction.transactionId);
          transaction.verify();
        } catch (error) {
          showToast(error.message || "تعذر تفعيل الاشتراك");
          transaction.finish?.();
        }
      })
      .verified(receipt => receipt.finish());
    store.error(error => {
      if (error.code !== ErrorCode.PAYMENT_CANCELLED) showToast("تعذر الاتصال بمتجر App Store");
    });
    store.initialize([{ platform: Platform.APPLE_APPSTORE, options: { needAppReceipt: true } }]);
  }

  function openSubscriptionDialog() {
    renderSubscription();
    $("subscriptionDialog").showModal();
  }

  async function purchaseSubscription() {
    if (!window.CdvPurchase || !window.cordova) {
      showToast("الاشتراك متاح داخل تطبيق iOS بعد إعداد المنتج في App Store");
      return;
    }
    const product = window.CdvPurchase.store.get(AI_SUBSCRIPTION_PRODUCT_ID);
    const offer = product?.getOffer?.();
    if (!offer) {
      showToast("لم يتوفر منتج الاشتراك من App Store بعد");
      return;
    }
    const error = await offer.order();
    if (error && error.code !== window.CdvPurchase.ErrorCode.PAYMENT_CANCELLED) {
      showToast("تعذر بدء الاشتراك");
    }
  }

  async function restoreSubscription() {
    if (!window.CdvPurchase || !window.cordova) {
      showToast("استعادة المشتريات متاحة داخل تطبيق iOS");
      return;
    }
    try {
      await window.CdvPurchase.store.restorePurchases();
      showToast("تم طلب استعادة المشتريات");
    } catch {
      showToast("تعذرت استعادة المشتريات");
    }
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

  function generateDailyPlan() {
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    let end = new Date(`${state.profile.targetDate}T12:00:00`);
    if (!Number.isFinite(end.getTime()) || end < start) {
      end = new Date(start);
      end.setDate(end.getDate() + 27);
    }
    const totalDays = clamp(Math.floor((end - start) / 86400000) + 1, 7, 365);
    const typeCycle = ["bikeBands", "matBall", "recovery", "intervals", "circuit", "rest", "treadmill"];
    dailyPlan = Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const progress = totalDays > 1 ? index / (totalDays - 1) : 0;
      const taper = progress > 0.88;
      const week = Math.floor(index / 7) + 1;
      const type = taper ? (index % 2 ? "recovery" : "matBall") : typeCycle[index % typeCycle.length];
      const template = workoutTemplates[type];
      const base = Number(state.profile.sessionMinutes || 30);
      const progressiveMinutes = taper
        ? Math.max(20, Math.round(base * 0.7))
        : Math.round(base * (1 + Math.min(progress, 0.75) * 0.1));
      return {
        ...template,
        date: dateKey(date),
        type,
        minutes: type === "rest" ? Math.max(15, Math.round(base * 0.5)) : progressiveMinutes,
        phase: taper ? "المرحلة الأخيرة · تخفيف" : `الأسبوع ${week} · تدرّج شخصي`,
        adjustments: [
          taper
            ? "حمل خفيف للحفاظ على النشاط والتعافي."
            : `الجلسة مبنية على مدة ${base} دقيقة ومعدّلة تدريجياً حسب الأسبوع.`
        ]
      };
    });
  }

  function currentWorkout() {
    if (!dailyPlan.length) generateDailyPlan();
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
    elliptical: {
      icon: "🏋️", title: "جهاز الإليبتيكال",
      detail: "حركة هوائية منخفضة الصدمات بسرعة مريحة",
      link: ["طريقة استخدام الإليبتيكال", videoSearch("طريقة استخدام جهاز elliptical للمبتدئين")]
    },
    rowingMachine: {
      icon: "🚣", title: "جهاز التجديف",
      detail: "دفع بالساقين ثم سحب الذراعين مع ظهر محايد",
      link: ["طريقة استخدام جهاز التجديف", videoSearch("طريقة استخدام جهاز التجديف للمبتدئين rowing machine")]
    },
    resistance: {
      icon: "💪", title: "الحبال وتمارين المقاومة",
      detail: "سحب الحبل، دفع الصدر، وجلوس وقيام من كرسي",
      link: ["تمارين حبال المقاومة", videoSearch("تمارين حبال المقاومة للمبتدئين resistance bands full body")]
    },
    matBall: {
      icon: "⚫", title: "الحصيرة والكرة الطبية",
      detail: "جسر الحوض، تمرين الطائر، ضغط الكرة، والمشي بها في المكان",
      link: ["تمارين الحصيرة والكرة الطبية", videoSearch("تمارين الكرة الطبية والحصيرة للمبتدئين medicine ball mat")]
    },
    dumbbells: {
      icon: "🏋️", title: "تمارين الدمبل",
      detail: "سكوات خفيف، سحب دمبل، وضغط كتف بتحكم",
      link: ["تمارين دمبل للمبتدئين", videoSearch("تمارين دمبل للمبتدئين جسم كامل")]
    },
    cableMachine: {
      icon: "🔗", title: "جهاز الكيبل",
      detail: "سحب أفقي ودفع صدر بأوزان خفيفة",
      link: ["تمارين جهاز الكيبل للمبتدئين", videoSearch("تمارين جهاز الكيبل للمبتدئين cable machine")]
    },
    bodyweight: {
      icon: "🤸", title: "تمارين وزن الجسم",
      detail: "جلوس وقيام، ضغط على الجدار، وتمرين الطائر",
      link: ["تمارين وزن الجسم للمبتدئين", videoSearch("تمارين وزن الجسم للمبتدئين في المنزل")]
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
    const healthConditions = new Set(state.nutrition.healthConditions || []);

    if (painRecently) {
      adjustment = -2;
      level = "استشفاء وحمل منخفض";
      reason = "تم تخفيف الحمل لأنك سجلت ألماً غير معتاد مؤخراً.";
    } else if (healthConditions.has("heart")) {
      adjustment = -1;
      level = "حمل محافظ لصحة القلب";
      reason = "تم اختيار مرض بالقلب؛ لن يزيد التطبيق الحمل تلقائياً، ويجب الالتزام بتوجيه الطبيب وحدود الجهد المسموحة.";
    } else if (healthConditions.has("jointPain")) {
      adjustment = -1;
      level = "تمرين منخفض الصدمات";
      reason = "تم اختيار إصابة أو ألم بالمفاصل؛ خُفّض الحمل مع تفضيل الدراجة والحركات المضبوطة دون ألم.";
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
    const available = new Set(state.profile.equipment || []);
    const baseMinutes = workout.minutes || Number(state.profile.sessionMinutes) || 30;
    const total = clamp(baseMinutes + profile.adjustment * 5, isRecovery ? 15 : 20, isRecovery ? 25 : 60);
    const warmup = isRecovery ? 3 : 4;
    const mobility = isRecovery ? 7 : 5;
    const strength = isRecovery ? 0 : Math.max(6, Math.round(total * 0.26));
    const cardio = Math.max(6, total - warmup - mobility - strength);
    const cardioOptions = [
      available.has("treadmill") && "treadmill",
      available.has("bike") && "bike",
      available.has("elliptical") && "elliptical",
      available.has("rowingMachine") && "rowingMachine"
    ].filter(Boolean);
    if (!cardioOptions.length) cardioOptions.push("bodyweight");
    const selectedCardio = cardioOptions.slice(0, 2);
    const firstCardioMinutes = selectedCardio.length > 1 ? Math.ceil(cardio * 0.55) : cardio;
    const secondCardioMinutes = cardio - firstCardioMinutes;
    const strengthOptions = [
      available.has("bands") && "resistance",
      available.has("dumbbells") && "dumbbells",
      available.has("cableMachine") && "cableMachine",
      (available.has("medicineBall") || available.has("mat")) && "matBall",
      "bodyweight"
    ].filter(Boolean);
    const strengthKey = strengthOptions[new Date(`${workout.date}T12:00:00`).getDay() % strengthOptions.length];
    const rounds = profile.adjustment > 0 ? 3 : profile.adjustment < 0 ? 1 : 2;
    const reps = profile.adjustment > 0 ? 12 : profile.adjustment < 0 ? 8 : 10;
    const sections = [
      { key: "warmup", minutes: warmup, note: sectionLibrary.warmup.detail },
      { key: selectedCardio[0], minutes: firstCardioMinutes, note: workout.type === "intervals" ? "تناوب بين دقيقتين مريحتين ودقيقة أسرع." : undefined },
      ...(selectedCardio[1] && secondCardioMinutes ? [{ key: selectedCardio[1], minutes: secondCardioMinutes }] : []),
      ...(strength ? [{ key: strengthKey, minutes: strength, note: `${rounds} ${rounds === 1 ? "جولة" : "جولات"} × ${reps} تكرارات لكل حركة.` }] : []),
      { key: "mobility", minutes: mobility, note: sectionLibrary.mobility.detail }
    ].map(section => {
      const result = { ...sectionLibrary[section.key], ...section };
      const customMinutes = Number(state.profile.durationOverrides?.[section.key]);
      if (Number.isFinite(customMinutes) && customMinutes >= 1) {
        result.minutes = clamp(Math.round(customMinutes), 1, 90);
      }
      if (section.key === "matBall") {
        result.instructions = matBallGuides.filter(guide =>
          guide.requires.every(requiredEquipment => available.has(requiredEquipment))
        );
      }
      return result;
    });

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

  function nutritionTargets() {
    const age = Number(state.nutrition.age);
    const height = Number(state.nutrition.height);
    const weight = Number(state.currentWeight);
    const activity = Number(state.nutrition.activity);
    if (!age || !height || !weight || !activity) return null;

    const sexAdjustment = state.nutrition.sex === "female" ? -161 : 5;
    const bmr = 10 * weight + 6.25 * height - 5 * age + sexAdjustment;
    const maintenance = Math.round(bmr * activity);
    const targetDate = new Date(`${state.profile.targetDate}T23:59:59`);
    const days = Math.max(1, Math.ceil((targetDate - new Date()) / 86400000));
    const weightToLose = Math.max(0, weight - Number(state.profile.targetWeight));
    const requestedDeficit = Math.round((weightToLose * 7700) / days);
    const appliedDeficit = Math.min(500, requestedDeficit);
    const aiAdjustment = clamp(Number(state.ai.appliedCalorieAdjustment || 0), -200, 200);
    const calories = Math.max(Math.round(bmr), maintenance - appliedDeficit + aiAdjustment);
    const conditions = new Set(state.nutrition.healthConditions || []);
    const kidneyConcern = conditions.has("kidney");
    const dialysis = conditions.has("dialysis");
    const protein = kidneyConcern && !dialysis ? null : Math.round(weight * (dialysis ? 1.2 : 1.4));
    const carbRatio = state.nutrition.dietStyle === "lowCarb" ? 0.20 : 0.45;
    const carbs = Math.round((calories * carbRatio) / 4);
    const proteinCalories = (protein || Math.round(weight * 0.8)) * 4;
    const fat = Math.max(30, Math.round((calories - proteinCalories - carbs * 4) / 9));
    return {
      bmr: Math.round(bmr),
      maintenance,
      calories,
      protein,
      carbs,
      fat,
      requestedDeficit,
      appliedDeficit,
      aiAdjustment,
      kidneyConcern,
      dialysis
    };
  }

  function todayMeals() {
    const today = dateKey();
    return state.nutrition.meals.filter(meal => meal.date === today);
  }

  function renderNutrition() {
    const targets = nutritionTargets();
    const meals = todayMeals();
    const totals = meals.reduce((sum, meal) => ({
      calories: sum.calories + Number(meal.calories || 0),
      protein: sum.protein + Number(meal.protein || 0),
      carbs: sum.carbs + Number(meal.carbs || 0),
      fat: sum.fat + Number(meal.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    $("caloriesConsumed").textContent = Math.round(totals.calories);
    $("proteinConsumed").textContent = Math.round(totals.protein);
    $("carbsConsumed").textContent = Math.round(totals.carbs);
    $("fatConsumed").textContent = Math.round(totals.fat);

    if (targets) {
      const remaining = Math.max(0, targets.calories - totals.calories);
      const progress = Math.min(100, (totals.calories / targets.calories) * 100);
      $("calorieTarget").textContent = targets.calories;
      $("maintenanceCalories").textContent = targets.maintenance;
      $("caloriesRemaining").textContent = Math.round(remaining);
      $("proteinTarget").textContent = targets.protein ?? "يحدده الطبيب";
      $("carbsTarget").textContent = targets.carbs;
      $("fatTarget").textContent = targets.fat;
      document.querySelector(".calorie-ring").style.setProperty("--calorie-progress", `${progress}%`);
      $("calorieCalculationStatus").textContent = targets.requestedDeficit > 500
        ? "خُفّض العجز إلى حد معتدل؛ قد يحتاج الهدف مدة أطول."
        : targets.aiAdjustment
          ? `تقدير يومي مع تعديل المدرب الذكي ${targets.aiAdjustment > 0 ? "+" : ""}${targets.aiAdjustment} سعرة.`
          : "تقدير يومي مبني على بياناتك ونشاطك.";
      const healthNote = $("healthAwareNote");
      if (targets.kidneyConcern && !targets.dialysis) {
        healthNote.textContent = "بسبب اختيار مشكلة بالكلى أو ارتفاع الكرياتينين، أوقف التطبيق هدف البروتين التلقائي. حدده طبيب الكلى أو اختصاصي التغذية حسب eGFR والبوتاسيوم والفوسفور، ولا ترفع البروتين أو السوائل تلقائياً.";
        healthNote.classList.remove("hidden");
      } else if (targets.dialysis) {
        healthNote.textContent = "احتياجات البروتين والسوائل أثناء الغسيل الكلوي تختلف؛ القيمة المعروضة تقديرية فقط ويجب اعتماد تعليمات فريق الغسيل.";
        healthNote.classList.remove("hidden");
      } else {
        healthNote.classList.add("hidden");
        healthNote.textContent = "";
      }
    } else {
      ["calorieTarget", "maintenanceCalories", "caloriesRemaining", "proteinTarget", "carbsTarget", "fatTarget"].forEach(id => $(id).textContent = "—");
      document.querySelector(".calorie-ring").style.setProperty("--calorie-progress", "0%");
      $("calorieCalculationStatus").textContent = "أكمل العمر والطول لحساب الهدف";
      $("healthAwareNote").classList.add("hidden");
    }

    $("mealHistory").innerHTML = meals.length
      ? meals.slice().reverse().map(meal => `
          <div class="meal-row">
            <span><strong>${meal.name}</strong><small>${Math.round(meal.calories)} سعرة · بروتين ${meal.protein || 0}غ · نشويات ${meal.carbs || 0}غ · دهون ${meal.fat || 0}غ</small></span>
            <button data-meal-id="${meal.id}" aria-label="حذف ${meal.name}">حذف</button>
          </div>
        `).join("")
      : '<p class="empty-state">لم تُسجل وجبات اليوم بعد.</p>';
  }

  function aiProgressSummary() {
    const targets = nutritionTargets();
    const meals = todayMeals();
    const mealTotals = meals.reduce((sum, meal) => ({
      calories: sum.calories + Number(meal.calories || 0),
      protein: sum.protein + Number(meal.protein || 0),
      carbs: sum.carbs + Number(meal.carbs || 0),
      fat: sum.fat + Number(meal.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    const recentWeights = state.weights.slice(-14).map(item => ({
      date: item.date,
      weight: Number(item.weight)
    }));
    const recentFeedback = Object.entries(state.workoutFeedback)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([date, value]) => ({
        date,
        completion: Number(value.completion || 0),
        effort: Number(value.effort || 0),
        pain: Boolean(value.pain)
      }));
    const session = buildSession(currentWorkout());

    return {
      date: dateKey(),
      profile: {
        current_weight_kg: Number(state.currentWeight),
        start_weight_kg: Number(state.profile.startWeight),
        target_weight_kg: Number(state.profile.targetWeight),
        target_date: state.profile.targetDate,
        location: state.profile.location,
        equipment: state.profile.equipment,
        preferred_session_minutes: Number(state.profile.sessionMinutes)
      },
      today_session: session.sections.map(section => ({
        key: section.key,
        title: section.title,
        minutes: section.minutes
      })),
      recent_weights: recentWeights,
      recent_workout_feedback: recentFeedback,
      nutrition: {
        diet_style: state.nutrition.dietStyle,
        age: Number(state.nutrition.age),
        health_conditions: state.nutrition.healthConditions,
        other_health_condition: state.nutrition.otherHealthCondition,
        calculated_targets: targets,
        today_consumed: mealTotals,
        meals_logged_today: meals.length
      },
      safety: {
        request_conservative_progression: true,
        do_not_diagnose_or_change_medication: true
      }
    };
  }

  function signedValue(value, suffix) {
    const number = Number(value || 0);
    return `${number > 0 ? "+" : ""}${number} ${suffix}`;
  }

  function showAiPlan(plan) {
    state.ai.lastPlan = plan;
    saveState();
    $("aiPlanSummary").textContent = plan.summary;
    $("aiPlanAdjustments").innerHTML = `
      <div><small>مدة الجلسة</small><strong>${signedValue(plan.session_minutes_adjustment, "دقائق")}</strong></div>
      <div><small>هدف السعرات</small><strong>${signedValue(plan.calorie_adjustment, "سعرة")}</strong></div>
    `;
    $("aiRecommendations").replaceChildren(...(plan.recommendations || []).map(item => {
      const li = document.createElement("li");
      li.textContent = item;
      return li;
    }));
    $("aiSafetyNote").textContent = plan.safety_note;
    $("aiPlanDialog").showModal();
  }

  async function requestAiPlan() {
    if (!subscriptionIsActive()) {
      openSubscriptionDialog();
      return;
    }
    const endpoint = state.ai.endpoint.trim() || (window.cordova ? "" : "/api/ai-plan");
    if (!endpoint) {
      showToast("أضف رابط خادم الذكاء الاصطناعي من إعداد الحساب");
      openNutritionSettings();
      return;
    }
    if (!nutritionTargets()) {
      showToast("أكمل العمر والطول أولاً ليكون التحليل أدق");
      openNutritionSettings();
      return;
    }

    const button = $("requestAiPlanBtn");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "جارٍ تحليل تقدمك…";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Khutwati-Entitlement": state.subscription.entitlementToken
        },
        body: JSON.stringify(aiProgressSummary())
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.plan) throw new Error(data.error || "تعذر إعداد الاقتراح");
      showAiPlan(data.plan);
    } catch (error) {
      showToast(error.message || "تعذر الاتصال بالمدرب الذكي");
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function applyAiPlan() {
    const plan = state.ai.lastPlan;
    if (!plan) return;
    state.profile.sessionMinutes = clamp(
      Number(state.profile.sessionMinutes) + Number(plan.session_minutes_adjustment || 0),
      20,
      60
    );
    const allowedSections = new Set(buildSession(currentWorkout()).sections.map(section => section.key));
    state.profile.durationOverrides = {
      ...(state.profile.durationOverrides || {})
    };
    for (const section of plan.section_minutes || []) {
      if (allowedSections.has(section.key)) {
        state.profile.durationOverrides[section.key] = clamp(Math.round(Number(section.minutes)), 1, 90);
      }
    }
    state.ai.appliedCalorieAdjustment = clamp(Number(plan.calorie_adjustment || 0), -200, 200);
    dailyPlan = [];
    resetTimerSession();
    saveState();
    $("aiPlanDialog").close();
    render();
    showToast("تم تطبيق توصيات المدرب الذكي ✦");
  }

  function renderExerciseGuide(section) {
    if (!section.instructions?.length) return "";
    return `
      <details class="exercise-guide">
        <summary>طريقة تنفيذ الحركات بالتفصيل</summary>
        <div class="exercise-guide-content">
          ${section.instructions.map(exercise => `
            <article>
              <div class="exercise-guide-title">
                <strong>${exercise.title}</strong>
                <span>${exercise.dose}</span>
              </div>
              <ol>${exercise.steps.map(step => `<li>${step}</li>`).join("")}</ol>
              <a class="exercise-video-button" href="${exercise.video[1]}" target="_blank" rel="noopener">${exercise.video[0]} ↗</a>
            </article>
          `).join("")}
          <p class="exercise-guide-safety">نفّذ الحركات ببطء ومن دون ألم حاد. توقف إذا شعرت بدوار أو ألم في الظهر أو الركبة.</p>
        </div>
      </details>
    `;
  }

  function render() {
    refreshDailyWater();
    generateDailyPlan();
    renderNutrition();
    renderSubscription();
    const now = new Date();
    const targetDate = new Date(`${state.profile.targetDate}T23:59:59`);
    const days = Math.max(0, Math.ceil((targetDate - now) / 86400000));
    const lost = Math.max(0, Number(state.profile.startWeight) - state.currentWeight);
    const total = Number(state.profile.startWeight) - Number(state.profile.targetWeight);
    const progress = total > 0 ? Math.min(100, Math.max(0, (lost / total) * 100)) : 0;
    const workout = currentWorkout();
    const session = buildSession(workout);

    $("todayDate").textContent = formatArabicDate(now);
    $("daysRemaining").textContent = new Intl.NumberFormat("ar").format(days);
    $("goalProgress").style.width = `${progress}%`;
    $("targetWeightTop").textContent = Number(state.profile.targetWeight).toFixed(1);
    $("startWeightTop").textContent = Number(state.profile.startWeight).toFixed(1);
    $("targetDateTop").textContent = formatArabicDate(targetDate);
    $("currentWeightTop").textContent = state.currentWeight.toFixed(1);
    $("currentWeightCard").textContent = state.currentWeight.toFixed(1);
    const waterLiters = state.water.count * WATER_CUP_LITERS;
    const kidneyCondition = (state.nutrition.healthConditions || []).some(condition => ["kidney", "dialysis", "heart"].includes(condition));
    $("waterLiters").textContent = waterLiters.toFixed(2).replace(/\.00$/, ".0");
    $("waterTargetDisplay").textContent = kidneyCondition ? "حسب الطبيب" : WATER_TARGET_LITERS.toFixed(1);
    $("waterCups").textContent = `${state.water.count} أكواب`;
    $("waterGuidanceTitle").textContent = kidneyCondition
      ? "هدف السوائل: يحدده الطبيب"
      : `هدف الماء في التطبيق: ${WATER_TARGET_LITERS.toFixed(1)} لتر`;
    $("waterGuidanceText").textContent = kidneyCondition
      ? "عند وجود مشكلة بالكلى أو غسيل كلوي أو مرض بالقلب، لا يرفع التطبيق كمية الماء تلقائياً. اتبع الكمية التي حددها الطبيب، لأن الحاجة قد تكون أقل أو أكثر حسب التحاليل والأدوية والتورم."
      : "يعادل 8 أكواب × 250 مل. هذا هدف إرشادي؛ قد تحتاج أكثر مع حرارة الكويت أو التعرق والرياضة. إذا وصف لك الطبيب تقييداً للسوائل فاتبع تعليماته.";
    $("lostWeight").textContent = `${lost.toFixed(1)} كجم`;
    $("remainingWeight").textContent = `${Math.max(0, state.currentWeight - Number(state.profile.targetWeight)).toFixed(1)} كجم`;
    $("completedCount").textContent = state.completedWorkouts.length;
    const locationNames = { home: "المنزل", gym: "النادي", both: "المنزل والنادي" };
    $("profileLocation").textContent = locationNames[state.profile.location] || "المنزل";
    $("profileMinutes").textContent = state.profile.sessionMinutes;
    $("profileEquipment").textContent = `${state.profile.equipment.length} ${state.profile.equipment.length === 1 ? "جهاز" : "أجهزة"}`;
    $("workoutTitle").textContent = "جلسة متكاملة";
    $("equipmentIcon").textContent = "✦";
    $("equipmentName").textContent = session.sections.slice(1, -1).map(item => item.title).join(" + ");
    $("workoutMinutes").textContent = session.totalMinutes;
    $("workoutDescription").textContent = `${workout.phase}. ${session.profile.reason}`;
    $("adaptiveLevel").textContent = session.profile.level;
    $("adaptiveReason").textContent = session.profile.reason;
    $("todaySections").innerHTML = session.sections.map(section => `
      <div class="session-section" data-section-key="${section.key}">
        <span class="section-icon">${section.icon}</span>
        <span><strong>${section.title}</strong><small>${section.note || section.detail}</small></span>
        <span class="section-duration-control" aria-label="تعديل مدة ${section.title}">
          <button type="button" data-duration-change="-1" aria-label="خفض مدة ${section.title}">−</button>
          <span class="section-time">${section.minutes} د</span>
          <button type="button" data-duration-change="1" aria-label="زيادة مدة ${section.title}">＋</button>
        </span>
        ${renderExerciseGuide(section)}
      </div>
    `).join("");
    initializeTimer(session);
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
                ${renderExerciseGuide(section)}
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

  function showPage(pageName, updateHash = true) {
    const validPage = ["today", "plan", "nutrition", "progress"].includes(pageName) ? pageName : "today";
    document.querySelectorAll(".app-page").forEach(page => {
      const isActive = page.dataset.page === validPage;
      page.hidden = !isActive;
      page.classList.toggle("active", isActive);
    });
    document.querySelectorAll(".bottom-nav button").forEach(button => {
      const isActive = button.dataset.pageTarget === validPage;
      button.classList.toggle("active", isActive);
      if (isActive) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (updateHash) history.replaceState(null, "", `#${validPage}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll(".cancel-dialog-button").forEach(button => {
    button.addEventListener("click", () => {
      const dialog = button.closest("dialog");
      if (dialog?.open) dialog.close("cancel");
    });
  });

  function openWeightDialog() {
    $("weightInput").value = state.currentWeight.toFixed(1);
    $("weightDialog").showModal();
    setTimeout(() => $("weightInput").select(), 50);
  }

  function initializeTimer(session = buildSession(currentWorkout()), force = false) {
    const today = dateKey();
    if (!force && timer.sessionDate === today && timer.sections.length) return;
    clearInterval(timer.interval);
    timer.sections = session.sections.map(section => ({ ...section }));
    timer.sectionIndex = 0;
    timer.remaining = (timer.sections[0]?.minutes || 1) * 60;
    timer.running = false;
    timer.interval = null;
    timer.sessionDate = today;
    timer.started = false;
    timer.hidden = false;
  }

  function currentTimerSection() {
    return timer.sections[timer.sectionIndex] || null;
  }

  function timerClock(seconds) {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  function updateTimerDisplay(statusMessage) {
    const section = currentTimerSection();
    if (!section) return;
    const clock = timerClock(timer.remaining);
    $("timerValue").textContent = clock;
    $("timerSectionProgress").textContent = `المرحلة ${timer.sectionIndex + 1} من ${timer.sections.length}`;
    $("timerSectionIcon").textContent = section.icon;
    $("timerSectionName").textContent = section.title;
    $("timerSectionInstructions").textContent = section.note || section.detail;
    $("timerSectionDuration").textContent = `مدة المرحلة: ${section.minutes} دقائق`;
    $("timerSectionGuide").innerHTML = renderExerciseGuide(section);
    $("timerToggleBtn").textContent = timer.running ? "إيقاف مؤقت" : (timer.started ? "استمرار" : "ابدأ");
    $("timerNextBtn").textContent = timer.sectionIndex === timer.sections.length - 1 ? "إنهاء الجلسة" : "المرحلة التالية";
    if (statusMessage) $("timerStatus").textContent = statusMessage;
    $("miniTimerIcon").textContent = section.icon;
    $("miniTimerTitle").textContent = section.title;
    $("miniTimerValue").textContent = clock;
    $("miniTimerToggleBtn").textContent = timer.running ? "Ⅱ" : "▶";
    $("miniTimerToggleBtn").setAttribute("aria-label", timer.running ? "إيقاف المؤقت مؤقتاً" : "استمرار المؤقت");
    $("miniTimer").classList.toggle("hidden", !timer.started || !timer.hidden);
  }

  function pauseTimer(message = "المؤقت متوقف مؤقتاً") {
    clearInterval(timer.interval);
    timer.interval = null;
    timer.running = false;
    updateTimerDisplay(message);
  }

  function advanceTimer() {
    navigator.vibrate?.([200, 100, 200]);
    if (timer.sectionIndex >= timer.sections.length - 1) {
      pauseTimer("اكتملت الجلسة! سجّل إنجازك.");
      timer.remaining = 0;
      updateTimerDisplay();
      return;
    }
    timer.sectionIndex += 1;
    timer.remaining = currentTimerSection().minutes * 60;
    updateTimerDisplay(`ابدأ الآن: ${currentTimerSection().title}`);
  }

  function toggleTimer() {
    initializeTimer();
    if (timer.running) return pauseTimer();
    if (timer.remaining <= 0) timer.remaining = currentTimerSection().minutes * 60;
    timer.started = true;
    timer.running = true;
    updateTimerDisplay("المؤقت يعمل ويمكنك إخفاؤه وتصفح التطبيق.");
    timer.interval = setInterval(() => {
      timer.remaining -= 1;
      if (timer.remaining <= 0) advanceTimer();
      else updateTimerDisplay();
    }, 1000);
  }

  function resetCurrentTimerSection() {
    pauseTimer("أُعيدت المرحلة الحالية إلى بدايتها.");
    timer.remaining = currentTimerSection().minutes * 60;
    timer.started = true;
    updateTimerDisplay();
  }

  function resetTimerSession() {
    clearInterval(timer.interval);
    timer.interval = null;
    timer.sections = [];
    timer.sessionDate = "";
    timer.started = false;
    timer.running = false;
    timer.hidden = false;
    $("miniTimer").classList.add("hidden");
  }

  function hideTimerAndBrowse() {
    timer.hidden = true;
    $("timerDialog").close();
    updateTimerDisplay();
  }

  function changeSectionDuration(sectionKey, change) {
    const sessionBefore = buildSession(currentWorkout());
    const sectionBefore = sessionBefore.sections.find(section => section.key === sectionKey);
    if (!sectionBefore) return;
    const nextMinutes = clamp(sectionBefore.minutes + change, 1, 90);
    state.profile.durationOverrides = {
      ...(state.profile.durationOverrides || {}),
      [sectionKey]: nextMinutes
    };
    saveState();

    const updatedSession = buildSession(currentWorkout());
    if (timer.sessionDate === dateKey() && timer.sections.length) {
      timer.sections = updatedSession.sections.map(section => ({ ...section }));
      const activeSection = currentTimerSection();
      if (activeSection?.key === sectionKey) {
        timer.remaining = Math.max(1, timer.remaining + change * 60);
      }
    }
    render();
    showToast(`مدة ${sectionBefore.title}: ${nextMinutes} دقائق`);
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

  $("weightCard").addEventListener("click", openWeightDialog);
  $("progressWeightBtn").addEventListener("click", openWeightDialog);

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
    initializeTimer();
    timer.hidden = false;
    updateTimerDisplay(timer.started ? undefined : "جاهز لبدء المرحلة الأولى");
    $("timerDialog").showModal();
    $("miniTimer").classList.add("hidden");
  });
  $("hideTimerBtn").addEventListener("click", hideTimerAndBrowse);
  $("browseWhileTrainingBtn").addEventListener("click", hideTimerAndBrowse);
  $("timerToggleBtn").addEventListener("click", toggleTimer);
  $("miniTimerToggleBtn").addEventListener("click", toggleTimer);
  $("timerNextBtn").addEventListener("click", advanceTimer);
  $("timerResetBtn").addEventListener("click", resetCurrentTimerSection);
  $("openMiniTimerBtn").addEventListener("click", () => {
    timer.hidden = false;
    updateTimerDisplay();
    $("timerDialog").showModal();
    $("miniTimer").classList.add("hidden");
  });
  $("timerDialog").addEventListener("cancel", event => {
    event.preventDefault();
    hideTimerAndBrowse();
  });

  $("todaySections").addEventListener("click", event => {
    const control = event.target.closest("[data-duration-change]");
    if (!control) return;
    const section = control.closest("[data-section-key]");
    changeSectionDuration(section.dataset.sectionKey, Number(control.dataset.durationChange));
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

  $("showPlanBtn").addEventListener("click", () => showPage("plan"));

  function openNutritionSettings() {
    $("nutritionAge").value = state.nutrition.age;
    $("nutritionHeight").value = state.nutrition.height;
    $("nutritionSex").value = state.nutrition.sex;
    $("nutritionActivity").value = String(state.nutrition.activity);
    $("nutritionDietStyle").value = state.nutrition.dietStyle;
    document.querySelectorAll('input[name="healthCondition"]').forEach(input => {
      input.checked = state.nutrition.healthConditions.includes(input.value);
    });
    $("otherHealthCondition").value = state.nutrition.otherHealthCondition;
    $("aiEndpoint").value = state.ai.endpoint;
    $("nutritionSettingsDialog").showModal();
  }

  $("nutritionSettingsBtn").addEventListener("click", openNutritionSettings);
  $("nutritionSettingsForm").addEventListener("submit", event => {
    event.preventDefault();
    state.nutrition = {
      ...state.nutrition,
      age: Number($("nutritionAge").value),
      height: Number($("nutritionHeight").value),
      sex: $("nutritionSex").value,
      activity: Number($("nutritionActivity").value),
      dietStyle: $("nutritionDietStyle").value,
      healthConditions: Array.from(document.querySelectorAll('input[name="healthCondition"]:checked')).map(input => input.value),
      otherHealthCondition: $("otherHealthCondition").value.trim()
    };
    state.ai.endpoint = $("aiEndpoint").value.trim();
    saveState();
    $("nutritionSettingsDialog").close();
    render();
    showToast("تم حساب هدف السعرات اليومي");
  });

  $("addMealBtn").addEventListener("click", () => {
    $("mealForm").reset();
    ["mealProtein", "mealCarbs", "mealFat"].forEach(id => $(id).value = "0");
    $("mealDialog").showModal();
  });

  $("mealForm").addEventListener("submit", event => {
    event.preventDefault();
    state.nutrition.meals.push({
      id: `${Date.now()}`,
      date: dateKey(),
      name: $("mealName").value.trim(),
      calories: Number($("mealCalories").value),
      protein: Number($("mealProtein").value || 0),
      carbs: Number($("mealCarbs").value || 0),
      fat: Number($("mealFat").value || 0)
    });
    saveState();
    $("mealDialog").close();
    render();
    showToast("تم تسجيل الوجبة");
  });

  $("mealHistory").addEventListener("click", event => {
    const button = event.target.closest("[data-meal-id]");
    if (!button) return;
    state.nutrition.meals = state.nutrition.meals.filter(meal => meal.id !== button.dataset.mealId);
    saveState();
    render();
    showToast("تم حذف الوجبة");
  });

  $("requestAiPlanBtn").addEventListener("click", requestAiPlan);
  $("subscribeBtn").addEventListener("click", purchaseSubscription);
  $("restoreSubscriptionBtn").addEventListener("click", restoreSubscription);
  $("applyAiPlanBtn").addEventListener("click", applyAiPlan);
  ["closeAiPlanBtn", "dismissAiPlanBtn"].forEach(id => {
    $(id).addEventListener("click", () => $("aiPlanDialog").close());
  });

  function openProfileDialog() {
    $("profileStartWeight").value = Number(state.profile.startWeight).toFixed(1);
    $("profileTargetWeight").value = Number(state.profile.targetWeight).toFixed(1);
    $("profileTargetDate").value = state.profile.targetDate;
    $("profileTargetDate").min = dateKey();
    $("profileSessionMinutes").value = String(state.profile.sessionMinutes);
    const locationInput = document.querySelector(`input[name="location"][value="${state.profile.location}"]`);
    if (locationInput) locationInput.checked = true;
    document.querySelectorAll('input[name="equipment"]').forEach(input => {
      input.checked = state.profile.equipment.includes(input.value);
    });
    $("profileDialog").showModal();
  }

  $("settingsBtn").addEventListener("click", openProfileDialog);
  $("editProfileBtn").addEventListener("click", openProfileDialog);

  document.querySelectorAll('input[name="location"]').forEach(input => {
    input.addEventListener("change", event => {
      if (!["gym", "both"].includes(event.target.value)) return;
      ["treadmill", "bike", "dumbbells", "cableMachine", "elliptical", "rowingMachine", "mat"].forEach(value => {
        const option = document.querySelector(`input[name="equipment"][value="${value}"]`);
        if (option) option.checked = true;
      });
    });
  });

  $("profileForm").addEventListener("submit", event => {
    event.preventDefault();
    const equipment = Array.from(document.querySelectorAll('input[name="equipment"]:checked')).map(input => input.value);
    if (!equipment.length) equipment.push("bodyweight");
    const startWeight = Number($("profileStartWeight").value);
    const targetWeight = Number($("profileTargetWeight").value);
    if (targetWeight >= startWeight) {
      showToast("يجب أن يكون الوزن المستهدف أقل من وزن البداية");
      return;
    }
    state.profile = {
      startWeight,
      targetWeight,
      targetDate: $("profileTargetDate").value,
      sessionMinutes: Number($("profileSessionMinutes").value),
      location: document.querySelector('input[name="location"]:checked')?.value || "home",
      equipment,
      durationOverrides: state.profile.durationOverrides || {}
    };
    if (!state.weights.length) state.currentWeight = startWeight;
    dailyPlan = [];
    resetTimerSession();
    saveState();
    $("profileDialog").close();
    render();
    showToast("تم بناء خطة جديدة حسب إعداداتك ✦");
  });

  document.querySelectorAll(".bottom-nav button").forEach(button => {
    button.addEventListener("click", () => {
      showPage(button.dataset.pageTarget);
    });
  });

  $("shareBtn").addEventListener("click", async () => {
    const targetDate = new Intl.DateTimeFormat("ar-KW", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${state.profile.targetDate}T12:00:00`));
    const text = `هدفي في خطوتي: الوصول من ${Number(state.profile.startWeight).toFixed(1)} إلى ${Number(state.profile.targetWeight).toFixed(1)} كجم بحلول ${targetDate}. وزني الحالي ${state.currentWeight.toFixed(1)} كجم.`;
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
    showPage(location.hash.replace("#", "") || "today", false);
    if ("serviceWorker" in navigator && !window.cordova) {
      navigator.serviceWorker.register("service-worker.js?v=14").catch(() => {});
    }
  });

  document.addEventListener("deviceready", initializePurchases, { once: true });
})();
