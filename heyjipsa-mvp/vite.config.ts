import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// base는 루트('/') 기준. GitHub Pages 프로젝트 사이트로 배포 시
// '/<repo-name>/' 로 바꾸세요. (HashRouter 사용으로 새로고침 404는 없음)
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
