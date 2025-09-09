import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'debug.log');

export function logToFile(label: string, data: any) {
  const timestamp = new Date().toISOString();
  const logEntry = `\n=== ${label} (${timestamp}) ===\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n`;
  try { fs.appendFileSync(LOG_FILE, logEntry); } catch {}
}

export function clearLogFile() {
  try { fs.writeFileSync(LOG_FILE, `=== Yahoo Fantasy API Debug Log ===\nCleared at: ${new Date().toISOString()}\n`); } catch {}
}

