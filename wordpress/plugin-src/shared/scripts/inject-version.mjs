#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// ---- CLI args ---------------------------------------------------------------
const args = new Map();
process.argv.slice(2).forEach((a, i, all) => {
  if (a.startsWith("--")) {
    const k = a.replace(/^--/, "");
    const v = all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true";
    args.set(k, v);
  }
});

const PLUGIN_ROOT = path.resolve(args.get("plugin-root") || process.cwd());

// ---- helpers ----------------------------------------------------------------
function safe(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

function findPluginPhp(root) {
  // Find main plugin file: first *.php that contains "Plugin Name:" header
  const entries = fs.readdirSync(root).filter((f) => f.endsWith(".php"));
  for (const f of entries) {
    const p = path.join(root, f);
    const s = fs.readFileSync(p, "utf8");
    if (/^\s*\/\*\*[\s\S]*?^\s*\*\s*Plugin\s+Name\s*:/m.test(s)) return p;
  }
  return null;
}

function listBlockJsons(root) {
  const out = [];
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name === "block.json") out.push(p);
    }
  }
  const src = path.join(root, "src");
  if (fs.existsSync(src)) walk(src);
  return out;
}

function writeIfChanged(p, content) {
  const old = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
  if (old !== content) fs.writeFileSync(p, content);
}

// ---- compute version --------------------------------------------------------
// Prefer explicit env from build script; fallback to git tag / pkg version.
const tag = process.env.PLUGIN_VERSION || safe("git describe --tags --abbrev=0");
const commit = process.env.BUILD_COMMIT || safe("git rev-parse --short HEAD") || "local";
const stamp = process.env.BUILD_STAMP || new Date().toISOString();

// Fallback to package.json version if no tag and no PLUGIN_VERSION
let pkgVersion = "0.0.0-local";
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, "package.json"), "utf8"));
  if (pkg?.version) pkgVersion = pkg.version;
} catch {}

const version = tag || pkgVersion || `0.0.0-${commit}`;

console.log(
  `[version] ${path.basename(PLUGIN_ROOT)} -> version=${version} commit=${commit}`
);

// ---- 1) Update block.json files --------------------------------------------
for (const bj of listBlockJsons(PLUGIN_ROOT)) {
  try {
    const j = JSON.parse(fs.readFileSync(bj, "utf8"));
    if (j.version !== version) {
      j.version = version;
      writeIfChanged(bj, JSON.stringify(j, null, 2) + "\n");
      console.log(`  • updated ${path.relative(PLUGIN_ROOT, bj)}`);
    }
  } catch (e) {
    console.warn(`  ! failed to update ${bj}: ${e?.message || e}`);
  }
}

// ---- 2) Update plugin header version ----------------------------------------
const phpMain = findPluginPhp(PLUGIN_ROOT);
if (phpMain) {
  const oldPhp = fs.readFileSync(phpMain, "utf8");
  const newPhp = oldPhp.replace(
    /(^\s*\*\s*Version:\s*).*/m,
    `$1${version}`
  );
  if (newPhp !== oldPhp) {
    writeIfChanged(phpMain, newPhp);
    console.log(`  • updated header version in ${path.basename(phpMain)}`);
  }
} else {
  console.warn("  ! no main plugin file found (missing 'Plugin Name:' header?)");
}

// ---- 3) Emit version files for PHP/JS --------------------------------------
const buildDir = path.join(PLUGIN_ROOT, "build");
fs.mkdirSync(buildDir, { recursive: true });

// build/version.php: can include stamp + commit (build artifact, ok to vary)
writeIfChanged(
  path.join(buildDir, "version.php"),
  `<?php return ['version'=>'${version}','commit'=>'${commit}','built_at'=>'${stamp}'];`
);

// src/version.ts: keep stable across runs (no timestamp / commit here)
const srcDir = path.join(PLUGIN_ROOT, "src");
fs.mkdirSync(srcDir, { recursive: true });
writeIfChanged(
  path.join(srcDir, "version.ts"),
  `export const VERSION='${version}';\n`
);

console.log("  • wrote build/version.php and src/version.ts");
console.log("[version] done.");
