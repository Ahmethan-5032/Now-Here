const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  const email = process.argv[2];
  const messageId = process.argv[3];

  if (!email && !messageId) {
    throw new Error("Kullanim: npm --prefix server run brevo:logs -- email@example.com");
  }

  const params = new URLSearchParams({
    limit: "10",
    sort: "desc",
  });

  if (messageId) {
    params.set("messageId", messageId);
  } else {
    params.set("email", email);
  }

  const response = await fetch(`https://api.brevo.com/v3/smtp/emails?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "api-key": process.env.BREVO_API_KEY || "",
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Brevo loglari alinamadi (${response.status}): ${payload.message || "Bilinmeyen hata"}`);
  }

  const emails = payload.transactionalEmails || [];
  console.log(
    JSON.stringify(
      emails.map((item) => ({
        date: item.date,
        email: item.email,
        subject: item.subject,
        messageId: item.messageId,
        uuid: item.uuid,
      })),
      null,
      2
    )
  );
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
