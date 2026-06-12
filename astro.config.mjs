// @ts-check
import { defineConfig } from 'astro/config';

// kmbasad.github.io is a GitHub *user* site → served at the domain root,
// so no `base` prefix is needed. Absolute paths like /css/... and /js/...
// resolve against public/ exactly as the legacy site expected.
export default defineConfig({
  site: 'https://kmbasad.github.io',
});
