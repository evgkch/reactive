/**
 * Example: pass your logger. The library calls:
 *   Batcher: logger.log("[reactive] [batch#id:run]"), logger.log("...[batch#id:stop]")
 *   Watcher: logger.log("[reactive] [watch#id:call]", patch), logger.log("...[watch#id:stop]")
 * Run: node examples/logger.js
 */
import { configure, Value, Batch, Watch } from "../dist/index.js";

const logger = {
  log(message, meta) {
    if (meta !== undefined) console.log(message, meta);
    else console.log(message);
  },
};

configure({ log: { logger } });

const x = Value(0);
Batch(() => console.log("x:", x.get()));
Watch(x, (patch) => console.log("patch:", patch.prev, "→", patch.next));

x.set(1);
x.set(2);
configure({ log: false });
x.set(3);
