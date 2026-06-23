import http from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "www");
const port = Number(process.env.PORT || 4173);
const openAiModel = process.env.OPENAI_MODEL || "gpt-5.5";
const aiSubscriptionProductId = "com.khutwati.ai.monthly";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml"
};

const planSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    safety_note: { type: "string" },
    calorie_adjustment: { type: "integer", minimum: -200, maximum: 200 },
    session_minutes_adjustment: { type: "integer", minimum: -10, maximum: 10 },
    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string" }
    },
    section_minutes: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          key: {
            type: "string",
            enum: ["warmup", "treadmill", "bike", "elliptical", "rowingMachine", "resistance", "matBall", "dumbbells", "cableMachine", "bodyweight", "mobility"]
          },
          minutes: { type: "integer", minimum: 1, maximum: 90 }
        },
        required: ["key", "minutes"]
      }
    }
  },
  required: ["summary", "safety_note", "calorie_adjustment", "session_minutes_adjustment", "recommendations", "section_minutes"]
};

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Khutwati-Entitlement"
  });
  response.end(JSON.stringify(value));
}

function signEntitlement(payload) {
  if (!process.env.ENTITLEMENT_SECRET) return "";
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", process.env.ENTITLEMENT_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyEntitlement(token) {
  if (!token || !process.env.ENTITLEMENT_SECRET) return false;
  const [encoded, providedSignature] = token.split(".");
  if (!encoded || !providedSignature) return false;
  const expected = createHmac("sha256", process.env.ENTITLEMENT_SECRET).update(encoded).digest();
  const provided = Buffer.from(providedSignature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return payload.productId === aiSubscriptionProductId
      && Number(payload.expiresAt || 0) > Date.now();
  } catch {
    return false;
  }
}

async function verifySubscription(request, response) {
  if (!process.env.SUBSCRIPTION_VALIDATOR_URL || !process.env.ENTITLEMENT_SECRET) {
    sendJson(response, 503, {
      error: "الاشتراكات لم تُربط بخادم التحقق بعد."
    });
    return;
  }
  try {
    const input = await readJson(request);
    if (input.productId !== aiSubscriptionProductId || !input.transactionId) {
      sendJson(response, 400, { error: "بيانات الاشتراك غير صالحة." });
      return;
    }
    const validatorResponse = await fetch(process.env.SUBSCRIPTION_VALIDATOR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SUBSCRIPTION_VALIDATOR_TOKEN
          ? { "Authorization": `Bearer ${process.env.SUBSCRIPTION_VALIDATOR_TOKEN}` }
          : {})
      },
      body: JSON.stringify(input)
    });
    const validation = await validatorResponse.json();
    const expiresAt = new Date(validation.expiresAt || 0).getTime();
    if (!validatorResponse.ok || !validation.active || validation.productId !== aiSubscriptionProductId || expiresAt <= Date.now()) {
      sendJson(response, 403, { error: "لا يوجد اشتراك فعال للمدرب الذكي." });
      return;
    }
    const entitlementToken = signEntitlement({
      productId: aiSubscriptionProductId,
      transactionId: input.transactionId,
      expiresAt
    });
    sendJson(response, 200, {
      active: true,
      entitlementToken,
      expiresAt: new Date(expiresAt).toISOString()
    });
  } catch {
    sendJson(response, 500, { error: "تعذر التحقق من اشتراك App Store." });
  }
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 100_000) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") return content.text;
    }
  }
  return "";
}

async function createAiPlan(request, response) {
  if (!verifyEntitlement(request.headers["x-khutwati-entitlement"])) {
    sendJson(response, 402, {
      error: "يلزم اشتراك فعال لاستخدام المدرب الذكي."
    });
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    sendJson(response, 503, {
      error: "خدمة المدرب الذكي غير مفعلة. أضف OPENAI_API_KEY إلى ملف .env على الخادم."
    });
    return;
  }

  try {
    const input = await readJson(request);
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: openAiModel,
        instructions: [
          "أنت مدرب لياقة وتغذية مساعد داخل تطبيق خطوتي.",
          "اكتب بالعربية الواضحة وكن محافظاً في زيادة الحمل.",
          "حلل الوزن والالتزام والجهد والألم والأجهزة المتاحة والسعرات المسجلة.",
          "احترم مكان التدريب والأجهزة المتوفرة ولا تقترح جهازاً غير متاح.",
          "النظام منخفض النشويات وليس منعدم النشويات، ولا تشخّص مرضاً ولا تغيّر دواءً.",
          "تعامل مع العمر والحالات الصحية التي اختارها المستخدم كقيود سلامة. عند مرض الكلى أو ارتفاع الكرياتينين لا ترفع البروتين أو الماء، ولا تحدد البوتاسيوم أو الفوسفور دون تحاليل وتوجيه طبي.",
          "احتياجات مريض الغسيل الكلوي تختلف عن مرض الكلى من دون غسيل؛ لا تخلط بينهما.",
          "عند مرض القلب أو السكري أو الضغط أو ألم المفاصل اجعل التمرين محافظاً واطلب مراجعة المختص عند الأعراض.",
          "إذا وُجد ألم أو انخفاض وزن سريع فخفف الحمل واقترح مراجعة مختص.",
          "عدّل السعرات في نطاق صغير فقط، ولا تجعل التوصية بديلاً عن الطبيب أو اختصاصي التغذية."
        ].join("\n"),
        input: JSON.stringify(input),
        text: {
          format: {
            type: "json_schema",
            name: "khutwati_plan",
            strict: true,
            schema: planSchema
          }
        }
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      sendJson(response, upstream.status, {
        error: data?.error?.message || "تعذر الحصول على اقتراح الذكاء الاصطناعي."
      });
      return;
    }

    const text = extractResponseText(data);
    if (!text) throw new Error("EMPTY_AI_RESPONSE");
    sendJson(response, 200, { plan: JSON.parse(text), model: openAiModel });
  } catch (error) {
    const status = error.message === "PAYLOAD_TOO_LARGE" ? 413 : 500;
    sendJson(response, status, {
      error: status === 413 ? "بيانات الطلب كبيرة جداً." : "حدث خطأ أثناء إعداد الخطة الذكية."
    });
  }
}

http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, "http://localhost");
    if (requestUrl.pathname === "/api/ai-plan" && request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, X-Khutwati-Entitlement",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      });
      response.end();
      return;
    }
    if (requestUrl.pathname === "/api/subscription/verify" && request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      });
      response.end();
      return;
    }
    if (requestUrl.pathname === "/api/subscription/verify" && request.method === "POST") {
      await verifySubscription(request, response);
      return;
    }
    if (requestUrl.pathname === "/api/ai-plan" && request.method === "POST") {
      await createAiPlan(request, response);
      return;
    }

    const urlPath = decodeURIComponent(requestUrl.pathname);
    const safePath = normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
    let path = join(root, safePath);
    if ((await stat(path).catch(() => null))?.isDirectory()) path = join(path, "index.html");
    const body = await readFile(path);
    response.writeHead(200, {
      "Content-Type": types[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Khutwati is running at http://localhost:${port}`);
});
