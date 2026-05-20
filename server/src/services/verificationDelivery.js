const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

function isFilledSecret(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  return !/^(your-|change-|xxxx|xkeysib-xxxx)/i.test(text);
}

function getBrevoConfig() {
  return {
    apiKey: process.env.BREVO_API_KEY || "",
    fromEmail: process.env.BREVO_FROM_EMAIL || process.env.ADMIN_EMAIL || "",
    fromName: process.env.BREVO_FROM_NAME || "NOW Here",
  };
}

function hasBrevoConfig() {
  const config = getBrevoConfig();
  return Boolean(isFilledSecret(config.apiKey) && isFilledSecret(config.fromEmail));
}

function makeEmailText(code) {
  return [
    "NOW Here dogrulama kodun:",
    "",
    code,
    "",
    "Bu kod 10 dakika gecerlidir. Bu istegi sen yapmadiysan mesaji yok sayabilirsin.",
  ].join("\n");
}

function makeEmailHtml(code) {
  return `
    <div style="font-family:Arial,sans-serif;background:#0c1313;padding:24px;color:#f8faf5">
      <div style="max-width:520px;margin:0 auto;background:#182221;border:1px solid #2d3b39;border-radius:18px;padding:28px">
        <p style="margin:0 0 10px;color:#45d6bd;font-weight:700;letter-spacing:.04em">NOW Here</p>
        <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2">Dogrulama kodun hazir</h1>
        <p style="margin:0 0 22px;color:#b8c1bc">Kaydini tamamlamak icin asagidaki kodu uygulamaya gir.</p>
        <div style="font-size:34px;letter-spacing:10px;font-weight:800;background:#101817;border-radius:14px;padding:18px;text-align:center;color:#ffffff">${code}</div>
        <p style="margin:22px 0 0;color:#8f9a95;font-size:14px">Kod 10 dakika gecerlidir.</p>
      </div>
    </div>
  `;
}

function makeBrevoError(payload, status) {
  const code = String(payload.code || "").toLowerCase();
  const message = String(payload.message || "");
  const normalizedMessage = message.toLowerCase();

  if (status === 401 || code === "unauthorized" || normalizedMessage.includes("key not found")) {
    const error = new Error(
      "Brevo API key gecersiz veya Brevo tarafinda bulunamadi. Brevo > SMTP & API > API Keys bolumunden yeni bir API key olusturup server/.env icindeki BREVO_API_KEY alanina yapistir ve server'i yeniden baslat."
    );
    error.status = 401;
    error.code = "BREVO_KEY_NOT_FOUND";
    return error;
  }

  if (normalizedMessage.includes("sender") || normalizedMessage.includes("from")) {
    const error = new Error(
      "Brevo gonderici e-posta adresini kabul etmedi. BREVO_FROM_EMAIL adresinin Brevo'da dogrulanmis sender oldugundan emin ol."
    );
    error.status = status >= 500 ? 502 : status;
    error.code = "BREVO_SENDER_INVALID";
    return error;
  }

  const error = new Error(message || "Brevo e-postayi kabul etmedi.");
  error.status = status >= 500 ? 502 : status;
  error.code = code || "BREVO_SEND_FAILED";
  return error;
}

async function deliverVerificationCode({ target, code }) {
  if (!hasBrevoConfig()) {
    const error = new Error("Brevo e-posta ayarlari eksik. BREVO_API_KEY ve BREVO_FROM_EMAIL girilmeli.");
    error.status = 503;
    throw error;
  }

  const config = getBrevoConfig();
  const response = await fetch(BREVO_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: config.fromName,
        email: config.fromEmail,
      },
      to: [{ email: target }],
      subject: "NOW Here dogrulama kodun",
      textContent: makeEmailText(code),
      htmlContent: makeEmailHtml(code),
      tags: ["verification"],
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Brevo dogrulama e-postasi gonderilemedi:", {
      status: response.status,
      code: payload.code,
      message: payload.message,
    });
    throw makeBrevoError(payload, response.status);
  }

  console.log("Brevo dogrulama e-postasi kabul edildi:", {
    target,
    messageId: payload.messageId,
  });

  return {
    sent: true,
    channel: "email",
    provider: "brevo",
    id: payload.messageId,
  };
}

module.exports = {
  deliverVerificationCode,
  hasBrevoConfig,
};
