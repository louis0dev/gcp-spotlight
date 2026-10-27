import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// content script는 ES module을 쓸 수 없어 IIFE 한 파일로 묶는다. lib 모드는 한 번에 entry 하나만 되므로
// ENTRY 환경 변수로 골라 두 번 빌드한다.
//   content: 단축키를 누르면 주입하는 입력창
//   header: 콘솔 페이지에 자동으로 붙어 프로젝트별 헤더 색을 칠한다
const entry = process.env.ENTRY ?? 'content';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: r('./dist'),
    emptyOutDir: false,
    lib: {
      entry: r(`./src/${entry}.ts`),
      formats: ['iife'],
      name: 'GcpSpotlight',
      fileName: () => `${entry}.js`,
    },
  },
});
