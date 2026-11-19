import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const directory = new URL("../migrations/", import.meta.url);
const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();

if (files.length === 0) {
  console.error("Migration check failed: no SQL migrations were found.");
  process.exit(1);
}

const numbered = files.map((file) => {
  const match = /^(\d{4})_[a-z0-9_-]+\.sql$/i.exec(file);
  if (!match) {
    console.error(`Migration filename is invalid: ${file}`);
    process.exit(1);
  }
  return { file, number: Number(match[1]) };
});

for (let index = 0; index < numbered.length; index += 1) {
  const expected = index + 1;
  if (numbered[index].number !== expected) {
    console.error(`Migration sequence gap or duplicate: expected ${String(expected).padStart(4, "0")}, found ${numbered[index].file}`);
    process.exit(1);
  }
  const sql = await readFile(join(new URL(".", directory).pathname, numbered[index].file), "utf8");
  if (!sql.trim()) {
    console.error(`Migration is empty: ${numbered[index].file}`);
    process.exit(1);
  }
}

// Once a migration has reached the base branch, it is immutable. Add a new
// numbered migration instead of editing or deleting an already-applied file.
const baseSha = process.env.MIGRATION_BASE_SHA;
if (baseSha && !/^0+$/.test(baseSha)) {
  let changes;
  try {
    changes = execFileSync("git", ["diff", "--name-status", `${baseSha}...HEAD`, "--", "migrations"], { encoding: "utf8" }).trim();
  } catch (error) {
    console.error("Migration immutability check failed: could not compare against the base revision.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const unsafe = changes.split("\n").filter(Boolean).filter((line) => !line.startsWith("A\t"));
  if (unsafe.length > 0) {
    console.error("Migration immutability check failed. Existing migrations must not be modified, deleted or renamed:");
    console.error(unsafe.join("\n"));
    process.exit(1);
  }
}

console.log(`Migration check passed: ${numbered.length} ordered, non-empty migrations; existing migration files are protected.`);
