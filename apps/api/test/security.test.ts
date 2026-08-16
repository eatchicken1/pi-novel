import { describe, expect, it } from "vitest";
import { assertLoopbackHost } from "../src/host-policy.ts";

describe("loopback host policy", () => {
	it("SEC1: accepts loopback addresses", () => {
		expect(() => assertLoopbackHost("127.0.0.1")).not.toThrow();
		expect(() => assertLoopbackHost("localhost")).not.toThrow();
		expect(() => assertLoopbackHost("::1")).not.toThrow();
	});
	it("SEC1: rejects non-loopback bind hosts", () => {
		expect(() => assertLoopbackHost("0.0.0.0")).toThrow();
		expect(() => assertLoopbackHost("192.168.1.10")).toThrow();
		expect(() => assertLoopbackHost("example.com")).toThrow();
	});
});