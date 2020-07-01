const visit = require("unist-util-visit");
const remark = require("remark");
const frontmatter = require("remark-frontmatter");
const remark2rehype = require("remark-rehype");
const raw = require("rehype-raw");
const stringify = require("rehype-stringify");
const toString = require("hast-util-to-string");
const is = require("hast-util-is-element");
const GithubSlugger = require("github-slugger");

const slugger = new GithubSlugger();

function resolveHeadingSlugs(markdownContent) {
  slugger.reset();

  const anchors = [];

  function resolve() {
    return (tree) => {
      visit(tree, "element", (node) => {
        if (is(node, ["h1", "h2", "h3", "h4", "h5", "h6"])) {
          anchors.push(
            slugger.slug(toString(node)).replace(/[^#-\w\u4E00-\u9FFF]*/g, "")
          );
        }
      });
    };
  }

  remark()
    .use(frontmatter)
    .use(remark2rehype, { allowDangerousHtml: true })
    .use(raw)
    .use(resolve)
    .use(stringify)
    .processSync(markdownContent);

  return anchors;
}

module.exports = {
  resolveHeadingSlugs,
};
