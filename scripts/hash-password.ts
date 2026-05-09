import { createHash } from "node:crypto";
import { createInterface } from "node:readline";

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const password = (await prompt("Password: ")).trim();
  if (!password) {
    console.error("Password cannot be empty.");
    process.exit(1);
  }
  const hash = createHash("sha256").update(password, "utf8").digest("hex");
  console.log("");
  console.log("Add this line to your .env file (in repo root):");
  console.log("");
  console.log(`VITE_SITE_PASSWORD_HASH=${hash}`);
  console.log("");
}

main();
