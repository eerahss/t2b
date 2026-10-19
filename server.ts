import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
// Spin up a fast server using Bun's native HTTP server
console.log(`🔍 Debug: Attempting to bind to port ${PORT} (process.env.PORT was: ${process.env.PORT})`);
Bun.serve({
  //port: process.env.PORT || 3000,
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);
  if (url.pathname === "/") {
      return new Response("Bridge is working!", { status: 200 });
    }
    // Endpoint your Cloudflare Worker will trigger
    if (url.pathname === "/transfer" && req.method === "POST") {
      try {
        const body = await req.json<{ torboxUrl: string; fileName: string }>();

        if (!body.torboxUrl || !body.fileName) {
          return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
        }

        const b2ObjectKey = `torbox-downloads/${Date.now()}-${body.fileName}`;

        // 1. Fetch file from TorBox using your secret API key safely hidden here
        console.log(`📥 Downloading from TorBox...`);
        const cleanUrl = body.torboxUrl.trim();
        const fileRes = await fetch(cleanUrl);

        if (!fileRes.ok || !fileRes.body) {
          return new Response(JSON.stringify({ error: "Failed to fetch from TorBox" }), { status: 500 });
        }

        const contentLengthHeader = fileRes.headers.get("content-length");
        const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : undefined;

        // 2. Setup S3 client for Backblaze B2
        const s3 = new S3Client({
          region: process.env.B2_REGION || "us-west-004",
          endpoint: process.env.B2_ENDPOINT,
          credentials: {
            accessKeyId: process.env.B2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.B2_SECRET_ACCESS_KEY!,
          },
          requestChecksumCalculation: "WHEN_REQUIRED",
        });

        console.log(`📤 Streaming to B2 -> ${b2ObjectKey}`);

        // 3. Pipe stream directly to B2 (Bun handles this safely with low memory)
        await s3.send(new PutObjectCommand({
          Bucket: process.env.B2_BUCKET_NAME!,
          Key: b2ObjectKey,
          Body: fileRes.body as any,
          ContentLength: contentLength,
          ContentType: fileRes.headers.get("Content-Type") || "application/octet-stream",
        }));

        console.log(`✅ Transfer complete: ${b2ObjectKey}`);
        return new Response(JSON.stringify({ success: true, objectKey: b2ObjectKey }), { status: 200 });

      } catch (err: any) {
        console.error("🔥 Transfer error:", err);
        return new Response(JSON.stringify({ 
          success: false, 
          error: err.message, 
          cause: err.cause?.message || "none",
          stack: err.stack 
        }, null, 2), { status: 500 });
      
    }

    return new Response("Bot bridge runner is active!", { status: 200 });
  },
});

console.log("🚀 Bun bridge server running...");