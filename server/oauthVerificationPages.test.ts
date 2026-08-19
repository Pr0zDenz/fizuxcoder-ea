import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const readClientFile = (name: string) => readFileSync(resolve(projectRoot, "client", "src", name), "utf8");

describe("public OAuth verification pages", () => {
  it("publishes a privacy notice that accurately narrows Gmail access to send-only buyer notices", () => {
    const privacy = readClientFile("pages/Privacy.tsx");
    expect(privacy).toContain("gmail.send");
    expect(privacy).toContain("does not use that permission to read");
    expect(privacy).toContain("xtr0zen@gmail.com");
  });

  it("exposes the privacy and terms routes from both the application router and public home footer", () => {
    const app = readClientFile("App.tsx");
    const home = readClientFile("pages/Home.tsx");
    const terms = readClientFile("pages/Terms.tsx");
    expect(app).toContain('path="/privacy"');
    expect(app).toContain('path="/terms"');
    expect(home).toContain('href="/privacy"');
    expect(home).toContain('href="/terms"');
    expect(terms).toContain("Automated service e-mails");
  });
});
