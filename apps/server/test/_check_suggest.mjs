/* Kiểm tra suggestRoleCounts đảm bảo tổng = n và tỷ lệ Sói 20-30% */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '..', 'src', 'index.js'), 'utf8');
/* Extract function block bằng cách eval trong isolated context */
const m = src.match(/function suggestRoleCounts\(n\) \{[\s\S]*?\n\}/);
if (!m) { console.error('Không tìm thấy suggestRoleCounts'); process.exit(1); }
const fn = new Function('n', m[0].replace(/^function suggestRoleCounts\(n\) \{/, '').replace(/\}$/, ''));

const WOLF_IDS = new Set(['wolf', 'alpha', 'wolfseer', 'wolfcub', 'whitewolf', 'cursedwolf',
  'hellhound', 'direwolf', 'sorcerer', 'hypnowolf', 'bigbadwolf', 'poisonwolf',
  'gatekeeper', 'minion', 'deserter', 'traitor']);

const cases = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
let allOk = true;
console.log('n | total | wolf% | roles');
console.log('-'.repeat(80));
for (const n of cases) {
  const c = fn(n);
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  const wolfN = Object.entries(c).filter(([k]) => WOLF_IDS.has(k)).reduce((a, [, v]) => a + v, 0);
  const wolfPct = ((wolfN / n) * 100).toFixed(0);
  const roles = Object.entries(c).map(([k, v]) => `${k}:${v}`).join(' ');
  const ok = total === n && wolfN >= 1 && wolfN <= Math.ceil(n * 0.35);
  if (!ok) allOk = false;
  console.log(`${String(n).padStart(2)} | ${String(total).padStart(2)}    | ${wolfPct.padStart(3)}%  | ${roles} ${ok ? '' : '❌'}`);
}
console.log(allOk ? '\n✅ Tất cả case tổng khớp n và tỷ lệ Sói 20-35%' : '\n❌ Có case sai');
process.exit(allOk ? 0 : 1);
