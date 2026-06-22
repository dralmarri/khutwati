# خطوتي

تطبيق عربي RTL لمتابعة خفض الوزن من **82.7 كجم** إلى **77.5 كجم** بحلول **15 يوليو 2026**.

## المميزات

- خطة يومية مؤرخة من 22 يونيو إلى 15 يوليو 2026.
- جلسة يومية متكاملة تضم المشي والدراجة والمقاومة والتمدد.
- محرك تكيّف محلي يعدّل المدة والجولات بناءً على الإنجاز والجهد والألم المسجل.
- تصاعد تدريجي في مدة التمرين والجولات، ثم تخفيف قبل يوم الهدف.
- تمارين تستخدم جهاز المشي والدراجة والحصيرة وحبال المقاومة والكرة الطبية.
- صور وروابط فيديو تعليمية لكل نوع من التمارين.
- تسجيل الوزن وعرض سجل التقدم.
- متابعة الماء باللتر، بهدف إرشادي 2 لتر يومياً.
- مؤقت للتمرين وتسجيل إكمال تمرين اليوم.
- حفظ محلي باستخدام `localStorage`.
- لا تُرسل بيانات الوزن أو التمرين إلى أي خادم خارجي.
- دعم PWA والعمل دون اتصال.
- مشروع iOS جاهز لـXcode باستخدام Apache Cordova.

## تشغيل نسخة الويب

```bash
npm install
npm run web:serve
```

ثم افتح:

```text
http://localhost:4173
```

## تجهيز iOS باستخدام Apache Cordova

يتطلب جهاز Mac وXcode.

```bash
npm install
npx cordova platform add ios
npx cordova prepare ios
npx cordova build ios
open platforms/ios/*.xcworkspace
```

إذا لم يوجد ملف workspace:

```bash
open platforms/ios/*.xcodeproj
```

## تجهيز Android لاحقاً

يتطلب Android Studio وAndroid SDK وJava.

```bash
npm install
npx cordova platform add android
npx cordova prepare android
npx cordova build android
```

لفتح المشروع في Android Studio:

```bash
open -a "Android Studio" platforms/android
```

مجلد الموقع الجاهز للنشر هو `www`.
