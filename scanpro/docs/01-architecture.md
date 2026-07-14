# 1. التصور المعماري الكامل

## 1.1 المبدأ الحاكم

**محرك المسح هو المنتج.** كل قرار معماري يُقاس بسؤال واحد: هل يحمي جودة وموثوقية خط أنابيب (التقاط → اكتشاف حواف → تصحيح منظور → تحسين → PDF → OCR)؟ الشاشات والمزايا الثانوية تُبنى حول هذا الخط، لا العكس.

## 1.2 الطبقات

```
┌─────────────────────────────────────────────────────────┐
│  UI Layer (Expo Router screens + components)            │
│  عرض فقط. لا منطق أعمال. لا وصول مباشر للتخزين.          │
├─────────────────────────────────────────────────────────┤
│  Feature Layer (features/*)                             │
│  hooks + منطق كل ميزة (scanner, documents, ocr, ...)    │
│  يتحدث مع Services عبر واجهات Interfaces فقط.            │
├─────────────────────────────────────────────────────────┤
│  Services Layer (services/*)                            │
│  camera, image-processing, ocr, pdf, storage, sync,     │
│  jobs, analytics, security — كل خدمة خلف Interface.     │
├─────────────────────────────────────────────────────────┤
│  Data Layer (database/*)                                │
│  SQLite + Repositories + Migrations + FTS5.             │
│  Repository Pattern: لا SQL خارج هذه الطبقة أبدًا.       │
├─────────────────────────────────────────────────────────┤
│  Native Layer (Expo Modules: Swift / Kotlin)            │
│  VisionKit / ML Kit / Vision OCR / Core Image / OpenCV  │
└─────────────────────────────────────────────────────────┘
```

قواعد صارمة بين الطبقات:

1. الاتجاه دائمًا من الأعلى إلى الأسفل. لا تستورد خدمة شيئًا من `features/` أو `app/`.
2. كل خدمة أصلية خلف واجهة TypeScript (`OcrService`, `EdgeDetectionService`, `PdfService`...) مع تنفيذ حقيقي وتنفيذ Fake للاختبارات. هذا هو حقن التبعيات العملي المطلوب — Container بسيط (كائن `services` يُركَّب عند الإقلاع) دون مكتبة DI ثقيلة.
3. لا نص عربي/إنجليزي داخل المكونات — كل النصوص من `localization/` (i18next).

## 1.3 خط أنابيب المسح (Scan Pipeline)

الرحلة الحرجة، وكل خطوة فيها لها حالة قابلة للاستئناف:

```
Camera/Native Scanner
   │ (صورة أصلية → حفظ فوري على القرص + سجل draft في DB)
   ▼
Edge Detection ──► Crop UI (تعديل يدوي للزوايا)
   │
   ▼
Perspective Correction (أصلي: Core Image / OpenCV)
   │ (النسخة المعالجة ملف جديد؛ الأصل لا يُمس)
   ▼
Enhancement / Filters (أصلي، مع معاينة مصغرة سريعة)
   │
   ▼
Page saved (document_pages) ──► Thumbnail job
   │
   ├──► PDF Generation job (عند الطلب)
   └──► OCR job (تلقائي أو عند الطلب) ──► FTS index
```

قرارات جوهرية في الخط:

- **الأصل مقدّس:** `originalImagePath` لا يُستبدل أبدًا؛ كل معالجة تنتج `processedImagePath` جديدًا. التراجع = إعادة معالجة من الأصل. حذف الأصول خيار صريح في إدارة التخزين فقط.
- **مسودة دائمة:** بمجرد أول التقاط يُنشأ Document بحالة `draft` في SQLite. إغلاق التطبيق أثناء المسح لا يفقد شيئًا — عند الفتح تُعرض المسودة للاستكمال.
- **المعالجة الثقيلة كلها خارج JS thread:** التصحيح والفلاتر وOCR وPDF تعمل في كود أصلي/خيوط خلفية، وJS يستقبل تقدمًا (progress events) فقط.

## 1.4 نظام المهام الخلفية (Jobs)

جدول `processing_jobs` في SQLite هو مصدر الحقيقة، وليس الذاكرة:

- كل مهمة: `type` (thumbnail | enhance | ocr | pdf | compress | cleanup | sync)، `status` (queued | running | done | failed | canceled)، `progress`، `attempts`، `error`، `payload` JSON.
- منفّذ (JobRunner) واحد بالتزامن المحدود (مثلاً 2 مهام صور متوازية كحد أقصى) لحماية الذاكرة.
- عند إقلاع التطبيق: أي مهمة `running` تُعاد إلى `queued` إن كانت آمنة الإعادة (كل مهامنا idempotent لأن المخرجات ملفات جديدة)، أو `failed` مع رسالة.
- الإلغاء تعاوني: علم cancel يُفحص بين الخطوات الأصلية.

## 1.5 نموذج الأخطاء (Typed Errors)

فئة `AppError` واحدة بحقول: `code` (union مصنّف: `CAMERA_PERMISSION_DENIED`, `EDGE_DETECTION_FAILED`, `OCR_UNSUPPORTED_LANGUAGE`, `PDF_ENCRYPTION_UNAVAILABLE`, `STORAGE_FULL`, ...)، `recoverable` (هل يُعرض زر إعادة المحاولة؟)، `cause`. 

- كل كود خطأ له مفتاح ترجمة مقابل في ملفات i18n — لا رسائل خطأ مكتوبة يدويًا في UI.
- Logger منظم بثلاث قواعد أمان: لا محتوى مستندات، لا نص OCR، لا مسارات ملفات بأسماء شخصية في السجلات المرفوعة (Sentry scrubbing).

## 1.6 إدارة الحالة

- **Zustand** بمخازن صغيرة لكل ميزة (`useScanSessionStore`, `useDocumentsStore`, `useSettingsStore`) — وليس مخزنًا عملاقًا واحدًا.
- الحالة الدائمة في SQLite دائمًا؛ Zustand مرآة/كاش للشاشة الحالية فقط. لا "حقيقة" في الذاكرة.
- الإعدادات في جدول `app_settings` + القيم الحساسة (مفاتيح تشفير، PIN hash) في SecureStore.

## 1.7 التخزين على القرص

```
<AppData>/
  documents/<docId>/
    pages/<pageId>/original.jpg
    pages/<pageId>/processed.jpg
    pages/<pageId>/thumb.jpg
    export/<name>.pdf
  temp/            ← تُنظَّف عند الإقلاع وبمهمة دورية
  trash/           ← ملفات سلة المحذوفات حتى انتهاء مدة الاحتفاظ
```

- أسماء الملفات الداخلية UUIDs — اسم المستند العربي يعيش في DB فقط، فلا مشاكل ترميز أسماء ملفات.
- كل حذف نهائي يمر عبر خدمة واحدة (`StorageService.purge`) تحذف الملف وسجل DB معًا (معاملة منطقية) لمنع الملفات اليتيمة.

## 1.8 الأمان والخصوصية في التصميم

- افتراضيًا: صفر اتصال شبكي لوظائف المسح. أول طلب شبكة يحدث فقط عند تفعيل المستخدم للمزامنة/الاشتراك/OCR السحابي.
- قفل التطبيق: بوابة (Gate) في جذر التنقل — إن كان القفل مفعّلًا لا تُعرض أي شاشة قبل نجاح البيومترية/PIN. إخفاء المعاينة في App Switcher عبر واجهة أصلية (iOS: غطاء عند `sceneWillResignActive`؛ Android: `FLAG_SECURE`).
- تشفير قاعدة البيانات خيار مرحلي: MVP يعتمد Sandbox النظام + قفل التطبيق، ثم SQLCipher عبر op-sqlite عند بناء «قفل مستند محدد» (تفصيل في وثيقة المخاطر §6).

## 1.9 اللغات وRTL

- i18next + expo-localization، ملفا `ar.json` و`en.json` مركزيان.
- التبديل بين RTL/LTR عبر `I18nManager` يتطلب إعادة تشغيل — تجربة مقبولة ومعلنة للمستخدم عند تغيير اللغة.
- كل الأيقونات الاتجاهية (أسهم، back) عبر مكوّن واحد يعكس نفسه حسب الاتجاه؛ ممنوع hardcode لأي `left/right` في الأنماط — تُستخدم `start/end` حصرًا.

## 1.10 قابلية استبدال القرارات

كل نقطة يُحتمل تغييرها لاحقًا معزولة خلف واجهة:

| قرار قابل للتغيير | العزل |
|---|---|
| ماسح أصلي ← كاميرا مخصصة | `ScannerService` interface؛ الشاشات لا تعرف المصدر |
| pdf-lib ← مكتبة أصلية | `PdfService` interface |
| OCR محلي ← سحابي اختياري | `OcrService` مع `OcrProvider` قابل للتبديل |
| expo-sqlite ← op-sqlite/SQLCipher | Repositories فقط تعرف السائق |
| Zustand ← Redux Toolkit | المخازن صغيرة ومحلية لكل ميزة |
