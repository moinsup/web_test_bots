// 1. إعدادات لوحة التحكم (انسخ رابط الـ Webhook الخاص بالديسكورد وضعه هنا)
const DISCORD_WEBHOOK_URL = "ضع_رابط_الـ_WEBHOOK_هنا";

// 2. النظام المركزي لجمع البيانات والمراقبة
const SecuritySystem = {
    userData: {
        ipAddress: "جاري الفحص...",
        deviceInfo: navigator.userAgent,
        status: "سليم", // تتغير تلقائياً إلى "مبند" إذا فشل في الاختبارات
        bannedAtStage: "لم يتم التبنيد",
        banReason: "لا يوجد"
    },
    metrics: {
        mouseMovements: 0,
        keyPresses: 0,
        stageStartTime: Date.now()
    },
    currentStageNumber: 0
};

// 3. جلب الـ IP الخاص بالزائر فور دخوله
async function fetchUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        SecuritySystem.userData.ipAddress = data.ip;
        console.log("تم كشف الـ IP بنجاح.");
    } catch (error) {
        SecuritySystem.userData.ipAddress = "غير معروف (قد يستخدم حامي آيبي أو VPN)";
    }
}

// 4. مستشعرات السلوك البشرية (تحليل الحركة والكتابة)
document.addEventListener('mousemove', () => {
    SecuritySystem.metrics.mouseMovements++;
});

document.addEventListener('keydown', () => {
    SecuritySystem.metrics.keyPresses++;
});

// 5. خوارزمية فحص البوتات المتدرجة (تشتغل عند الانتقال بين الصفحات)
function runSecurityCheck() {
    // إذا تم تبنيده في مرحلة سابقة، نتركه يكمل بصمت دون إعادة فحص
    if (SecuritySystem.userData.status === "مبند") return;

    const timeSpentOnStage = Date.now() - SecuritySystem.metrics.stageStartTime;
    const honeypotValue = document.getElementById('fake-phone').value;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    let isBot = false;
    let reason = "";

    // الفخ الأول: مصيدة العسل (Honeypot)
    if (honeypotValue.length > 0) {
        isBot = true;
        reason = "وقع في فخ الحقل المخفي (Honeypot)";
    }
    // الفخ الثاني: فخ السرعة الزمنية (Time Trap)
    else if (timeSpentOnStage < 1500 && SecuritySystem.currentStageNumber > 0) {
        isBot = true;
        reason = `سرعة إدخال غير بشرية (${timeSpentOnStage}ms)`;
    }
    // الفخ الثالث: انعدام حركة الفأرة (للكمبيوتر)
    else if (!isMobile && SecuritySystem.metrics.mouseMovements < 3 && SecuritySystem.currentStageNumber > 0) {
        isBot = true;
        reason = "تحليل السلوك: انعدام حركة الفأرة الطبيعية";
    }

    // تطبيق التبنيد الصامت (Shadow Ban)
    if (isBot) {
        SecuritySystem.userData.status = "مبند";
        SecuritySystem.userData.bannedAtStage = `المرحلة ${SecuritySystem.currentStageNumber}`;
        SecuritySystem.userData.banReason = reason;
        console.warn("⚠️ [D.S.S.C Security]: تم رصد سلوك مشبوه وتبنيد الهدف صمتاً.");
    }

    // إعادة تعيين العدادات للمرحلة التالية
    SecuritySystem.metrics.mouseMovements = 0;
    SecuritySystem.metrics.stageStartTime = Date.now();
}

// 6. التحكم في التنقل بين مراحل الصفحة
function processStage(targetStageId) {
    runSecurityCheck(); // فحص المرحلة الحالية قبل المغادرة

    // إخفاء الأقسام وإظهار القسم الجديد
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const targetPage = document.getElementById(targetStageId);
    targetPage.classList.add('active');

    // تحديث رقم المرحلة الحالية
    SecuritySystem.currentStageNumber = parseInt(targetPage.getAttribute('data-stage'));
}

// 7. إرسال التقرير النهائي إلى لوحة تحكم ديسكورد
function sendReportToDashboard(userData) {
    // تخصيص الألوان: أحمر للبوت (تنبيه خطير)، أخضر للبشري (ناجح)
    const embedColor = userData.status === "مبند" ? 16711680 : 65280; 
    const title = userData.status === "مبند" ? "🚨 تم اصطياد بوت وتقييده!" : "✅ مستخدم بشري تجاوز التحدي";

    const payload = {
        embeds: [{
            title: title,
            color: embedColor,
            fields: [
                { name: "الآيبي (IP)", value: userData.ipAddress, inline: true },
                { name: "حالة الفحص", value: userData.status, inline: true },
                { name: "سبب التبنيد", value: userData.banReason, inline: false },
                { name: "المرحلة التي سقط فيها", value: userData.bannedAtStage, inline: true },
                { name: "معلومات جهاز الزائر", value: userData.deviceInfo, inline: false }
            ],
            footer: { text: "نظام الرصد الذكي لـ D.S.S.C" },
            timestamp: new Date().toISOString()
        }]
    };

    // إرسال البيانات فوراً إلى السيرفر الخاص بك
    fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).then(() => console.log("تم تحديث لوحة التحكم بنجاح."))
      .catch(err => console.error("فشل إرسال التقرير للوحة التحكم:", err));
}

// 8. زر النجاح النهائي
function completeProcess() {
    runSecurityCheck(); // الفحص النهائي الأخير

    // إرسال البيانات الحية للديسكورد
    sendReportToDashboard(SecuritySystem.userData);

    // إظهار ردود فعل وهمية أو حقيقية بناءً على النتيجة
    if (SecuritySystem.userData.status === "مبند") {
        alert("تمت العملية بنجاح تامة!"); // خداع البوت ليظن أنه نجح
    } else {
        alert("أзд تم التحقق بنجاح! أنت مستخدم بشري حقيقي.");
    }
}

// تشغيل جلب الآيبي عند فتح الموقع
window.onload = () => {
    fetchUserIP();
};