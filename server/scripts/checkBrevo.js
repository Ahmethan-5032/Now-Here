const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  const apiKey = process.env.BREVO_API_KEY || "";
  const fromEmail = process.env.BREVO_FROM_EMAIL || "";

  if (!apiKey || apiKey.includes("xxxxxxxx")) {
    throw new Error("BREVO_API_KEY server/.env icinde gercek API key olarak girilmeli.");
  }

  if (!fromEmail) {
    throw new Error("BREVO_FROM_EMAIL server/.env icinde girilmeli.");
  }

  const response = await fetch("https://api.brevo.com/v3/account", {
    headers: {
      Accept: "application/json",
      "api-key": apiKey,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Brevo API key dogrulanamadi (${response.status}): ${payload.message || "Bilinmeyen hata"}`
    );
  }

  const sendersResponse = await fetch("https://api.brevo.com/v3/senders", {
    headers: {
      Accept: "application/json",
      "api-key": apiKey,
    },
  });
  const sendersPayload = await sendersResponse.json().catch(() => ({}));

  if (!sendersResponse.ok) {
    throw new Error(
      `Brevo sender listesi alinamadi (${sendersResponse.status}): ${
        sendersPayload.message || "Bilinmeyen hata"
      }`
    );
  }

  const sender = (sendersPayload.senders || []).find(
    (item) => String(item.email || "").toLowerCase() === fromEmail.toLowerCase()
  );

  if (!sender) {
    throw new Error(
      `${fromEmail} Brevo'da dogrulanmis sender olarak bulunamadi. Brevo > Senders, domains, IPs bolumunde bu adresi dogrula veya BREVO_FROM_EMAIL alanini aktif sender adresiyle degistir.`
    );
  }

  if (!sender.active) {
    throw new Error(`${fromEmail} Brevo sender olarak var ama aktif degil.`);
  }

  console.log(`Brevo API key ve sender dogrulandi. Gonderici adresi: ${fromEmail}`);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
