import { List, Watch } from "../../src/index.js";

const list = List([1, 2, 3]);

// Watch applies patches to the list
Watch(list, () => {});

list.push(4); // view updated synchronously
list.splice(0, 1); // view updated synchronously
