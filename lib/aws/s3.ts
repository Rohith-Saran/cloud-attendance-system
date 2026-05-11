import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-east-1";
const s3 = new S3Client({ region: REGION });

export async function uploadBufferToS3(buffer: Buffer, key: string, contentType = "application/octet-stream") {
  const Bucket = process.env.AWS_S3_BUCKET_NAME || "";
  if (!Bucket) throw new Error("AWS_S3_BUCKET_NAME not set");

  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: buffer, ContentType: contentType }));
  return { Bucket, Key: key };
}

export async function getPresignedGetUrl(key: string, expiresInSeconds = 900) {
  const Bucket = process.env.AWS_S3_BUCKET_NAME || "";
  if (!Bucket) throw new Error("AWS_S3_BUCKET_NAME not set");
  const cmd = new GetObjectCommand({ Bucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
}

export default s3;
