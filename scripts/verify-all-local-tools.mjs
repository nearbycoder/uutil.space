import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
let count = 0;
for (const file of readdirSync("src/lib/local-tools").filter(name => name.endsWith(".ts") && !name.endsWith(".test.ts"))) {
  const { tool } = await import(`../src/lib/local-tools/${file}`);
  if (!tool) continue;
  execFileSync(process.execPath, ["scripts/verify-local-tool.mjs", file.slice(0,-3), tool.smoke], { stdio: "inherit", env: process.env });
  count++;
}
if (count !== 20) throw new Error(`Expected 20 tools, found ${count}`);
console.log(`PASS all ${count} local features across mobile and desktop`);
