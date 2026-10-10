import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// 여러 쪽 구성: 소개(index) · 앱(app) · 개인정보처리방침(privacy)
// 기존 앱은 public/legacy.html 로 그대로 두어 옮기는 동안 나란히 비교한다.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        app: fileURLToPath(new URL('./app.html', import.meta.url)),
        privacy: fileURLToPath(new URL('./privacy.html', import.meta.url)),
      },
    },
  },
  server: { port: 3000 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
