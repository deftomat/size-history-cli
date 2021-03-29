import { green, red } from 'chalk';
import { execSync } from 'child_process';
import Configstore from 'configstore';
import fs, { Stats } from 'fs';
import prettyBytes from 'pretty-bytes';
import { calculateBrotliSize, calculateGzipSize, canCompress } from './compression';

const storeLimits = { entries: 250, history: 10 };

// eslint-disable-next-line @typescript-eslint/no-require-imports
const store = new Configstore(require('../../package.json').name, { file: [], dir: [] });

export interface SizeWithHistory {
  readonly current: Size;
  readonly history: HistorySize[];
}

export interface Size {
  readonly real: number;
  readonly gzip?: number;
  readonly brotli?: number;
}

export interface HistorySize extends Size {
  readonly at: number;
}

export async function getSizeWithHistory(path: string): Promise<SizeWithHistory> {
  const stats = fs.lstatSync(path);

  if (stats.isFile()) {
    const current = await calculateFileSize(path, stats);
    const history = readHistory(path, 'file');
    pushHistory(path, current, 'file');
    return { current, history: maskHistory(current, history) };
  }
  const current = calculateDirSize(path);
  const history = readHistory(path, 'dir');
  pushHistory(path, current, 'dir');
  return { current, history: maskHistory(current, history) };
}

export function formatSize(value?: number, previous?: number) {
  if (value == null) return '';
  if (previous == null) return prettyBytes(value);

  const diff = value - previous;
  if (diff === 0) return prettyBytes(value);
  if (diff > 0) return `${prettyBytes(value)} (${red(`+${prettyBytes(diff)}`)})`;
  return `${prettyBytes(value)} (${green(prettyBytes(diff))})`;
}

function maskHistory(current: Size, history: HistorySize[]) {
  const reversed = [...history].reverse();
  if (reversed[0] && areSizesEqual(current, reversed[0])) {
    return reversed.splice(1, reversed.length);
  }
  return reversed;
}

function areSizesEqual(a: Size, b: Size) {
  return a.real === b.real && a.gzip === b.gzip && a.brotli === b.brotli;
}

async function calculateFileSize(filename: string, fileStats: Stats): Promise<Size> {
  const compressible = canCompress(filename, fileStats.size);

  if (compressible) {
    const content = fs.readFileSync(filename);

    const [gzip, brotli] = await Promise.all([
      calculateGzipSize(content),
      calculateBrotliSize(content)
    ]);

    return { real: fileStats.size, gzip, brotli };
  }

  return { real: fileStats.size };
}

function calculateDirSize(path: string): Size {
  const size = execSync(`ls -anR "${path}" | grep -v '^d' | awk '{total += $5} END {print total}'`)
    .toString()
    .trim();

  return {
    real: size === '' ? 0 : parseInt(size)
  };
}

function readHistory(path: string, type: HistoryEntryType): HistorySize[] {
  const entries = store.get(type);
  const entry = entries.find(entry => entry.path === path);
  return entry ? entry.history : [];
}

function pushHistory(path: string, size: Size, type: HistoryEntryType) {
  const now = Date.now();

  const entries = store.get(type);
  const entryIndex = entries.findIndex(entry => entry.path === path);
  const historyEntry: HistorySize = { at: now, ...size };

  if (entryIndex === -1) {
    entries.push({ path, history: [historyEntry] });
    store.set(type, entries.slice(-storeLimits.entries));
  } else {
    const entry = entries[entryIndex];
    const lastHistoryEntry = entry.history[entry.history.length - 1];
    if (areSizesEqual(lastHistoryEntry, historyEntry)) {
      lastHistoryEntry.at = now;
    } else {
      entry.history = [...entry.history, historyEntry].slice(-storeLimits.history);
      entries.splice(entryIndex, 1);
      entries.push(entry);
    }
    store.set(type, entries);
  }
}

type HistoryEntryType = 'file' | 'dir';
