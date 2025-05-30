import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_S3_REGION = process.env.AWS_S3_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!S3_BUCKET_NAME || !AWS_S3_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.error("Missing S3 configuration in environment variables.");
}

const s3Client = new S3Client({
  region: AWS_S3_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID!,
    secretAccessKey: AWS_SECRET_ACCESS_KEY!,
  }
});

export async function uploadImageToS3(imageBase64: string, elementName: string): Promise<string | null> {
  if (!S3_BUCKET_NAME || !AWS_S3_REGION) {
    console.error("S3 bucket name or region is not configured.");
    return null;
  }

  try {
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const uniqueFileName = `${elementName.replace(/\s+/g, '_')}-${uuidv4()}.png`;
    const objectKey = `elements/${uniqueFileName}`;

    const params = {
      Bucket: S3_BUCKET_NAME,
      Key: objectKey,
      Body: imageBuffer,
      ACL: 'public-read' as const,
      ContentType: 'image/png',
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    const publicUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${objectKey}`;
    console.log(`Image uploaded to S3: ${publicUrl}`);
    return publicUrl;

  } catch (error) {
    console.error("Error uploading image to S3:", error);
    return null;
  }
}