# 5. شجرة الملفات الأولية

تُنشأ فعليًا في المرحلة الثانية. مبنية على بنية §35 من المتطلبات مع تكييفها لواقع Expo Router والوحدات الأصلية:

```
scanpro/
├── app/                          # Expo Router — شاشات فقط، لا منطق
│   ├── _layout.tsx               # الجذر: الثيم، i18n، بوابة القفل، مزود الخدمات
│   ├── (onboarding)/
│   │   ├── index.tsx             # صفحات التعريف
│   │   └── permissions.tsx
│   ├── (main)/
│   │   ├── _layout.tsx           # التبويبات الرئيسية
│   │   ├── index.tsx             # الشاشة الرئيسية
│   │   ├── search.tsx
│   │   ├── folders/[folderId].tsx
│   │   ├── favorites.tsx
│   │   └── trash.tsx
│   ├── scan/
│   │   ├── index.tsx             # اختيار نوع المسح + تشغيل الماسح الأصلي
│   │   ├── review.tsx            # إدارة الصفحات الملتقطة
│   │   ├── crop/[pageId].tsx     # تعديل الزوايا اليدوي
│   │   ├── filters/[pageId].tsx
│   │   └── save.tsx              # الحفظ: الاسم، المجلد، خيارات PDF
│   ├── document/
│   │   ├── [id]/index.tsx        # عرض المستند
│   │   ├── [id]/ocr.tsx
│   │   ├── [id]/info.tsx
│   │   └── [id]/export.tsx
│   ├── settings/
│   │   ├── index.tsx
│   │   ├── security.tsx
│   │   ├── storage.tsx
│   │   ├── privacy-policy.tsx
│   │   ├── terms.tsx
│   │   └── support.tsx
│   └── lock.tsx                  # شاشة القفل البيومتري/PIN
│
├── src/
│   ├── components/               # مكونات نظام التصميم القابلة لإعادة الاستخدام
│   │   ├── ui/                   # Button, Card, EmptyState, ErrorState, ...
│   │   └── document/             # DocumentCard, PageThumbnail, ...
│   ├── features/                 # منطق الميزات (hooks + orchestration)
│   │   ├── scanner/
│   │   ├── documents/
│   │   ├── folders/
│   │   ├── ocr/
│   │   ├── pdf/
│   │   ├── search/
│   │   ├── security/
│   │   └── settings/
│   ├── services/                 # واجهات + تنفيذات الخدمات
│   │   ├── container.ts          # تركيب الخدمات (DI بسيط) + Fakes للاختبار
│   │   ├── scanner/              # ScannerService → الوحدة الأصلية
│   │   ├── image-processing/
│   │   ├── ocr/                  # OcrService + providers (vision|mlkit|tesseract)
│   │   ├── pdf/
│   │   ├── storage/              # ملفات القرص + الحصص + التنظيف
│   │   ├── jobs/                 # JobRunner + queue فوق processing_jobs
│   │   ├── analytics/
│   │   └── notifications/
│   ├── database/
│   │   ├── db.ts                 # فتح القاعدة + تهيئة
│   │   ├── migrations/           # 001_init.ts, 002_..., مرقمة تصاعديًا
│   │   ├── repositories/         # documentsRepo, pagesRepo, foldersRepo, ...
│   │   └── search/               # التطبيع العربي + استعلامات FTS
│   ├── store/                    # مخازن Zustand الصغيرة
│   ├── localization/
│   │   ├── i18n.ts
│   │   ├── ar.json
│   │   └── en.json
│   ├── theme/                    # ألوان، خطوط، مسافات، فاتح/داكن
│   ├── errors/                   # AppError + أكواد الأخطاء المصنفة
│   ├── logging/
│   ├── utils/
│   ├── types/
│   └── constants/
│
├── modules/                      # Expo Modules الأصلية (Swift/Kotlin)
│   ├── scanpro-scanner/
│   ├── scanpro-image/
│   ├── scanpro-ocr/
│   └── scanpro-privacy/
│
├── tests/
│   ├── unit/
│   ├── integration/              # قاعدة البيانات، PDF، OCR بعينات غير حساسة
│   └── e2e/                      # Maestro flows (رحلة §38 كاملة)
│
├── assets/                       # أيقونة، splash، خط عربي (مثل IBM Plex Sans Arabic)
├── docs/
│   └── decisions.md              # سجل القرارات التقنية (ADR مبسط)
├── app.config.ts                 # إعدادات Expo + بيئات dev/staging/prod
├── .env.example
├── eas.json                      # ملفات بناء EAS للبيئات الثلاث
├── tsconfig.json                 # strict: true
├── .eslintrc.cjs / .prettierrc
└── README.md
```

ملاحظات:

- **`app/` نحيف دائمًا:** الشاشة تستدعي hook من `features/` وترسم. أي شاشة تتجاوز ~200 سطر إشارة لمنطق تسرب إلى UI.
- **`modules/` داخل المستودع** وليس حزمًا خارجية — تُبنى مع التطبيق عبر Expo prebuild، وتسهل مراجعتها واختبارها.
- شاشات المزامنة/الحساب/الاشتراك غير موجودة في شجرة 1.0 عمدًا — تُضاف مجلداتها في إصداراتها (قاعدة: لا شاشات لا تعمل).
