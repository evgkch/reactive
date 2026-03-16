import { List, Watch } from "../../src/index.js";

const items = List([3, 1, 2]);

Watch(items, () => {});

items.push(4); // start: 3, added: [4]
items.splice(0, 1); // start: 0, removed: [3]
items.sort(); // reorder: true
