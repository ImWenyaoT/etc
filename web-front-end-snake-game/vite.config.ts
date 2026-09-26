import { defineConfig } from 'vitest/config'

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // main.ts 是自执行的入口 glue（绑定 DOM、启动 requestAnimationFrame 循环），
      // 无法在无浏览器环境下有意义地单元测试，按惯例排除出覆盖率分母。
      exclude: ['src/main.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
})
