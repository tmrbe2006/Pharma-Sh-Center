# دليل التكامل والبنية التحتية لنظام صيدلية مركز الرعاية (PWA)

يرحب بك هذا الدليل الفني المفصل لتكامل وتشغيل نظام صيدلية مركز ذوي الاحتياجات الخاصة والإعاقة. تم بناء هذا النظام ليكون آمناً وممتثلاً بالكامل لأفضل ممارسات إدارة البيانات الطبية مع دعم كامل للغة العربية والتشغيل المستقل بدون اتصال بالإنترنت (Offline PWA).

---

## 📂 بنية الملفات والأنظمة (File Architecture)

تم توليد وتكامل الملفات التالية في هذا المشروع:

```
├── /index.html                 # واجهة العرض الرئيسية مهيأة بخط "Cairo" وتنسيقات الطباعة الافتراضية
├── /metadata.json               # معلومات ووصف النظام للـ AI Studio
├── /package.json               # حزم التبعيات (تم دمج vite-plugin-pwa و firebase و express)
├── /vite.config.ts             # إعدادات Vite مع دمج الإضافة التلقائية لـ PWA وإدارة التخزين المؤقت للخطوط
├── /server.ts                  # الخادم الخلفي المتكامل (حلول IP الآمنة وتوليد تقارير الذكاء الاصطناعي وبوابة التنبيهات)
├── /firestore.rules            # القواعد الأمنية المصلدة (Hardened Rules) لحماية مجموعات البيانات في Firestore
├── /firebase-blueprint.json    # مخطط قاعدة البيانات المرجعي (Firestore Schema) وتفاصيل الحقول والمجموعات
├── /src/
│   ├── firebase-applet-config.json # إعدادات الاتصال بمشروع Firebase الخاص بك (telme-64b04)
│   ├── firebase.ts             # كود تهيئة واتصال Firebase والتحقق التلقائي الآمن من جودة الاتصال
│   ├── usePWAInstall.ts        # الخطاف البرمجي المطور (Custom Hook) لتتبع ومحاكاة تثبيت التطبيق
│   ├── PWAInstallButton.tsx    # زر تثبيت التطبيق الأنيق متوافق مع Safari (iOS) وأجهزة Android/Desktop
│   ├── OfflineIndicator.tsx    # إشعار ديناميكي مبهج يعلم المستخدم عند انقطاع الاتصال والعمل محلياً
│   ├── App.tsx                 # الواجهة الرسومية الكاملة فائقة الأداء RTL تدعم الوضع المظلم والطباعة
│   └── db/
│       └── mockDb.ts           # مستودع بيانات موحد وهجين يدمج Firestore مع تخزين محلي (LocalStorage) احتياطي
```

---

## 🛡️ القواعد الأمنية المصلدة لـ Firestore (`firestore.rules`)

تم تصميم ملف `firestore.rules` لحماية خصوصية المقيمين ومنع تسريب البيانات، مرتكزاً على المبادئ التالية:
1. **المنع الافتراضي المطلق:** يتم رفض أي قراءة أو كتابة لا تطابق الشروط الصارمة.
2. **صلاحيات مخصصة للأدوار (RBAC):**
   * **المدير (admin):** صلاحيات كاملة لقراءة وإضافة وحذف الأدوية وتتبع جلسات الدخول.
   * **الصيدلي (pharmacist):** يمكنه الإضافة والتحديث والصرف وقراءة التقارير الطبية، ولكن يمنع تماماً من الحذف لمنع اختفاء السجلات.
   * **الفني (technician):** يقتصر عمله على إدخال أدوية جديدة وصرف الجرعات تحت إشراف الصيدلي ومحاكاة المعالجة، ويمنع من الحذف أو تصفح الجلسات الأمنية.
3. **أمان سجلات الصرف:** بمجرد إنشاء سجل الصرف لا يمكن تعديله أو حذفه إلا بواسطة المدير التنفيذي فقط لضمان سلامة التدقيق المالي والطبي.
4. **تجنب تسريب الصلاحيات (Privilege Escalation):** يمنع أي مستخدم عادي من تعديل دوره الوظيفي أو شاشاته المسموحة بشكل ذاتي.

---

## 🤖 تكامل الذكاء الاصطناعي الآمن (White-label Qwen AI Proxy)

تم تصميم عملية طلب التقارير الطبية وتحليل الصلاحية لتعمل بطريقة **White-label آمنة تماماً**:
1. يقوم المتصفح بإرسال بيانات الأدوية الحالية وتواريخ الصلاحية إلى المسار الخلفي الآمن `/api/ai/report` عبر خادم Express.
2. يقوم الخادم (server.ts) باستدعاء نموذج **Gemini 3.8-flash** المتميز باستخدام مكتبة `@google/genai` الرسمية وباستخدام الـ `GEMINI_API_KEY` المخزن في الإعدادات السرية الآمنة للخادم.
3. يتم توجيه أمر للنظام (System Instructions) يلزمه بتقمص دور خبير صيدلي استراتيجي رفيع المستوى، وصياغة تقرير طبي متكامل باللغة العربية الفصحى بدون الإشارة نهائياً إلى مسميات "Google" أو "Gemini" أو "الذكاء الاصطناعي"، لتظهر النتيجة كتحليل فني داخلي ذكي خاص بنظام الصيدلية لمركز الرعاية.

---

## 🔔 كود سحابة فايربيس المجدول للتنبيهات (Firebase Cloud Function)

لتحقيق التنبيه التلقائي المجدول عبر WhatsApp و Email للأدوية التي تقترب صلاحيتها من الانتهاء، يرجى نشر الدالة البرمجية التالية في سحابة مشروع Firebase الخاص بك (`functions/index.js`):

```javascript
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

// يتم تشغيل هذه الدالة تلقائياً يومياً الساعة 8 صباحاً
exports.scheduledExpiryAlerts = functions.pubsub.schedule("0 8 * * *")
  .timeZone("Asia/Riyadh")
  .onRun(async (context) => {
    const today = new Date();
    const warningDays = 30; // حد التنبيه
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + warningDays);

    try {
      // 1. جلب الأدوية القريبة من الانتهاء
      const medsSnapshot = await db.collection("medicines").get();
      const expiringMedicines = [];

      medsSnapshot.forEach((doc) => {
        const data = doc.data();
        const expDate = new Date(data.expiryDate);
        if (expDate > today && expDate <= thresholdDate) {
          expiringMedicines.push({ id: doc.id, ...data });
        }
      });

      if (expiringMedicines.length === 0) {
        console.log("لا توجد أدوية منتهية الصلاحية قريباً اليوم.");
        return null;
      }

      // 2. جلب الصيادلة والمدراء لإرسال التنبيهات لهم
      const usersSnapshot = await db.collection("users")
        .where("role", "in", ["admin", "pharmacist"])
        .get();

      const recipients = [];
      usersSnapshot.forEach((doc) => {
        const u = doc.data();
        if (u.phone || u.email) {
          recipients.push(u);
        }
      });

      // إعداد مرسل البريد الإلكتروني
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_SENDER, // البريد الإلكتروني للمرسل
          pass: process.env.EMAIL_PASSWORD // كلمة سر التطبيق
        }
      });

      // 3. إرسال الإشعارات وتوليد التقارير
      for (const med of expiringMedicines) {
        const textMessage = `تنبيه أمان صيدلية الرعاية: الدواء [${med.commercialName}] (الاسم العلمي: ${med.scientificName}) المتبقي منه ${med.quantity} ${med.unit} تنتهي صلاحيته في ${med.expiryDate}! يرجى اتخاذ اللازم فوراً.`;

        for (const user of recipients) {
          // أ. إرسال إشعار WhatsApp عبر بوابة Twilio أو UltraMsg
          if (user.phone) {
            try {
              await axios.post("https://api.ultramsg.com/instanceXXXX/messages/chat", {
                token: "YOUR_ULTRASMG_TOKEN",
                to: user.phone,
                body: textMessage
              });
              console.log(`تم إرسال تنبيه واتساب للمستخدم: ${user.name}`);
            } catch (whatsappError) {
              console.error("فشل إرسال رسالة الواتساب:", whatsappError.message);
            }
          }

          // ب. إرسال بريد إلكتروني رسمي للسلامة
          if (user.email) {
            try {
              await transporter.sendMail({
                from: '"أمان مخزن صيدلية الرعاية" <no-reply@carecenter.org>',
                to: user.email,
                subject: `⚠️ تنبيه حرج: اقتراب انتهاء صلاحية دواء ${med.commercialName}`,
                text: textMessage,
                html: `<div dir="rtl" style="font-family: Cairo, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                  <h2 style="color: #e11d48;">⚠️ تنبيه انتهاء صلاحية وشيك</h2>
                  <p>يفيد نظام المراقبة التلقائية لصيدلية مركز رعاية ذوي الإعاقة باقتراب انتهاء صلاحية الدواء التالي:</p>
                  <ul>
                    <li><strong>الاسم التجاري:</strong> ${med.commercialName}</li>
                    <li><strong>الاسم العلمي:</strong> ${med.scientificName}</li>
                    <li><strong>الكمية المتوفرة:</strong> ${med.quantity} ${med.unit}</li>
                    <li><strong>تاريخ الانتهاء:</strong> ${med.expiryDate}</li>
                  </ul>
                  <p>يرجى مراجعة سجلات الصرف وجدولة استهلاك هذا الصنف أو نقله لمركز مستفيد آخر لتفادي تلف المواد الدوائية والمالية.</p>
                </div>`
              });
              console.log(`تم إرسال بريد إلكتروني للمستلم: ${user.email}`);
            } catch (emailError) {
              console.error("فشل إرسال البريد الإلكتروني:", emailError.message);
            }
          }
        }
      }

      return true;
    } catch (globalError) {
      console.error("حدث خطأ في معالجة إشعارات الصلاحية المجدولة:", globalError);
      return null;
    }
  });
```

---

## 📈 كيفية تشغيل النظام محلياً (How to Run and Deploy)

النظام مهيأ مسبقاً للعمل الفوري في بيئة AI Studio. يمكنك تجربة كافة ميزاته (بما في ذلك محاكاة الدخول والتحليلات):

1. **تشغيل بيئة التطوير (Dev Server):**
   ```bash
   npm run dev
   ```
   سيقوم الخادم بتشغيل Express وربط واجهات Vite على المنفذ `3000`.

2. **بناء نسخة الإنتاج المستقلة (Production Build):**
   ```bash
   npm run build
   ```
   سيقوم النظام بجمع كود React وإصدار ملفات الـ PWA كاملة داخل مجلد `dist/` بما في ذلك توليد ملفات الـ Service Worker والتخزين المؤقت المستقل.
