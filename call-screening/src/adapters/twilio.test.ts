import { describe, it, expect } from "vitest";
import { decisionToTwiML } from "./twilio";
import type { Decision } from "@/domain/types";

const block: Decision = {
  decision: "BLOCK",
  action: "VOICEMAIL",
  spam: true,
  matchedPrefix: "+33899",
  normalized: "+33899700000",
};

const allow: Decision = {
  decision: "ALLOW",
  action: "RING",
  spam: false,
  matchedPrefix: null,
  normalized: "+33612345678",
};

describe("decisionToTwiML (FR-7)", () => {
  it("produit un document TwiML valide", () => {
    const xml = decisionToTwiML(block);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<Response>");
    expect(xml).toContain("</Response>");
  });

  it("renvoie en messagerie / rejette pour un appel bloqué", () => {
    const xml = decisionToTwiML(block);
    // soit un Reject, soit une redirection messagerie : v1 = message + raccrochage poli
    expect(xml).toMatch(/<Reject|<Hangup|<Redirect|voicemail/i);
  });

  it("laisse sonner pour un appel autorisé (pas de rejet)", () => {
    const xml = decisionToTwiML(allow);
    expect(xml).not.toMatch(/<Reject/i);
  });
});
