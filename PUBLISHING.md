# 发布到 npm

## 准备独立仓库

将本插件目录作为 `HuParry/hydrooj-countdown-plus` 仓库的根目录上传。工作流应位于仓库根目录的 `.github/workflows/publish.yml`，不要再套一层 `packages/`。

包名为 `hydrooj-countdown-plus`，npm registry 为 `https://registry.npmjs.org/`。

## 首次发布

新包还没有 npm Trusted Publisher 配置时，可以在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加 `NPM_TOKEN`。它必须有创建、发布这个包所需的写入权限，并允许在 CI 中发布。不要将 token 写入文件或提交到仓库。

工作流会使用这个 secret 完成首次发布。也可以先登录 npm，在插件目录执行 `npm publish --access public --workspaces=false`，再配置下方的 Trusted Publisher。

## 配置 Trusted Publisher

首次发布后，在 npm 包的 **Settings → Trusted publishing** 添加 GitHub Actions：

- Organization or user：`HuParry`
- Repository：`hydrooj-countdown-plus`
- Workflow filename：`publish.yml`
- Environment name：留空
- Allowed actions：允许直接 `npm publish`

配置完成后可以移除 GitHub 中的 `NPM_TOKEN`，后续工作流会使用 OIDC 发布。工作流已配置 `id-token: write`、GitHub 托管的 runner、Node.js 24 和 npm 11。

参考：[npm Trusted publishing 官方说明](https://docs.npmjs.com/trusted-publishers/)。

## 发布版本

1. 修改 `package.json` 中的 `version`，每次发布使用尚未发布过的新版本。
2. 在插件目录执行 `npm run check:publish --workspaces=false`，确认安装包包含源码、模板、`prompt.txt` 和许可文件。
3. 提交代码，推送与版本号一致的标签。例如当前版本为 `0.1.1`：

```sh
git push github HEAD
git tag v0.1.1
git push github v0.1.1
```

GitHub Actions 会检查标签、仓库和安装包内容，通过后发布到 npm。正式版本使用 `latest`，带预发布后缀的版本使用 `next`。

如果首次版本已在本地发布，不要再次推送同版本标签来发布；先更新到下一个版本。发布工作流不会修改服务器上的安装，服务器更新按 README 的安装命令操作。
