import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 依赖 Vitest 默认 exclude（已含 node_modules/dist/.git 等）；手写覆盖反而会丢默认项。
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
})
