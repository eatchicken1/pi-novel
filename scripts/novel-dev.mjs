import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const localToken = process.env.PI_NOVEL_LOCAL_TOKEN ?? randomBytes(32).toString("hex");
const childEnv = {
	...process.env,
	PI_NOVEL_LOCAL_TOKEN: localToken,
	VITE_PI_NOVEL_LOCAL_TOKEN: localToken,
};
const spawnOptions = { stdio: "inherit", env: childEnv };
function spawnNpm(args) {
	if (process.platform === "win32") {
		return spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `${npmCommand} ${args.join(" ")}`], spawnOptions);
	}
	return spawn(npmCommand, args, spawnOptions);
}

const children = [
	spawnNpm(["run", "novel:api"]),
	spawnNpm(["run", "novel:web"]),
];

let stopping = false;
function stop(exitCode = 0) {
	if (stopping) return;
	stopping = true;
	for (const child of children) child.kill();
	process.exitCode = exitCode;
}

for (const child of children) child.on("exit", (code) => stop(code ?? 1));
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
