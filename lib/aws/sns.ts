import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const REGION = process.env.AWS_REGION || "us-east-1";
const client = new SNSClient({ region: REGION });

export async function publishSms(phoneNumber: string, message: string) {
  const params = {
    PhoneNumber: phoneNumber,
    Message: message,
  };
  const cmd = new PublishCommand(params as any);
  return client.send(cmd);
}

export default client;
