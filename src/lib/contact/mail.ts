export type Mail = { from: string; to: string; replyTo: string; subject: string; text: string };

/** Versand über die Resend-API. Mit dem Schlüssel „log“ (lokal, E2E, Vorschau) wird nur protokolliert. */
export async function sendMail(mail: Mail, apiKey: string, fetcher: typeof fetch = (input, init) => fetch(input, init)): Promise<boolean> {
  if (apiKey === "log") {
    console.log("[mail:log]", mail.subject);
    return true;
  }
  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: mail.from, to: [mail.to], reply_to: mail.replyTo, subject: mail.subject, text: mail.text }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
