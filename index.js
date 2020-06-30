const path = require("path");
const fs = require("fs");
const rule = require("unified-lint-rule");
const visit = require("unist-util-visit");
const remark = require("remark");
const frontmatter = require("remark-frontmatter");
const toString = require("mdast-util-to-string");
const GithubSlugger = require("github-slugger");
const didYouMean = require("didyoumean2").default;

const fileAnchors = {};

function anchorResolver(realPath) {
  // One slugger each file
  const slugger = new GithubSlugger();
  return () => {
    return (tree) => {
      visit(tree, ["heading"], (node) => {
        if (node.depth === 1) {
          return;
        }
        const content = toString(node);
        const slug = slugger
          .slug(content)
          .replace(/[^#-\w\u4E00-\u9FFF]*/g, "");
        if (fileAnchors[realPath] == undefined) {
          fileAnchors[realPath] = {};
        }
        fileAnchors[realPath][slug] = true;
      });
    };
  };
}

function resolveFileAnchors(realPath) {
  remark()
    .use(frontmatter)
    .use(anchorResolver(realPath))
    .processSync(fs.readFileSync(realPath));
}

function checkPingCAPDocsAnchors(ast, file) {
  visit(ast, ["link", "definition"], (node) => {
    const url = node.url;
    if (!url || url.indexOf("/") !== 0) {
      return;
    }
    if (url.indexOf(".md") === -1) {
      return;
    }
    if (url.indexOf("#") === -1) {
      return;
    }

    const [realPath, anchor] = path.join(process.cwd(), url).split("#");
    try {
      fs.accessSync(realPath);
    } catch (err) {
      file.message(`Dead link: ${url}`, node);
      return;
    }

    if (fileAnchors[realPath] == undefined) {
      resolveFileAnchors(realPath);
    }

    if (
      fileAnchors[realPath] == undefined || // no anchors in the referenced file
      fileAnchors[realPath][anchor] == undefined
    ) {
      let msg = `Dead anchor: ${url}`;
      if (fileAnchors[realPath] != undefined) {
        const matchList = Object.keys(fileAnchors[realPath]);
        const suggestion = didYouMean(anchor, matchList);
        if (suggestion) {
          msg += `\nDid you mean #${suggestion} ?`;
        }
        msg +=
          "\nNote: anchors in the file are: \n" +
          matchList.map((n) => `#${n}`).join("\n");
      }
      file.message(msg, node);
    }
  });
}

module.exports = rule(
  "remark-lint:pingcap-docs-anchors",
  checkPingCAPDocsAnchors
);
