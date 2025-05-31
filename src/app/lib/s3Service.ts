import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

// Retrieve S3 configuration values from environment variables.
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_S3_REGION = process.env.AWS_S3_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// Log an error if any of the S3 configuration variables are missing.
if (!S3_BUCKET_NAME || !AWS_S3_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.error("Missing S3 configuration in environment variables.");
}

// Initialize the S3 client with the provided configuration.
const s3Client = new S3Client({
  region: AWS_S3_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID!,
    secretAccessKey: AWS_SECRET_ACCESS_KEY!,
  }
});

/**
 * Uploads an image to AWS S3.
 *
 * This function converts a base64 string into a binary buffer and uploads it to a specified S3 bucket.
 * A unique file name is generated using the element's name and a UUID. The uploaded image is publicly accessible.
 *
 * @param {string} imageBase64 - The base64 encoded image data.
 * @param {string} elementName - The name of the element to include in the file name.
 * @returns {Promise<string | null>} A promise that resolves to the public URL of the uploaded image, or null if the upload fails.
 */
export async function uploadImageToS3(imageBase64: string, elementName: string): Promise<string | null> {
  if (!S3_BUCKET_NAME || !AWS_S3_REGION) {
    console.error("S3 bucket name or region is not configured.");
    return null;
  }

  try {
    // Convert the base64 image to a buffer.
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    // Generate a unique file name based on the element name and a UUID.
    const uniqueFileName = `${elementName.replace(/\s+/g, '_')}-${uuidv4()}.png`;
    const objectKey = `elements/${uniqueFileName}`;

    // Define parameters for the S3 upload.
    const params = {
      Bucket: S3_BUCKET_NAME,
      Key: objectKey,
      Body: imageBuffer,
      ACL: 'public-read' as const,
      ContentType: 'image/png',
    };

    // Create and send the S3 PutObject command.
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Construct and log the public URL for the uploaded image.
    const publicUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${objectKey}`;
    console.log(`Image uploaded to S3: ${publicUrl}`);
    return publicUrl;

  } catch (error) {
    // Log any errors that occur during the upload.
    console.error("Error uploading image to S3:", error);
    return null;
  }
}