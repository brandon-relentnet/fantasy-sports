import { defineConfig } from "wxt";
// @ts-ignore
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    web_accessible_resources: [
      {
        resources: ['iframe.html'],
        matches: ['<all_urls>'],
      },
    ],
    permissions: ['storage'],
    host_permissions: [
      'https://api.myscrollr.com/*',
      'http://localhost:5000/*',
      'http://localhost:4001/*',
      'http://localhost:4000/*',
      'http://localhost:4002/*'
    ]
  },
  modules: ["@wxt-dev/module-react"],
  srcDir: 'src',
  vite: () => ({
    plugins: [tailwindcss()],
  }),

});
