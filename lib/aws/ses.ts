import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const REGION = process.env.AWS_REGION || "us-east-1";
const FROM_EMAIL = process.env.AWS_SES_FROM_EMAIL || "no-reply@example.com";

const client = new SESClient({ region: REGION });

export async function sendEmail(to: string, subject: string, bodyText: string, bodyHtml?: string) {
  const params = {
    Destination: { ToAddresses: [to] },
    Message: {
      Body: {
        Text: { Data: bodyText },
        ...(bodyHtml ? { Html: { Data: bodyHtml } } : {}),
      },
      Subject: { Data: subject },
    },
    Source: FROM_EMAIL,
  };

  const cmd = new SendEmailCommand(params as any);
  return client.send(cmd);
}

export default client;
