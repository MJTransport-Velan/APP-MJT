import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';

const execFileAsync = promisify(execFile);

export const BACKUPS_DIR = path.join(process.cwd(), 'backups');

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || '5432',
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
  };
}

/** Runs pg_dump in custom (-Fc) format — required for pg_restore --list based Restore Validation. Throws if pg_dump is not on PATH or exits non-zero; caller is responsible for marking the BackupRecord FAILED. */
export async function runPgDump(fileNameBase: string): Promise<{ filePath: string; sizeBytes: number }> {
  ensureBackupsDir();
  const { host, port, user, password, database } = parseDatabaseUrl(env.databaseUrl);
  const filePath = path.join(BACKUPS_DIR, `${fileNameBase}.dump`);

  await execFileAsync(
    'pg_dump',
    ['-h', host, '-p', port, '-U', user, '-F', 'c', '-f', filePath, database],
    { env: { ...process.env, PGPASSWORD: password }, timeout: 5 * 60 * 1000 }
  );

  const stats = fs.statSync(filePath);
  return { filePath, sizeBytes: stats.size };
}

/** Read-only structural validation via `pg_restore --list` — never executes an actual restore against any database. */
export async function verifyPgDumpFile(filePath: string): Promise<{ ok: boolean; detail: string }> {
  if (!fs.existsSync(filePath)) return { ok: false, detail: 'Backup file no longer exists on disk' };
  try {
    const { stdout } = await execFileAsync('pg_restore', ['--list', filePath], { timeout: 60 * 1000 });
    const entryCount = stdout.split('\n').filter((l) => l.trim().length > 0).length;
    return { ok: entryCount > 0, detail: `${entryCount} catalog entries readable` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'pg_restore --list failed' };
  }
}
