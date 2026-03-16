await import("./logger.ts");

const examples = [
  "01-value",
  "02-struct",
  "03-list",
  "04-batch",
  "05-watch",
  "06-composition",
  "07-lifecycle",
  "08-custom-primitive",
] as const;

for (const example of examples) {
  // eslint-disable-next-line no-console
  console.log(`\n--- ${example} ---`);
  // eslint-disable-next-line no-await-in-loop
  await import(`./${example}/index.ts`);
}

export {};

