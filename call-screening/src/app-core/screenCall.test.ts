import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRepo } from "@/db/memoryRepo";
import { setRepo } from "@/db";
import { screenCall } from "./screenCall";

let repo: MemoryRepo;

beforeEach(() => {
  repo = new MemoryRepo();
  setRepo(repo);
});

describe("screenCall (service applicatif)", () => {
  it("normalise, décide et journalise un appel bloqué", async () => {
    await repo.addPrefix("+33899");
    const result = await screenCall("0899700000");

    expect(result.decision).toBe("BLOCK");
    expect(result.action).toBe("VOICEMAIL");
    expect(result.spam).toBe(true);
    expect(result.matchedPrefix).toBe("+33899");
    expect(result.normalized).toBe("+33899700000");

    const logs = await repo.listLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].rawNumber).toBe("0899700000");
    expect(logs[0].decision).toBe("BLOCK");
    expect(logs[0].spam).toBe(true);
  });

  it("autorise et journalise un appel sans préfixe correspondant", async () => {
    await repo.addPrefix("+33899");
    const result = await screenCall("+33612345678");

    expect(result.decision).toBe("ALLOW");
    const logs = await repo.listLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].decision).toBe("ALLOW");
  });

  it("journalise même un numéro invalide (jamais bloqué)", async () => {
    const result = await screenCall("abc");
    expect(result.decision).toBe("ALLOW");
    expect(result.normalized).toBeNull();
    const logs = await repo.listLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].normalized).toBeNull();
  });

  it("prend en compte un préfixe ajouté juste avant (effet immédiat)", async () => {
    expect((await screenCall("0899700000")).decision).toBe("ALLOW");
    await repo.addPrefix("+33899");
    expect((await screenCall("0899700000")).decision).toBe("BLOCK");
  });
});
