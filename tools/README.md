# أداة النشر `deploy`

أمر واحد على الخادم ينشر أي مشروع من مستودعه، من الطرفية أو من اختصار في الجوال.

```
deploy <المشروع> [العملية] [الفرع] [--force] [-- معطيات]
```

يجلب آخر نسخة من مستودع المشروع إلى `/opt/<المشروع>` ثم يشغّل منه `tools/DEPLOY_<العملية>.sh`.

| الأمر | ما يفعله |
|---|---|
| `deploy` | قائمة المشاريع على الخادم |
| `deploy khutwati list` | العمليات المتاحة في المشروع |
| `deploy khutwati homephone` | تشغيل أو تحديث وسيط هاتف المنزل |
| `deploy khutwati homephone-status` | حالة التسجيل على البدالة والجوالات المتصلة |
| `deploy khutwati homephone-logs` | آخر السجلات (`-- push` أو `-- caddy` لخدمة أخرى) |
| `deploy khutwati homephone-stop` | إيقاف الوسيط |
| `deploy LegalMind` | العملية الافتراضية `deploy` لمشروع آخر |

## التنصيب على الخادم (مرة واحدة)

```bash
git clone -b claude/funny-galileo-1a5hln https://github.com/dralmarri/khutwati.git /opt/khutwati
install -m 755 /opt/khutwati/tools/deploy.sh /usr/local/bin/deploy
echo 'DEPLOY_OWNER=dralmarri' > /etc/deploy.conf
```

لتحديث الأداة نفسها لاحقاً أعد السطر الثاني.

## إضافة مشروع أو عملية

أضف في مستودع المشروع ملفاً باسم `tools/DEPLOY_<اسم>.sh`. السطر الثاني منه (`# وصف`) يظهر في `list`. مثال لمشروع يعمل بـDocker:

```bash
#!/usr/bin/env bash
# بناء وتشغيل الخدمة
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose up -d --build 2>&1 | tail -n 15
docker compose ps
```

مشروع موجود مسبقاً في `/opt` يُستخدم كما هو ويبقى على فرعه الحالي. مشروع جديد يُنزَّل تلقائياً عند أول `deploy <اسمه>`.

## قواعد الأمان

- الملفات غير المتتبَّعة في git (`.env`، المفاتيح، البيانات) لا تُمسّ.
- إن وُجد تعديل يدوي على ملف متتبَّع يتوقف النشر ويعرض الملفات. `--force` يتجاهلها ويمحوها.
- عملية واحدة لكل مشروع في الوقت نفسه.
- الأداة تشغّل ما في المستودع بصلاحية المستخدم الذي نادى عليها، فمن يستطيع الرفع إلى المستودع يستطيع تشغيل أوامر على الخادم.
- السجل الكامل لكل مشروع في `/opt/.deploy/logs/`.

## من الجوال (تطبيق Shortcuts)

إجراء **Run Script Over SSH** على الخادم، ونص السكربت:

```
deploy khutwati homephone-status
```

ولاختصار واحد لكل شيء: أضف قبله إجراء **Ask for Input** واجعل السكربت `deploy` متبوعاً بالمُدخل، ثم اكتب عند التشغيل مثلاً `khutwati homephone-logs`.
