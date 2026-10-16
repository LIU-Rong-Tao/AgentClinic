import { copyFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../src/db/migrations/', import.meta.url));
const destination = fileURLToPath(
  new URL('../dist/db/migrations/', import.meta.url),
);
mkdirSync(destination, { recursive: true });

// 仅移除构建目录中的旧 SQL 文件，防止已移除的资源残留。
for (const entry of readdirSync(destination, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.sql')) {
    unlinkSync(join(destination, entry.name));
  }
}
for (const entry of readdirSync(source, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.sql')) {
    copyFileSync(join(source, entry.name), join(destination, entry.name));
  }
}
