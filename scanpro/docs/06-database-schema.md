# 6. نموذج قاعدة البيانات (SQLite)

## 6.1 مبادئ

- SQLite عبر expo-sqlite، مع `PRAGMA journal_mode=WAL` و`PRAGMA foreign_keys=ON`.
- التواريخ أعداد صحيحة (Unix ms). المعرفات UUID v4 نصية تُولَّد في التطبيق.
- الحذف الناعم عبر `deleted_at` للمستندات والمجلدات (سلة المحذوفات)؛ الحذف الصلب بعد انتهاء مدة الاحتفاظ عبر مهمة تنظيف.
- migrations مرقمة تصاعديًا في `database/migrations/`، تعمل داخل معاملة، مع جدول `schema_migrations` يسجل المطبق. لا تعديل على migration منشور أبدًا — دائمًا migration جديد.
- جداول «المستقبل» (users, subscriptions, sync_jobs) **لا تُنشأ في 1.0** — تُضاف بmigrations في إصداراتها. المخطط أدناه يوثقها لاكتمال التصميم مع وسمها بوضوح.

## 6.2 DDL — إصدار 1.0

```sql
-- 001_init.sql

CREATE TABLE folders (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  parent_id     TEXT REFERENCES folders(id) ON DELETE SET NULL, -- NULL في 1.0 (مستوى واحد)
  color         TEXT,
  icon          TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER
);

CREATE TABLE documents (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'draft'      -- draft | ready
                 CHECK (status IN ('draft','ready')),
  scan_type      TEXT NOT NULL DEFAULT 'document',  -- document | receipt | image_import | pdf_import
  folder_id      TEXT REFERENCES folders(id) ON DELETE SET NULL,
  page_count     INTEGER NOT NULL DEFAULT 0,
  file_size      INTEGER NOT NULL DEFAULT 0,        -- بايت، مجموع ملفات المستند
  thumbnail_path TEXT,
  pdf_path       TEXT,                              -- آخر PDF مُصدَّر (إن وجد)
  is_favorite    INTEGER NOT NULL DEFAULT 0,
  is_locked      INTEGER NOT NULL DEFAULT 0,        -- يُفعَّل مع SQLCipher في 1.2
  has_ocr        INTEGER NOT NULL DEFAULT 0,
  ocr_language   TEXT,                              -- 'ar' | 'en' | 'ar+en'
  sync_status    TEXT NOT NULL DEFAULT 'local',     -- local فقط في 1.0
  notes          TEXT,
  metadata       TEXT,                              -- JSON (مؤلف PDF، كلمات مفتاحية...)
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  deleted_at     INTEGER
);
CREATE INDEX idx_documents_folder   ON documents(folder_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_updated  ON documents(updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_deleted  ON documents(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE document_pages (
  id                    TEXT PRIMARY KEY,
  document_id           TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_index            INTEGER NOT NULL,
  original_image_path   TEXT NOT NULL,
  processed_image_path  TEXT,
  thumbnail_path        TEXT,
  crop_coordinates      TEXT,       -- JSON: 4 زوايا بنسب [0..1] لاستقلالها عن الدقة
  rotation              INTEGER NOT NULL DEFAULT 0,   -- 0|90|180|270
  filter                TEXT NOT NULL DEFAULT 'auto',
  enhancement_settings  TEXT,       -- JSON: سطوع/تباين/حدة...
  ocr_text              TEXT,
  ocr_confidence        REAL,       -- متوسط الثقة [0..1]
  ocr_blocks            TEXT,       -- JSON: صناديق الكلمات وثقتها (للتظليل والمراجعة)
  width                 INTEGER,
  height                INTEGER,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,
  UNIQUE (document_id, page_index)
);
CREATE INDEX idx_pages_document ON document_pages(document_id, page_index);

CREATE TABLE tags (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  color      TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE document_tags (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

CREATE TABLE processing_jobs (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,      -- thumbnail|enhance|ocr|pdf|compress|cleanup
  status       TEXT NOT NULL DEFAULT 'queued'
               CHECK (status IN ('queued','running','done','failed','canceled')),
  payload      TEXT NOT NULL,      -- JSON: documentId/pageId/خيارات
  progress     REAL NOT NULL DEFAULT 0,
  attempts     INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error        TEXT,
  started_at   INTEGER,
  finished_at  INTEGER,
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_jobs_status ON processing_jobs(status, created_at);

CREATE TABLE app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,        -- JSON دائمًا
  updated_at INTEGER NOT NULL
);

CREATE TABLE exports (              -- سجل التصدير/المشاركة (لعرض "المُصدَّر مؤخرًا")
  id          TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  format      TEXT NOT NULL,        -- pdf|jpeg|png|txt
  destination TEXT,                 -- share|print|files
  created_at  INTEGER NOT NULL
);

CREATE TABLE schema_migrations (
  version    INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
```

## 6.3 البحث النصي — FTS5 مع تطبيع عربي

```sql
-- جدول ظل يفهرس نصًا مُطبَّعًا (التطبيع في TypeScript قبل الإدراج)
CREATE VIRTUAL TABLE search_index USING fts5(
  document_id UNINDEXED,
  title_norm,          -- الاسم بعد التطبيع
  notes_norm,
  tags_norm,
  ocr_norm,            -- نص OCR لكل المستند بعد التطبيع
  tokenize = "unicode61 remove_diacritics 2"
);
```

دالة التطبيع العربي (`database/search/normalizeArabic.ts`) تُطبَّق على **النص المفهرس والاستعلام معًا**:
- إزالة التشكيل والتطويل (ـ).
- توحيد الألف (أ إ آ ← ا)، والتاء المربوطة (ة ← ه)، والألف المقصورة (ى ← ي).
- توحيد الأرقام (٠١٢ ← 012).

المزامنة مع الجدول الأصلي عبر كود الـ Repository (وليس triggers) لأن التطبيع يتم في JS: كل كتابة على documents/pages/tags تحدّث `search_index` في نفس المعاملة المنطقية.

## 6.4 جداول الإصدارات اللاحقة (موثقة، لا تُنشأ في 1.0)

| الجدول | الإصدار | ملاحظات |
|---|---|---|
| `annotations` | 1.1 | عناصر التوقيع/الرسم لكل صفحة (JSON للنوع والإحداثيات)؛ Redaction يُخزَّن كعملية مطبقة لا كعنصر قابل للإزالة |
| `signatures` | 1.1 | توقيعات محفوظة (مسار صورة PNG شفافة) |
| `deleted_items` | — | غير مطلوب كجدول: الحذف الناعم عبر `deleted_at` أبسط وأامن |
| `users` | 2.0 | حساب اختياري للمزامنة |
| `subscriptions` | 1.1 | كاش حالة RevenueCat (المصدر الحقيقي RevenueCat) |
| `sync_jobs` | 2.0 | طابور المزامنة التدريجية + حل التعارضات |

## 6.5 قرارات تصميم تستحق التوثيق

1. **`crop_coordinates` بنسب لا ببكسلات** — تبقى صحيحة لو أعيد توليد الصور بدقة مختلفة.
2. **`ocr_blocks` JSON في نفس الصف** بدل جدول `ocr_results` منفصل — علاقة 1:1 مع الصفحة، وقراءته دائمًا مع الصفحة؛ جدول منفصل تعقيد بلا فائدة. يُعاد النظر إن أضفنا تعدد لغات لكل صفحة.
3. **`page_count`/`file_size` denormalized** في documents — تُحدَّث عند كل تعديل صفحات، لأن قوائم المستندات أهم مسار قراءة.
4. **UUIDs لا AUTOINCREMENT** — جاهزية للمزامنة (2.0) دون إعادة ترقيم، وأمان دمج النسخ.
