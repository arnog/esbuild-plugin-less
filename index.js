const path = require("path");
const fs = require("fs").promises;
const less = require("less");

const importRegex = /@import(?:\s+\((.*)\))?\s+['"](.*)['"]/;
const globalImportRegex = /@import(?:\s+\((.*)\))?\s+['"](.*)['"]/g;
const importCommentRegex = /(?:\/\*(?:[\s\S]*?)\*\/)|(\/\/(?:.*)$)/gm;

const extWhitelist = [".css", ".less"];

/** Recursively get .less/.css imports from file */
function getLessImports(filePath) {
  try {
    const dir = path.dirname(filePath);
    const content = fs.readFileSync(filePath).toString("utf8");

    const cleanContent = content.replace(importCommentRegex, "");
    const match = cleanContent.match(globalImportRegex) ?? [];

    const fileImports = match
      .map((el) => {
        const match = el.match(importRegex);
        return match[2];
      })
      .filter((el) => !!el)
      // NOTE: According to the docs, extensionless imports are interpreted as '.less' files.
      // http://lesscss.org/features/#import-atrules-feature-file-extensions
      // https://github.com/iam-medvedev/esbuild-plugin-less/issues/13
      .map((el) => path.resolve(dir, path.extname(el) ? el : `${el}.less`));

    const recursiveImports = fileImports.reduce((result, el) => {
      return [...result, ...getLessImports(el)];
    }, fileImports);

    const result = recursiveImports.filter((el) =>
      extWhitelist.includes(path.extname(el).toLowerCase())
    );

    return result;
  } catch (e) {
    return [];
  }
}

/** Convert less error into esbuild error */
function convertLessError(error) {
  const sourceLine = error.extract.filter((line) => line);
  const lineText = sourceLine.length === 3 ? sourceLine[1] : sourceLine[0];

  return {
    text: error.message,
    location: {
      namespace: "file",
      file: error.filename,
      line: error.line,
      column: error.column,
      lineText,
    },
  };
}

module.exports = (options = {}) => {
  return {
    name: "css-file",
    setup(buildArg) {
      buildArg.onResolve({ filter: /\.less$/, namespace: "file" }, (args) => {
        const filePath = path.resolve(
          process.cwd(),
          path.relative(process.cwd(), args.resolveDir),
          args.path
        );

        return {
          path: filePath,
          watchFiles: !!buildArg.initialOptions.watch
            ? [filePath, ...getLessImports(filePath)]
            : undefined,
        };
      });

      buildArg.onLoad(
        { filter: /\.less$/, namespace: "file" },
        async (args) => {
          const content = await fs.readFile(args.path, "utf-8");
          const dir = path.dirname(args.path);
          const filename = path.basename(args.path);
          try {
            const result = await less.render(content, {
              filename,
              rootpath: dir,
              ...options,
              paths: [...(options.paths ?? []), dir],
            });

            return {
              contents: result.css,
              loader: "text",
              resolveDir: dir,
            };
          } catch (e) {
            return {
              errors: [convertLessError(e)],
              resolveDir: dir,
            };
          }
        }
      );
    },
  };
};
