方块原野 v82 · 作者：找南

上传 GitHub：
1. 双击解压本 ZIP。
2. 打开 GitHub 仓库 haonan1010/haonan1010.github.io。
3. Add file → Upload files。
4. 上传解压后文件夹里面的所有文件和 supabase 文件夹，让 index.html 直接位于仓库根目录。不要只上传 ZIP，也不要把外层文件夹整体套进去。
5. 同名文件覆盖后点击 Commit changes。
6. 等待 GitHub Pages 部署完成，再按 Command + Shift + R 刷新游戏。

本版包含：立体剑弓与动作、右侧自适应定位、刀尖前伸、附魔优化、视线检测及渲染性能优化。

supabase 文件夹为排行榜服务端源码；上传 GitHub 不会自动更新 Supabase 函数。已有排行榜正常工作时不必重新部署。需要新增连杀榜时，先在 Supabase 执行 add-combo-board.sql，再将 functions/leaderboard/index.ts 部署到 leaderboard 函数。

前端继续使用现有 Supabase 排行榜地址，不包含服务端管理密钥。
