#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "path";

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
const CONST_NAME  = args.get("const-name") || inferConstFromSlug(path.basename(PLUGIN_ROOT));

// ---- helpers ----------------------------------------------------------------
function safe(cmd) {
  try { return execSync(cmd, { stdio: ["ignore","pipe","ignore"] }).toString().trim(); }
  catch { return ""; }
}
function inferConstFromSlug(slug) { return slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_") + "_VERSION"; }
function findPluginPhp(root) {
  // Find main plugin file: first *.php that contains "Plugin Name:" header
  const entries = fs.readdirSync(root).filter(f => f.endsWith(".php"));
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

// ---- compute version --------------------------------------------------------
const repoRoot = safe("git rev-parse --show-toplevel");
const tag      = process.env.PLUGIN_VERSION || safe("git describe --tags --abbrev=0");
const commit   = safe("git rev-parse --short HEAD");
const stamp    = new Date().toISOString();

// Fallback to package.json version or a local marker
let pkgVersion = "0.0.0-local";
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, "package.json"), "utf8"));
  if (pkg?.version) pkgVersion = pkg.version;
} catch {}

const version = tag || pkgVersion || `0.0.0-${commit || "local"}`;
console.log(`[version] ${path.basename(PLUGIN_ROOT)} -> version=${version} commit=${commit || "n/a"}`);

// ---- 1) Update block.json files --------------------------------------------
for (const bj of listBlockJsons(PLUGIN_ROOT)) {
  try {
    const j = JSON.parse(fs.readFileSync(bj, "utf8"));
    j.version = version;
    fs.writeFileSync(bj, JSON.stringify(j, null, 2) + "\n");
    console.log(`  • updated ${path.relative(PLUGIN_ROOT, bj)}`);
  } catch (e) {
    console.warn(`  ! failed to update ${bj}:`, e.message);
  }
}

// ---- 2) Update plugin header + define constant ------------------------------ 
// ---- 2) Update plugin header version ----------------------------------------
const phpMain = findPluginPhp(PLUGIN_ROOT);
if (phpMain) {
  let php = fs.readFileSync(phpMain, 'utf8');
  php = php.replace(/(^\s*\*\s*Version:\s*).*/m, `$1${version}`);
  fs.writeFileSync(phpMain, php);
  console.log(`  • updated header version in ${path.basename(phpMain)}`);
}
else {
  console.warn("  ! no header with 'Plugin Name:').");
}


// ---- 3) Emit version files for PHP/JS --------------------------------------
const buildDir = path.join(PLUGIN_ROOT, "build");
fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(path.join(buildDir, "version.php"),
  `<?php return ['version'=>'${version}','commit'=>'${commit}','built_at'=>'${stamp}'];`
);

const srcDir = path.join(PLUGIN_ROOT, "src");
fs.mkdirSync(srcDir, { recursive: true });
fs.writeFileSync(path.join(srcDir, "version.ts"),
  `export const VERSION='${version}'; export const COMMIT='${commit}'; export const BUILT_AT='${stamp}';\n`
);

console.log("  • wrote build/version.php and src/version.ts");
console.log("[version] done.");
