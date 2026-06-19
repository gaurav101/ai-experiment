import { promises as fs } from "node:fs";
import path from "node:path";

const DEFAULT_IGNORES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".cache"
]);

const MAX_READ_BYTES = 80_000;
const MAX_SEARCH_FILE_BYTES = 250_000;

export function createTools({ root }) {
  const projectRoot = path.resolve(root);

  return {
    list_files: {
      description: "List project files below the root directory.",
      parameters: {
        directory: "Optional directory relative to project root.",
        limit: "Optional max number of files, default 200."
      },
      run: async ({ directory = ".", limit = 200 } = {}) => {
        const start = safeResolve(projectRoot, directory);
        const stat = await fs.stat(start);
        if (!stat.isDirectory()) {
          throw new Error(`${directory} is not a directory`);
        }

        const files = [];
        await walkFiles(start, projectRoot, files, Number(limit) || 200);
        return {
          root: projectRoot,
          files
        };
      }
    },

    read_file: {
      description: "Read a UTF-8 text file from inside the project root.",
      parameters: {
        path: "File path relative to project root."
      },
      run: async ({ path: filePath } = {}) => {
        if (!filePath) {
          throw new Error("read_file requires a path");
        }

        const absolutePath = safeResolve(projectRoot, filePath);
        const stat = await fs.stat(absolutePath);
        if (!stat.isFile()) {
          throw new Error(`${filePath} is not a file`);
        }
        if (stat.size > MAX_READ_BYTES) {
          throw new Error(`${filePath} is too large to read safely (${stat.size} bytes)`);
        }

        return {
          path: path.relative(projectRoot, absolutePath),
          content: await fs.readFile(absolutePath, "utf8")
        };
      }
    },

    search_text: {
      description: "Search project text files for a literal string or JavaScript regular expression.",
      parameters: {
        query: "Text or regex pattern to search for.",
        regex: "Boolean. When true, query is treated as a JavaScript RegExp.",
        directory: "Optional directory relative to project root.",
        limit: "Optional max number of matches, default 50."
      },
      run: async ({ query, regex = false, directory = ".", limit = 50 } = {}) => {
        if (!query) {
          throw new Error("search_text requires a query");
        }

        const start = safeResolve(projectRoot, directory);
        const files = [];
        await walkFiles(start, projectRoot, files, 1000);

        const matcher = regex
          ? new RegExp(query)
          : { test: (line) => line.includes(query) };

        const matches = [];
        for (const relativeFile of files) {
          if (matches.length >= limit) break;

          const absoluteFile = safeResolve(projectRoot, relativeFile);
          const stat = await fs.stat(absoluteFile);
          if (stat.size > MAX_SEARCH_FILE_BYTES) continue;

          let content;
          try {
            content = await fs.readFile(absoluteFile, "utf8");
          } catch {
            continue;
          }

          const lines = content.split(/\r?\n/);
          for (let index = 0; index < lines.length; index += 1) {
            if (matcher.test(lines[index])) {
              matches.push({
                path: relativeFile,
                line: index + 1,
                text: lines[index]
              });
              if (matches.length >= limit) break;
            }
          }
        }

        return { matches };
      }
    },

    propose_patch: {
      description: "Return a proposed unified diff. This tool never writes files.",
      parameters: {
        summary: "Short description of the intended change.",
        patch: "Unified diff proposal."
      },
      run: async ({ summary = "Proposed change", patch = "" } = {}) => {
        return {
          summary,
          patch,
          applied: false,
          note: "Patch proposal only. Review before applying."
        };
      }
    }
  };
}

export function safeResolve(root, requestedPath) {
  const absolute = path.resolve(root, requestedPath);
  const relative = path.relative(root, absolute);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes project root: ${requestedPath}`);
  }

  return absolute;
}

async function walkFiles(directory, root, files, limit) {
  if (files.length >= limit) return;

  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (files.length >= limit) break;
    if (DEFAULT_IGNORES.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(root, absolutePath);

    if (entry.isDirectory()) {
      await walkFiles(absolutePath, root, files, limit);
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
}
