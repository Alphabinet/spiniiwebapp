import { Storage } from "@google-cloud/storage";

const bucketName = "spinii.firebasestorage.app"; // ✅ Correct bucket name

const storage = new Storage();

async function setCors() {
  await storage.bucket(bucketName).setCorsConfiguration([
    {
      origin: ["*"], // or restrict to your domain
      method: ["GET", "POST", "PUT"],
      responseHeader: ["Content-Type"],
      maxAgeSeconds: 3600,
    },
  ]);

  console.log("✅ CORS configuration set successfully.");
}

setCors().catch((err) => {
  console.error("❌ Failed to set CORS:", err);
});
