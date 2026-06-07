import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { desc, eq } from "drizzle-orm";
import type { CallLog, DecisionKind, Action, Prefix } from "@/domain/types";
import { DuplicatePrefixError, type Repo } from "./repo";
import { prefixes, callLogs } from "./schema";

/** Implémentation Postgres (Neon) via Drizzle (FR-4, FR-5). */
export class PgRepo implements Repo {
  private db: PostgresJsDatabase;

  constructor(connectionString: string) {
    const client = postgres(connectionString, { prepare: false });
    this.db = drizzle(client);
  }

  async listPrefixes(): Promise<Prefix[]> {
    const rows = await this.db.select().from(prefixes).orderBy(prefixes.value);
    return rows.map(toPrefix);
  }

  async addPrefix(value: string, label?: string | null): Promise<Prefix> {
    try {
      const [row] = await this.db
        .insert(prefixes)
        .values({ value, label: label ?? null })
        .returning();
      return toPrefix(row);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) throw new DuplicatePrefixError(value);
      throw err;
    }
  }

  async removePrefix(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(prefixes)
      .where(eq(prefixes.id, id))
      .returning({ id: prefixes.id });
    return rows.length > 0;
  }

  async insertLog(log: Omit<CallLog, "id" | "createdAt">): Promise<CallLog> {
    const [row] = await this.db
      .insert(callLogs)
      .values({
        rawNumber: log.rawNumber,
        normalized: log.normalized,
        decision: log.decision,
        action: log.action,
        matchedPrefix: log.matchedPrefix,
        spam: log.spam,
      })
      .returning();
    return toLog(row);
  }

  async listLogs(limit = 100): Promise<CallLog[]> {
    const rows = await this.db
      .select()
      .from(callLogs)
      .orderBy(desc(callLogs.createdAt))
      .limit(limit);
    return rows.map(toLog);
  }
}

function toPrefix(row: typeof prefixes.$inferSelect): Prefix {
  return { id: row.id, value: row.value, label: row.label, createdAt: row.createdAt };
}

function toLog(row: typeof callLogs.$inferSelect): CallLog {
  return {
    id: row.id,
    rawNumber: row.rawNumber,
    normalized: row.normalized,
    decision: row.decision as DecisionKind,
    action: row.action as Action,
    matchedPrefix: row.matchedPrefix,
    spam: row.spam,
    createdAt: row.createdAt,
  };
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}
