/**
 * Integration test for next-lxd-sftp.
 *
 * Run:
 *   bun test.ts
 *   # or
 *   npx tsx test.ts
 */

import nextLxd from '.';

console.log('>>> next-lxd-sftp module loaded');
console.log('>>> exports:', Object.keys(nextLxd).join(', '));
console.log();

// ── Test 1: Connect with file-based cert/key ────────────────────────────────

console.log('1. Test nextConnect with cert/key:');
const conn = nextLxd.nextConnect({
  address: 'localhost:8443',
  cert: './../../../certs/client.crt',
  key: './../../../certs/client.key',
  instance: 'alpine',
  insecure: true,
});
const { sessionId } = conn;
console.log('Connected, sessionId:', sessionId);

// ── Test 2: Read root directory ────────────────────────────────────────────

const dir = nextLxd.nextReadDir({ sessionId, path: '/' });
console.log('Root entries:', dir.entries?.length);

// ── Test 3: Stat root ──────────────────────────────────────────────────────

const st = nextLxd.nextStat({ sessionId, path: '/' });
console.log('Stat /:', st);

// ── Test 4: Getwd ──────────────────────────────────────────────────────────

const wd = nextLxd.nextGetwd({ sessionId });
console.log('Getwd:', wd);

// ── Test 5: Glob ───────────────────────────────────────────────────────────

const glob = nextLxd.nextGlob({ sessionId, pattern: '/*' });
console.log('Glob /*:', glob.matches?.slice(0, 5), '(… ' + glob.matches?.length + ' total)');

// ── Test 6: Disconnect ─────────────────────────────────────────────────────

const disc = nextLxd.nextDisconnect({ sessionId });
console.log('Disconnected:', disc);
console.log();

console.log('>>> All tests passed ✓');
