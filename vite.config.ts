import path from "path" // <-- 이거 맨 위에 추가
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: { // <-- 이 부분을 통째로 추가
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})