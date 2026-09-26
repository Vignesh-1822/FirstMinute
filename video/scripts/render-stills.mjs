// Renders review stills of the pitch film into out/frames/.
// Usage: node scripts/render-stills.mjs [frame ...]
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const DEFAULT_FRAMES = [170, 450, 600, 760, 890, 1035, 1220, 1455, 1480, 1700, 1860, 1985, 2170, 2270, 2520, 2700, 2900, 3080, 3280, 3420, 3560];
const frames = process.argv.slice(2).map(Number);
const targets = frames.length > 0 ? frames : DEFAULT_FRAMES;

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "FirstMinutePitch", inputProps: {} });

for (const frame of targets) {
  const output = path.resolve(`out/frames/f${String(frame).padStart(4, "0")}.png`);
  await renderStill({ serveUrl, composition, frame, output, inputProps: {} });
  console.log("rendered", output);
}
