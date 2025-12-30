<p align="center"><strong>scratch-reveal</strong></p>

<div align="center">
<p align="center">Web Component for scratch-to-reveal: canvas mask, background under it, custom brush. Ready for plain browser usage and Vue 3.</p>

[![npm](https://img.shields.io/npm/v/scratch-reveal.svg?colorB=brightgreen)](https://www.npmjs.com/package/scratch-reveal)
[![GitHub package version](https://img.shields.io/github/package-json/v/ux-ui-pro/scratch-reveal.svg)](https://github.com/ux-ui-pro/scratch-reveal)
[![NPM Downloads](https://img.shields.io/npm/dm/scratch-reveal.svg?style=flat)](https://www.npmjs.org/package/scratch-reveal)

<a href="https://codepen.io/ux-ui/pen/WbxvZqY">Demo</a>
</div>
<br>

➠ **Install**
```console
yarn add scratch-reveal
```
<br>

➠ **Register**
```ts
// registers <scratch-reveal>
import { registerScratchRevealElement } from 'scratch-reveal';
registerScratchRevealElement();

// Vue 3 plugin
import { createApp } from 'vue';
import { installScratchReveal } from 'scratch-reveal';
const app = createApp(App);
installScratchReveal(app);
app.mount('#app');
```
<br>

➠ **Usage (HTML)**
```html
<scratch-reveal
  width="300"
  height="300"
  complete-percent="60"
  brush-src="/demo/assets/brush.png"
  brush-size="15"
  mask-src="/demo/assets/scratch-reveal.png"
  background-src="/demo/assets/scratch-reveal-background.svg"
></scratch-reveal>
```
<br>

➠ **Auto-size (follow parent/container size)**
```html
<div style="width: 420px; height: 240px;">
  <scratch-reveal
    style="width: 100%; height: 100%;"
    complete-percent="60"
    brush-src="/demo/assets/brush.png"
    brush-size="12"
    mask-src="/demo/assets/scratch-reveal.png"
    background-src="/demo/assets/scratch-reveal-background.svg"
  ></scratch-reveal>
</div>
```
— If `width`/`height` attributes are omitted, the component will observe its own size and resize the canvas accordingly.

<br>

➠ **Events**
```js
const el = document.querySelector('scratch-reveal');
el.addEventListener('progress', (event) => {
  console.log(event.detail.percent);
});
el.addEventListener('complete', () => {
  console.log('done!');
});
el.addEventListener('error', (event) => {
  console.error(event.detail.message);
});
```
— `progress` (detail: `{ percent: number }`)  
— `complete` (detail: `{ percent: 100 }`)  
— `error` (detail: `{ message: string }`)

<br>

➠ **Attributes**

|        Attribute         |        Type        |                   Default                    | Description                                                                                              |
|:------------------------:|:------------------:|:--------------------------------------------:|:---------------------------------------------------------------------------------------------------------|
|    `width` / `height`    |      `number`      |                    `300`                     | Container/mask size in px. If omitted, size follows layout (auto-size).                                  |
|   `complete-percent`     |      `number`      |                     `60`                     | Percent cleared to consider done.                                                                        |
|       `brush-src`        |      `string`      |                    —                         | Brush image (**required**).                                                                              |
|       `brush-size`       | `string \| number` |                     `0`                      | Brush width: numbers mean percent of min(canvas width, height) (e.g., `12` = 12%). Use `80px` for px. `0` = natural image size. |
|        `mask-src`        |      `string`      |                    —                         | Top mask (scratched away) (**required**).                                                                |
|     `background-src`     |      `string`      |                    —                         | Background beneath the mask (**required**).                                                              |
<br>

➠ **Styles**
- Shadow styles via constructable stylesheet with `<style>` fallback for older browsers.
- Reuse the shipped CSS text:  
  ```ts
  import { scratchRevealCssText } from 'scratch-reveal';
  // apply wherever you need
  ```
<br>

➠ **Vue 3.5+**
- Register the custom element (see above).  
- Optionally set `isCustomElement` in `vite.config.ts` for Volar/templates, or rely on the shipped `src/vue.d.ts` (global component `scratch-reveal`).

<br>

➠ **License**

MIT
