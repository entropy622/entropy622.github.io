// const cdnPath = 'https://cdn.jsdelivr.net/gh/letere-gzj/live2d-widget-v3@main';
const config = {
  // 资源路径
  path: {
    modelPath: "/Resources/",
    cssPath: "css/waifu.css",
    tipsJsonPath: "Resources/waifu-tips.json",
    tipsJsPath: "js/waifu-tips.js",
    live2dCorePath: "js/live2dcubismcore.js",
    live2dSdkPath: "js/live2d-sdk.js"
  },
  // 工具栏
  tools: ["hitokoto", "asteroids", "express", "switch-model","info", "quit"],
  // 模型拖拽
  drag: {
    enable: true,
    direction: ["x", "y"]
  },
  // 模型切换(order: 顺序切换，random: 随机切换)
  switchType: "order"
}

// 加载资源并初始化
if (screen.width >= 768) {
  Promise.all([
    loadExternalResource(config.path.cssPath, "css"),
    loadExternalResource(config.path.live2dCorePath, "js"),
    loadExternalResource(config.path.live2dSdkPath, "js"),
    loadExternalResource(config.path.tipsJsPath, "js")
  ]).then(() => {
    initWidget({
      waifuPath: config.path.tipsJsonPath,
      cdnPath: config.path.modelPath,
      tools: config.tools,
      dragEnable: config.drag.enable,
      dragDirection: config.drag.direction,
      switchType: config.switchType
    });
  });
}

// 异步加载资源
function loadExternalResource(url, type) {
  return new Promise((resolve, reject) => {
    let tag;
    if (type === "css") {
      tag = document.createElement("link");
      tag.rel = "stylesheet";
      tag.href = url;
    }
    else if (type === "js") {
      tag = document.createElement("script");
      tag.src = url;
    }
    if (tag) {
      tag.onload = () => resolve(url);
      tag.onerror = () => reject(url);
      document.head.appendChild(tag);
    }
  });
}