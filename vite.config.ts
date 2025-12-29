import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { transform } from 'lightningcss';

const cssPlugin: Plugin = {
  name: 'scratch-reveal:css',
  async load(id: string) {
    if (!id.includes('scratch-reveal.css') || !id.includes('?raw')) return null;

    const file = id.split('?', 1)[0];
    const input = await readFile(file);
    const result = transform({
      filename: file,
      code: input,
      minify: true,
    });

    const minifiedCssText = Buffer.from(result.code).toString('utf8');
    return `export default ${JSON.stringify(minifiedCssText)};`;
  },
  async generateBundle(this) {
    const file = resolve(process.cwd(), 'src', 'scratch-reveal.css');
    const input = await readFile(file);
    const result = transform({
      filename: file,
      code: input,
      minify: true,
    });

    this.emitFile({
      type: 'asset',
      fileName: 'scratch-reveal.css',
      source: Buffer.from(result.code).toString('utf8'),
    });
  },
};

export default defineConfig(({ command }) => ({
  plugins:
    command === 'build'
      ? [
          cssPlugin,
          dts({
            outDir: 'dist',
            insertTypesEntry: true,
            entryRoot: 'src',
            cleanVueFileName: true,
          }),
        ]
      : [cssPlugin],
  build: {
    lib: {
      entry: 'src/scratch-reveal.ts',
      name: 'ScratchReveal',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `index.${format}.js`,
    },
    emptyOutDir: true,
    rollupOptions: {
      output: {
        assetFileNames: 'index.[ext]',
      },
    },
  },
}));
