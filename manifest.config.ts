import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Boss 趋势分析助手",
  version: "0.1.0",
  description: "读取 Boss 页面职位数据并进行趋势分析",
  permissions: ["sidePanel", "tabs", "activeTab", "storage"],
  host_permissions: ["https://www.zhipin.com/*"],
  action: {
    default_title: "打开趋势分析"
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module"
  },
  side_panel: {
    default_path: "src/sidepanel/index.html"
  },
  content_scripts: [
    {
      matches: ["https://www.zhipin.com/*"],
      js: ["src/content/index.ts"],
      run_at: "document_idle"
    }
  ]
});
