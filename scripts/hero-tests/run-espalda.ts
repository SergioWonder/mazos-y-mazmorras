// Runs only the back-view hero tests (fast loop while drawing a rig):
//   node --experimental-strip-types scripts/hero-tests/run-espalda.ts [clase]
import { testEspalda } from './espalda.ts';

const only = process.argv[2];
let failed = 0;
testEspalda((ok, msg) => {
  if (only && !msg.startsWith(only) && !msg.startsWith('strandEdges') && !msg.startsWith('cada clase')) return;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
});
process.exit(failed ? 1 : 0);
