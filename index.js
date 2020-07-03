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
  const [relativePath, anchor] = url.split("#");
  let realPath;
  if (path.isAbsolute(relativePath)) {
    realPath = path.join(file.cwd, relativePath);
  } else {
    realPath = path.resolve(file.cwd, file.dirname, relativePath);
  }

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
    if (url.indexOf("//") === 0 || url.indexOf("://") > -1) {
      // Ignore external links
      return;
    }
    if (url.indexOf(".md") === -1 || url.indexOf("#") === -1) {
      // Ignore links not pointing to markdown file or no anchors
      return;
    }

    if (url.indexOf("#") === 0) {
      checkAnchorCurrentFile(file, node, url, currentFileAnchors);
      return;
    }

    checkAnchorRemoteFile(file, node, url);
  });
}

module.exports = rule(
  "remark-lint:pingcap-docs-anchors",
  checkPingCAPDocsAnchors
);
