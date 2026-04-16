import path from "path";
import { spawnSync } from "child_process";

const scriptPath = path.resolve(__dirname, "verify_partners.js");
const child = spawnSync(process.execPath, [scriptPath, ...process.argv.slice(2)], {
    stdio: "inherit",
});

if (child.error) {
    console.error("[FAIL] Unable to run verify_partners.js:", child.error.message);
    process.exit(1);
}

process.exit(child.status ?? 1);
