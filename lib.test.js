const lib = require("./lib");

test("resolve heading slugs in markdown", () => {
  const slugs = lib.resolveHeadingSlugs(`
# Title 1

# Title 1

## 第 1 步：部署 TiDB 集群

## \`code-abc\`

### \`allow-auto-random\` <span class="version-mark">从 v3.1.0 版本开始引入</span>

### [sql2kv] sql encode error = [types:1292]invalid time format: '{1970 1 1 …}'

### \`[Error 8025: entry too large, the max entry size is 6291456]\`
  `);
  expect(slugs).toEqual([
    "title-1",
    "title-1-1",
    "第-1-步部署-tidb-集群",
    "code-abc",
    "allow-auto-random-从-v310-版本开始引入",
    "sql2kv-sql-encode-error--types1292invalid-time-format-1970-1-1-",
    "error-8025-entry-too-large-the-max-entry-size-is-6291456",
  ]);
});
