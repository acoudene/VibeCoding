import type { IdGenerator } from "../../domain/id-generator";

export const nextId = (ids: IdGenerator): string => ids.next();
