const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// مخازن مؤقتة في الذاكرة (يمكن استبدالها بقاعدة بيانات لاحقاً)
let bannedIPs = new Set();
let successfulBots = [];

// ميدل وير لفحص ما إذا كان الآي بي محظوراً مسبقاً
app.use((req, res, next) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (bannedIPs.has(clientIp)) {
        return res.status(403).send(`<h1>عذراً، تم حظرك تلقائياً!</h1><p>IP الخاص بك: ${clientIp} مصنف كبوت فاشل.</p>`);
    }
    next();
});

// عرض صفحة تسجيل الدخول
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// معالجة محاولة تسجيل الدخول وفحص العقبات المتدرجة
app.post('/login', (req, res) => {
    const { username, password, dob, honeypot, clickTimestamps, loadTime } = req.body;
    
    // جلب معلومات الجهاز والآي بي
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const submitTime = Date.now();

    console.log(`\n--- محاولة دخول جديدة من IP: ${clientIp} ---`);
    console.log(`نوع الجهاز (User-Agent): ${userAgent}`);

    // تحليل الفواصل الزمنية بين الكليكات
    let timestamps = [];
    let delays = [];
    if (clickTimestamps) {
        try {
            timestamps = JSON.parse(clickTimestamps);
            for (let i = 1; i < timestamps.length; i++) {
                delays.push(timestamps[i] - timestamps[i-1]);
            }
            console.log(`الفواصل الزمنية بين النقرات (بالملي ثانية):`, delays);
        } catch (e) {
            console.log("فشل في تحليل بيانات النقرات.");
        }
    }

    // ================= العقبات المتدرجة =================

    // العقبة 1: فخ الحقل المخفي (Honeypot)
    // البشر لا يرونه وبالتالي لن يملؤوه، البوتات الغبية ستملأه تلقائياً
    if (honeypot) {
        console.log(`[فشل - العقبة 1] البوت وقع في فخ الحقل المخفي!`);
        bannedIPs.add(clientIp);
        return triggerBan(res, clientIp, userAgent, "تعبئة حقل الفخ المخفي");
    }

    // العقبة 2: السرعة الخارقة (Time-to-Submit)
    // إذا تم فتح الصفحة وإرسال النموذج في أقل من 2.5 ثانية، فهو بالتأكيد بوت سريع
    const timeTaken = submitTime - parseInt(loadTime || 0);
    console.log(`الوقت المستغرق لإرسال النموذج: ${timeTaken} ملي ثانية`);
    if (timeTaken < 2500) {
        console.log(`[فشل - العقبة 2] الإرسال سريع جداً بشكل غير بشري!`);
        bannedIPs.add(clientIp);
        return triggerBan(res, clientIp, userAgent, "سرعة إرسال فائقة غير بشرية");
    }

    // العقبة 3: تحليل سلوك النقرات (Click Delay Anomaly)
    // البوتات التي ترسل البيانات مباشرة دون ضغط حقيقي أو بنقرة واحدة فورية تفشل هنا
    if (delays.length === 0) {
        console.log(`[فشل - العقبة 3] لا توجد نقرات طبيعية مسجلة على الصفحة!`);
        bannedIPs.add(clientIp);
        return triggerBan(res, clientIp, userAgent, "انعدام سلوك النقر الطبيعي");
    }

    // العقبة 4: فحص صحة البيانات (البيانات الصحيحة المطلوبة للنجاح)
    // هنا تضع شروط النجاح للبوت الذكي الخاص بك (مثال: يوزر وباسورد وتاريخ محددين)
    if (username === "admin" && password === "BotTest2026" && dob === "2000-01-01") {
        // إذا نجح البوت في تخطي كل العقبات وجاء بالبيانات الصحيحة
        const botData = {
            ip: clientIp,
            device: userAgent,
            clickDelays: delays,
            timeSpent: timeTaken,
            successAt: new Date()
        };
        successfulBots.push(botData);
        console.log(`[نجاح باهر] البوت تخطى كل العقبات بنجاح وتم تخزينه!`, botData);
        
        return res.send(`<h1>تهانينا! لقد نجح البوت الخاص بك في التخطّي والتخزين.</h1>`);
    } else {
        // إذا فشل في تخمين البيانات الصحيحة ولكن سلوكه كان طبيعياً (لم يتم حظره كلياً، يعطى فرصة أو يرفض)
        return res.status(401).send(`<h1>بيانات خاطئة!</h1><p>السلوك طبيعي لكن اسم المستخدم أو كلمة المرور غير صحيحة.</p>`);
    }
});

// دالة إرسال استجابة الحظر وكشف البيانات للبوت الفاشل
function triggerBan(res, ip, device, reason) {
    return res.status(400).json({
        status: "BANNED",
        reason: reason,
        detected_ip: ip,
        detected_device: device,
        message: "تم كشف هويتك البرمجية وحظر الآي بي الخاص بك بنجاح."
    });
}

// روت اختياري لك لمراقبة البوتات الناجحة المخزنة
app.get('/dashboard', (req, res) => {
    res.json({
        total_successful_bots: successfulBots.length,
        successful_bots_list: successfulBots,
        currently_banned_ips: Array.from(bannedIPs)
    });
});

app.listen(PORT, () => {
    console.log(`السيرفر يعمل الآن على منفذ: ${PORT}`);
});