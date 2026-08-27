import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

const masterServerPath = "/home/ubuntu/fizuxcoder-master-server/MasterServer.py";
const shortcutGuidePath = "/home/ubuntu/upload/iOS_Shortcut_MasterServer_Update_Guide.md";

describe("account-scoped MasterServer runtime update contract", () => {
  it("requires account identity and persists overrides separately from shared config", async () => {
    const source = await readFile(masterServerPath, "utf8");
    expect(source).toContain("ACCOUNT_CONFIG_FILE");
    expect(source).toContain('data.get("account_number", data.get("account", ""))');
    expect(source).toContain('account_number is required and must be numeric');
    expect(source).toContain("verify_license(account_number)");
    expect(source).toContain("save_account_configs(account_configs)");
    expect(source).not.toContain("save_config(configs)\n    print(f\"📲 MANUAL IOS UPDATE APPLIED");
  });

  it("applies account overrides after the shared symbol configuration", async () => {
    const source = await readFile(masterServerPath, "utf8");
    expect(source).toContain("actual_config.update(override)");
    expect(source).toContain('account_entry = account_configs.get(str(account), {})');
  });

  it("documents the required Shortcut account_number field", async () => {
    const guide = await readFile(shortcutGuidePath, "utf8");
    expect(guide).toContain('"account_number": "230069105"');
    expect(guide).toContain("MT5 account number to update");
    expect(guide).toContain("ea_account_config.json");
    expect(guide).toContain("sent only for MT5 account 230069105");
  });
});
