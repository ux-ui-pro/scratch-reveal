import type { ComponentPublicInstance } from 'vue';

declare module 'vue' {
  export interface GlobalComponents {
    'scratch-reveal': ComponentPublicInstance;
  }
}
