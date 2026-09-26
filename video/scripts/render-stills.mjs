// Renders review stills of the pitch film into out/frames/.
// Usage: node scripts/render-stills.mjs [frame ...]
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const DEFAULT_FRAMES = [120, 290, 480, 700, 860, 1030, 1230, 1420, 1630, 1820, 1950, 2090, 2230, 2360, 2460, 2580];
const frames = process.argv.slice(2).map(Number);
const targets = frames.length > 0 ? frames : DEFAULT_FRAMES;

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "FirstMinutePitch", inputProps: {} });

for (const frame of targets) {
  const output = path.resolve(`out/frames/f${String(frame).padStart(4, "0")}.png`);
  await renderStill({ serveUrl, composition, frame, output, inputProps: {} });
  console.log("rendered", output);
}
