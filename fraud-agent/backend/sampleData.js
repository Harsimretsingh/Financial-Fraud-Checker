import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getSampleCsvPath() {
  return join(__dirname, 'data', 'sample.csv');
}

export function parseSampleTransactions() {
  const text = readFileSync(getSampleCsvPath(), 'utf8');
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map((line, i) => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = values[j] ?? '';
    });
    if (!obj.id) obj.id = `txn_${Date.now()}_${i}`;
    return obj;
  });
}
