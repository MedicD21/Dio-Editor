import express from "express";
import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const app = express();
app.use(express.json({ limit: "50mb" }));

const PORT = parseInt(process.env.PORT || "3001", 10);
const TEMP_DIR = process.env.TEMP_DIR || "/tmp/dio";

interface RenderRequest {
  compositionId: string;
  inputProps: Record<string, unknown>;
  outputPath: string;
  width?: number;
  height?: number;
  fps?: number;
  durationInFrames?: number;
}

let bundleCache: string | null = null;

async function getBundle(): Promise<string> {
  if (bundleCache && fs.existsSync(bundleCache)) {
    return bundleCache;
  }
  const entryPoint = path.join(process.cwd(), "src", "remotion-entry.ts");
  console.log("Bundling Remotion composition...");
  bundleCache = await bundle({
    entryPoint,
    onProgress: (p) => {
      if (p % 20 === 0) console.log(`Bundle progress: ${p}%`);
    },
  });
  console.log("Bundle complete:", bundleCache);
  return bundleCache;
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "dio-remotion-renderer" });
});

app.post("/render", async (req, res) => {
  const {
    compositionId,
    inputProps,
    outputPath,
    width,
    height,
    fps = 30,
    durationInFrames,
  } = req.body as RenderRequest;

  if (!compositionId || !outputPath) {
    return res.status(400).json({ error: "compositionId and outputPath are required" });
  }

  const absOutputPath = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(TEMP_DIR, outputPath);

  const outputDir = path.dirname(absOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timeoutMs = 10 * 60 * 1000;
  const timer = setTimeout(() => {
    res.status(504).json({ error: "Render timed out after 10 minutes" });
  }, timeoutMs);

  try {
    const bundlePath = await getBundle();

    const composition = await selectComposition({
      serveUrl: bundlePath,
      id: compositionId,
      inputProps,
    });

    const finalWidth = width || composition.width;
    const finalHeight = height || composition.height;
    const finalFps = fps || composition.fps;

    const totalSecs = (inputProps as { totalDurationSeconds?: number }).totalDurationSeconds || 30;
    const finalDuration = durationInFrames || Math.round(totalSecs * finalFps);

    await renderMedia({
      composition: {
        ...composition,
        width: finalWidth,
        height: finalHeight,
        fps: finalFps,
        durationInFrames: finalDuration,
      },
      serveUrl: bundlePath,
      codec: "h264",
      outputLocation: absOutputPath,
      inputProps,
      timeoutInMilliseconds: timeoutMs,
      onProgress: (progress) => {
        if (progress.renderedFrames % 30 === 0) {
          console.log(`Rendering: ${progress.renderedFrames} frames`);
        }
      },
    });

    clearTimeout(timer);
    res.json({ success: true, outputPath: absOutputPath });
  } catch (err: unknown) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : String(err);
    console.error("Render failed:", message);
    res.status(500).json({ success: false, error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Dio Remotion Renderer listening on port ${PORT}`);
  getBundle().catch(console.error);
});
