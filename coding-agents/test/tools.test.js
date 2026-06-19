import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTools, safeResolve } from "../src/tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.join(__dirname, "fixtures");
const fixtureProjectRoot = path.join(fixturesRoot, "sample-project");
const outsideFile = path.join(fixturesRoot, "outside.txt");

describe("safeResolve", () => {
  it("resolves paths inside the project root", () => {
    expect(safeResolve(fixtureProjectRoot, "src/index.js")).toBe(path.join(fixtureProjectRoot, "src/index.js"));
    expect(safeResolve(fixtureProjectRoot, ".")).toBe(fixtureProjectRoot);
  });

  it("rejects path traversal attempts", () => {
    expect(() => safeResolve(fixtureProjectRoot, "../outside.txt")).toThrow(/escapes project root/);
    expect(() => safeResolve(fixtureProjectRoot, "../../outside.txt")).toThrow(/escapes project root/);
    expect(() => safeResolve(fixtureProjectRoot, outsideFile)).toThrow(/escapes project root/);
  });
});

describe("project tools", () => {
  let projectRoot;
  let tempRoot;
  let tools;

  beforeAll(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tools-test-"));
    projectRoot = path.join(tempRoot, "sample-project");
    await fs.mkdir(path.join(projectRoot, "src"), { recursive: true });
    await fs.copyFile(path.join(fixtureProjectRoot, "README.md"), path.join(projectRoot, "README.md"));
    await fs.copyFile(path.join(fixtureProjectRoot, "src/index.js"), path.join(projectRoot, "src/index.js"));
    const largeReadFile = path.join(projectRoot, "large-read.txt");
    const largeSearchFile = path.join(projectRoot, "large-search.txt");
    await fs.writeFile(largeReadFile, "x".repeat(80_001), "utf8");
    await fs.writeFile(largeSearchFile, `${"x".repeat(250_001)}hidden needle`, "utf8");
    tools = createTools({ root: projectRoot });
  });

  afterAll(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  describe("list_files", () => {
    it("lists files below the project root", async () => {
      const result = await tools.list_files.run();

      expect(result.root).toBe(projectRoot);
      expect(result.files).toEqual(expect.arrayContaining([
        "README.md",
        "src/index.js"
      ]));
    });

    it("honors the limit option", async () => {
      const result = await tools.list_files.run({ limit: 1 });

      expect(result.files).toHaveLength(1);
    });

    it("rejects missing directories and files used as directories", async () => {
      await expect(tools.list_files.run({ directory: "missing" })).rejects.toThrow(/ENOENT/);
      await expect(tools.list_files.run({ directory: "README.md" })).rejects.toThrow(/not a directory/);
    });

    it("rejects traversal outside the project root", async () => {
      await expect(tools.list_files.run({ directory: ".." })).rejects.toThrow(/escapes project root/);
    });
  });

  describe("read_file", () => {
    it("reads a UTF-8 file below the project root", async () => {
      const result = await tools.read_file.run({ path: "src/index.js" });

      expect(result.path).toBe("src/index.js");
      expect(result.content).toContain("safety beacon");
    });

    it("requires a path and rejects missing files or directories", async () => {
      await expect(tools.read_file.run()).rejects.toThrow(/requires a path/);
      await expect(tools.read_file.run({ path: "missing.txt" })).rejects.toThrow(/ENOENT/);
      await expect(tools.read_file.run({ path: "src" })).rejects.toThrow(/not a file/);
    });

    it("rejects traversal outside the project root", async () => {
      await expect(tools.read_file.run({ path: "../outside.txt" })).rejects.toThrow(/escapes project root/);
    });

    it("rejects files that are too large to read safely", async () => {
      await expect(tools.read_file.run({ path: "large-read.txt" })).rejects.toThrow(/too large to read safely/);
    });
  });

  describe("search_text", () => {
    it("finds literal text matches with line numbers", async () => {
      const result = await tools.search_text.run({ query: "safety beacon" });

      expect(result.matches).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: "README.md", line: 3 }),
        expect.objectContaining({ path: "src/index.js", line: 5 })
      ]));
    });

    it("finds regular expression matches", async () => {
      const result = await tools.search_text.run({ query: "greet\\(name\\)", regex: true });

      expect(result.matches).toEqual([
        expect.objectContaining({ path: "src/index.js", line: 1 })
      ]);
    });

    it("requires a query and rejects invalid directories or traversal", async () => {
      await expect(tools.search_text.run()).rejects.toThrow(/requires a query/);
      await expect(tools.search_text.run({ query: "needle", directory: "missing" })).rejects.toThrow(/ENOENT/);
      await expect(tools.search_text.run({ query: "outside", directory: ".." })).rejects.toThrow(/escapes project root/);
    });

    it("skips files that are too large to search safely", async () => {
      const result = await tools.search_text.run({ query: "hidden needle" });

      expect(result.matches).toEqual([]);
    });
  });

  describe("propose_patch", () => {
    it("returns a review-only patch proposal without applying it", async () => {
      const result = await tools.propose_patch.run({
        summary: "Change greeting",
        patch: "--- a/src/index.js\n+++ b/src/index.js\n"
      });

      expect(result).toEqual({
        summary: "Change greeting",
        patch: "--- a/src/index.js\n+++ b/src/index.js\n",
        applied: false,
        note: "Patch proposal only. Review before applying."
      });
    });
  });
});
