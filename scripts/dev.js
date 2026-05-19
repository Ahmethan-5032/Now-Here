const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

const commands = [
  { name: "api", args: ["--prefix", "server", "run", "dev"] },
  { name: "web", args: ["--prefix", "client", "run", "dev", "--", "--host", "0.0.0.0"] },
];

const children = commands.map((command) => {
  const child = spawn("npm", command.args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${command.name} sureci ${code} koduyla kapandi.`);
      shutdown(code);
    }
  });

  return child;
});

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
