import fs from "fs";
import path from "path";

// The hub's canvas build (canvas/build.sh) checks this too, so the test skips, saying so, when the hub is not on this machine.
const hubFile = path.resolve(
  __dirname,
  "../../../kovaforge-home/worktrees/canvas-diagrams/src/canvas/diagram.ts",
);
const hubMainFile = path.resolve(
  __dirname,
  "../../../kovaforge-home/src/canvas/diagram.ts",
);

describe("diagram.ts copy contract", () => {
  const source = [hubFile, hubMainFile].find((file) => fs.existsSync(file));

  if (!source) {
    it.skip("SKIPPED: the kovaforge-home checkout is not next to this repo; canvas/build.sh checks the copy instead", () => {});
    return;
  }

  it("is byte-identical to the hub's src/canvas/diagram.ts", () => {
    expect(
      fs
        .readFileSync(path.join(__dirname, "diagram.ts"))
        .equals(fs.readFileSync(source)),
    ).toBe(true);
  });
});
