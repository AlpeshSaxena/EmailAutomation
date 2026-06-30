/**
 * Builds the Express API as a pre-bundled Netlify Function.
 *
 * Uses the same esbuild config as build.mjs but:
 * - Entry point: src/netlify-api-handler.ts
 * - Output:      netlify/functions/api.mjs   (pre-built, node_bundler = "none")
 * - Externalises only true native modules (*.node, pg-native)
 * - Bundles googleapis and all other pure-JS dependencies
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, mkdir } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(artifactDir, "../..");
const outDir = path.resolve(repoRoot, "netlify/functions");

async function buildNetlify() {
  console.log("Building Netlify function →", outDir);

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await esbuild({
    // Named entry so the output file is api.mjs (not netlify-api-handler.mjs)
    entryPoints: [
      {
        in: path.resolve(artifactDir, "src/netlify-api-handler.ts"),
        out: "api",
      },
    ],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: outDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    sourcemap: false,

    // Only externalise genuine native binaries — everything else (including
    // googleapis, express, drizzle-orm) gets bundled so the function is
    // fully self-contained on Netlify.
    external: [
      "*.node",
      "pg-native",
      "fsevents",
      "canvas",
      "sharp",
      "re2",
    ],

    // pino uses dynamic requires for its worker transports; the plugin
    // rewrites them so esbuild can bundle pino correctly.
    plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],

    // CJS-compat shims needed when bundling CJS packages into ESM output
    banner: {
      js: `
import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`.trim(),
    },
  });

  console.log("✓ Netlify function written to", outDir + "/api.mjs");
}

buildNetlify().catch((err) => {
  console.error(err);
  process.exit(1);
});
