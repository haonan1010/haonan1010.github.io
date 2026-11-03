# 方块原野 v71 · 完整 GitHub 代码
作者：找南

包含截至 v70 的全部游戏功能与首页升级，另新增最高连杀 COMBO 排行榜。

## 必须按顺序做
1. Supabase → SQL Editor：打开本包 supabase/add-combo-board.sql，复制全部内容并执行。扩展现有榜单类型，不删除玩家或成绩。
2. Supabase → Edge Functions → leaderboard → Code：将 supabase/functions/leaderboard/index.ts 的完整内容覆盖现有 index.ts，然后 Deploy。使用原有项目和函数，不新建玩家数据库，不改密钥，保留原来的函数 JWT 验证配置（此函数自行校验玩家 Bearer token）。
3. 解压后将本包根目录所有 HTML、JS、CSS、robots.txt、sitemap.xml 和 .nojekyll 上传到原 GitHub Pages 仓库根目录，同名文件全部覆盖，不要只更新 index.html，不要只上传 ZIP。
4. GitHub Pages 发布目录继续使用分支根目录（/ root），无需构建。发布完成后强制刷新（Mac Command+Shift+R；Windows Ctrl+F5）。
5. 打开全服排行榜，应看到四个榜：十波竞速、最高通关波数、疾风无限连、最高连杀 COMBO。使用原昵称和浏览器身份，无需重新注册。

supabase 文件夹仅供手动更新后台，不会在 GitHub Pages 上运行。网页仍调用你当前的 Supabase 地址。

## 连杀规则
沿用现有5秒连杀窗口；暂停不扣时间；排除动物、箭塔击杀及创造模式。新产生的连杀纪录参与上榜，不直接导入历史本地最高值。每人保留最好成绩；同分并列（1、1、3）；每榜显示最多10条记录。网络失败保留待上传纪录，打开排行榜重试。旧后台未更新时，三个原榜仍可用，连杀纪录保留本地等待升级。

## 源文件
index.html 为正式版入口；style.css 为界面；其余 JS 都是游戏代码，必须一起上传。
monster-test.html 是独立试炼场。enchantments.js 包含八种附魔和链电性能优化。

## 存档与搜索地址
同一网址、同一浏览器继续使用原有本地存档。更换网址不会自动迁移存档。
游戏 SEO 信息当前沿用正式版地址。如果 GitHub Pages 是主站，请将 index.html、robots.txt、sitemap.xml 中的 https://starlit-adventure-haonan.haonan101010607854.chatgpt.site 统一改为实际主站地址。排行榜允许 https://haonan1010.github.io 和现有正式版来源。
