// Runner Node THUẦN cho bộ test auto-MC — KHÔNG cần vitest (hữu ích khi máy/CI thiếu
// native binary của vitest/rollup). Chạy: node apps/server/test/run.mjs
import { defineTests } from './scenarios.mjs';

let pass = 0, fail = 0; const fails = [];
defineTests((name, fn) => {
  try { fn(); pass++; console.log('  ✅ ' + name); }
  catch (e) { fail++; fails.push(name); console.log('  ❌ ' + name + '\n     → ' + (e.message || e)); }
});
console.log(`\n──────── KẾT QUẢ: ${pass} pass, ${fail} fail ────────`);
if (fail) { console.log('FAIL: ' + fails.join(' | ')); process.exit(1); }
