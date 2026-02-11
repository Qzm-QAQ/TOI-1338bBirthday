# 星空迷宫生日站（v2：更干净的UI & 两张图默认）

- UI：去掉说明/帮助弹窗，切换更顺
- BGM：按钮只显示图标（点击播放/暂停；播放时会跳动+旋转）
- 照片：默认两张
  1) assets/img/role.jpg（你给的）
  2) assets/img/photo2_placeholder.svg（占位）
     你把第二张照片放到 assets/img/photo2.jpg，然后把 assets/app.js 的 CONFIG.photos 第二项改成 photo2.jpg 即可

## BGM
在 assets/app.js 里填：
```js
bgmUrl: "https://xxx.com/your.mp3"
```

## 部署
GitHub Pages / Vercel / Netlify 都行（HTTPS 方便 iPhone 陀螺仪权限）。
