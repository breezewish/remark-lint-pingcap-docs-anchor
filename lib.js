const visit = require("unist-util-visit");
const remark = require("remark");
const toString = require("mdast-util-to-string");
const slugs = require(`github-slugger`)();

const reAnchor = /[^-\w\u4E00-\u9FFF]*/g; // with CJKLanguage

function resolveHeadingSlugs(markdownContent) {
  slugs.reset();

  const anchors = [];

  function resolve() {
    return (tree) => {
      visit(tree, "heading", (node) => {
        let id;
        if (node.children.length > 0) {
          const last = node.children[node.children.length - 1];
          // This regex matches to preceding spaces and {#custom-id} at the end of a string.
          // Also, checks the text of node won't be empty after the removal of {#custom-id}.
          const match = /^(.*?)\s*\{#([\w-]+)\}$/.exec(toString(last));
          if (match && (match[1] || node.children.length > 1)) {
            id = match[2];
            // Remove the custom ID from the original text.
            if (match[1]) {
              last.value = match[1];
            } else {
              node.children.pop();
            }
          }
        }
        if (!id) {
          id = slugs.slug(toString(node), false);
        }
        anchors.push(id.replace(reAnchor, ""));
      });
    };
  }

  remark().use(resolve).processSync(markdownContent);

  return anchors;
}

module.exports = {
  resolveHeadingSlugs,
};
