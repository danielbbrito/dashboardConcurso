import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(".next/static");
const forbidden = ["DATABASE_AUTH_TOKEN", "ESTUDOS_DB_TOKEN", "build-auth-secret", "GOOGLE_CLIENT_SECRET", "libsql://"];
let javascriptBytes = 0;
let files = 0;
const violations = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(filename);
    else if (entry.name.endsWith(".js")) {
      const contents = await readFile(filename, "utf8");
      javascriptBytes += (await stat(filename)).size;
      files += 1;
      for (const token of forbidden) if (contents.includes(token)) violations.push({ file: path.relative(root, filename), token });
    }
  }
}

await walk(root);
if (violations.length > 0) {
  console.error(JSON.stringify({ violations }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ javascriptFiles: files, javascriptBytes, clientBoundary: "pass" }));
}
