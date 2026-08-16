// Loopback-only 安全策略：非 loopback bind 直接拒绝（SEC1）。
export function assertLoopbackHost(host: string): void {
	const normalized = host.trim().toLowerCase();
	const allowed = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
	if (!allowed.has(normalized)) {
		throw new Error("PI_NOVEL_API_HOST must be a loopback address (127.0.0.1, localhost or ::1); refusing to bind a non-loopback interface");
	}
}
