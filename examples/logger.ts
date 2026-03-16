import { Batch, Watch, PREFIX, type ReactiveLogger } from "../src/index.js";

const logger: ReactiveLogger = {
  log(message: string, meta?: object): void {
    if (meta && Object.keys(meta).length > 0) {
      // eslint-disable-next-line no-console
      console.log(PREFIX, message, meta);
    } else {
      // eslint-disable-next-line no-console
      console.log(PREFIX, message);
    }
  },
};

Batch.logger = logger;
Watch.logger = logger;

export {};
