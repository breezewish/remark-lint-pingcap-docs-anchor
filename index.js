const path = require("path");
const fs = require("fs");
const rule = require("unified-lint-rule");
const visit = require("unist-util-visit");
const didYouMean = require("didyoumean2").default;

const lib = require("./lib");

const fileAnchors = {};

function resolveHeadingSlugs(content) {
  const slugs = lib.resolveHeadingSlugs(content);
  const r = {};
  slugs.forEach((s) => {
    r[s] = true;
  });
  return r;
}

function checkAnchorCurrentFile(file, node, url, currentFileAnchors) {
  const anchor = url.substring(1);
  if (currentFileAnchors[anchor] == undefined) {
    let msg = `Dead anchor: ${url}`;
    const suggestion = didYouMean(anchor, Object.keys(currentFileAnchors), {
      threshold: 0.7,
    });
    if (suggestion) {
      msg += `. Did you mean #${suggestion}`;
    }
    file.message(msg, node);
  }
}

function checkAnchorRemoteFile(file, node, url) {
  const [realPath, anchor] = path.join(process.cwd(), url).split("#");
  try {
    fs.accessSync(realPath);
  } catch (err) {
    file.message(`Dead link: ${url}`, node);
    return;
  }

  if (fileAnchors[realPath] == undefined) {
    fileAnchors[realPath] = resolveHeadingSlugs(fs.readFileSync(realPath));
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
}

function checkPingCAPDocsAnchors(ast, file) {
  const currentFileAnchors = resolveHeadingSlugs(file.contents);

  visit(ast, ["link", "definition"], (node) => {
    const url = node.url;
    if (!url) {
      return;
    }
    if (url.indexOf("#") === 0) {
      checkAnchorCurrentFile(file, node, url, currentFileAnchors);
      return;
    }
    if (
      url.indexOf("/") === 0 &&
      url.indexOf(".md") > -1 &&
      url.indexOf("#") > -1
    ) {
      checkAnchorRemoteFile(file, node, url);
    }
  });
}

module.exports = rule(
  "remark-lint:pingcap-docs-anchors",
  checkPingCAPDocsAnchors
);
