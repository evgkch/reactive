import { Struct, Batch } from "../../src/index.js";

const user = Struct({ name: "alice", age: 25 });

// Only tracks properties it reads
Batch(() => {
  // tracks 'name' only
  user.name;
});

user.name = "bob"; // → Batch reruns
user.age = 30; // → Batch does NOT rerun
