// Test AUTO-MC toàn diện: chạy trọn ván cho TỪNG vai trong 22 vai + cơ chế đặc thù.
// Chạy: pnpm --filter @masoi/server test   (hoặc không cần vitest: node apps/server/test/run.mjs)
import { describe, it } from 'vitest';
import { defineTests } from './scenarios.mjs';

describe('Room auto-MC — 22 vai chạy trọn ván + cơ chế', () => {
  defineTests((name, fn) => it(name, fn));
});
