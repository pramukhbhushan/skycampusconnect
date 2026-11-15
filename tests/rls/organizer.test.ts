// Organizer-side row-level-security checks (sprint-planning.md A-1.3).
// Runs tests/rls/local-postgres/organizer-rules.sql against a throwaway database on a
// plain local Postgres (no Docker). Skipped when Postgres isn't reachable, so `npm test`
// still works on a machine without it. Point it at your server with PGHOST / PGPORT / PGUSER:
//   PGPORT=54329 npm test -- organizer

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const env = { ...process.env, PGHOST: process.env.PGHOST ?? "localhost", PGUSER: process.env.PGUSER ?? "postgres" };
const rootDir = process.cwd();
const rlsDir = join(rootDir, "tests/rls/local-postgres");
const db = `organizer_rls_${process.pid}`;

function psql(args: string[]) {
  return spawnSync("psql", ["-v", "ON_ERROR_STOP=1", "-q", ...args], { env, encoding: "utf8" });
}

const available = psql(["-d", "postgres", "-Atc", "select 1"]).status === 0;

describe.skipIf(!available)("organizer row-level security (local Postgres)", () => {
  beforeAll(() => {
    expect(psql(["-d", "postgres", "-c", `create database ${db}`]).status).toBe(0);
    const files = [
      join(rlsDir, "supabase-stubs.sql"),
      ...readdirSync(join(rootDir, "supabase/migrations"))
        .filter((f) => f.endsWith(".sql"))
        .sort()
        .map((f) => join(rootDir, "supabase/migrations", f)),
    ];
    for (const file of files) {
      const r = psql(["-d", db, "-f", file]);
      expect(r.status, `${file}: ${r.stderr}`).toBe(0);
    }
  });

  afterAll(() => {
    psql(["-d", "postgres", "-c", `drop database if exists ${db}`]);
  });

  it("organizers see and change only their own data", () => {
    const r = psql(["-d", db, "-f", join(rlsDir, "organizer-rules.sql")]);
    expect(r.stderr).not.toMatch(/ERROR|FAIL/);
    expect(r.stdout + r.stderr).toContain("ALL ORGANIZER RULE CHECKS PASSED");
  });
});
