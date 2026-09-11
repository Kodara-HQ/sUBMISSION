import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { createSeedDb, ensureCatalog, type DemoDB } from "@/lib/demo/store";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "demo-db.json");

let memory: DemoDB | null = null;

export function readServerDemoDb(): DemoDB {
  if (memory) return memory;
  try {
    if (existsSync(DATA_FILE)) {
      const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8")) as DemoDB;
      memory = ensureCatalog(parsed);
      return memory;
    }
  } catch {
    // Fall through to seed.
  }
  memory = createSeedDb();
  writeServerDemoDb(memory);
  return memory;
}

export function writeServerDemoDb(db: DemoDB) {
  memory = ensureCatalog(db);
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(memory), "utf8");
}
