import { Resend } from "resend";

interface ContactEmailData {
  name: string;
  email: string;
  subject: string;
  message: string;
  attachment?: {
    filename: string;
    content: Buffer;
  };
}

export async function sendContactEmail(data: ContactEmailData) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { name, email, subject, message, attachment } = data;

  return resend.emails.send({
    from: "Cosmo Photos <noreply@cosmophotos.de>",
    to: process.env.CONTACT_EMAIL!,
    replyTo: email,
    subject: `[Kontakt] ${subject}`,
    text: `Name: ${name}\nE-Mail: ${email}\n\n${message}`,
    attachments: attachment
      ? [{ filename: attachment.filename, content: attachment.content }]
      : undefined,
  });
}
