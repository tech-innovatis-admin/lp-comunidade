import { readFile } from 'fs/promises';
import path from 'path';

let cachedLetterhead: Buffer | null = null;

export async function getLetterheadImageBytes(): Promise<Buffer> {
  if (!cachedLetterhead) {
    cachedLetterhead = await readFile(path.join(process.cwd(), 'public', 'timbrado.png'));
  }

  return cachedLetterhead;
}
