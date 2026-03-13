import express from "express";
import { createServer as createViteServer } from "vite";
import ytdl from "@distube/ytdl-core";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route for YouTube Streaming Proxy
  app.get("/api/stream", async (req, res) => {
    const videoUrl = req.query.url as string;
    
    if (!videoUrl) {
      return res.status(400).send("URL is required");
    }

    try {
      if (!ytdl.validateURL(videoUrl)) {
        return res.status(400).send("Invalid YouTube URL");
      }

      console.log(`Proxying stream for: ${videoUrl}`);

      // Set headers for audio streaming
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("Cache-Control", "no-cache");
      
      // Get audio only stream with custom headers to reduce bot detection
      // We use a more "mobile-like" or "modern browser" header set
      const stream = ytdl(videoUrl, {
        filter: "audioonly",
        quality: "highestaudio",
        requestOptions: {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
          }
        }
      });

      stream.pipe(res);

      stream.on("error", (err: any) => {
        console.error("YTDL Stream Error:", err.message);
        
        if (!res.headersSent) {
          if (err.message.includes("confirm you’re not a bot") || err.message.includes("403")) {
            res.status(403).json({
              error: "Bot Detection",
              message: "YouTube blocked the request. This is common on cloud infrastructure. Try uploading a local file or using a different link.",
              code: "BOT_DETECTION"
            });
          } else {
            res.status(500).json({
              error: "Streaming Failed",
              message: err.message
            });
          }
        } else {
          // If headers already sent, we can't change status, just end the response
          console.warn("Stream error occurred after headers were sent.");
          res.end();
        }
      });

      // Handle client disconnect
      res.on("close", () => {
        stream.destroy();
      });

    } catch (error: any) {
      console.error("Proxy Error:", error);
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error");
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
