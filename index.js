const path = require("path");
const fs = require("fs");
const rule = require("unified-lint-rule");
const visit = require("unist-util-visit");
const didYouMean = require("didyoumean2").default;

const lib = require("./lib");

const fileAnchors = {};

function resolveFileAnchors(realPath) {
  const slugs = lib.resolveHeadingSlugs(fs.readFileSync(realPath));
  const anchors = {};
  slugs.forEach((s) => {
    anchors[s] = true;
  });
  fileAnchors[realPath] = anchors;
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
        const suggestion = didYouMean(
          anchor,
          Object.keys(fileAnchors[realPath]),
          {
            threshold: 0.7,
          }
        );
        if (suggestion) {
          msg += `. Did you mean #${suggestion}`;
        }
      }
      file.message(msg, node);
    }
  });
}

module.exports = rule(
  "remark-lint:pingcap-docs-anchors",
  checkPingCAPDocsAnchors
);
