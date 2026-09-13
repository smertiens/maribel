import * as esbuild from 'esbuild'

for (const version of ['js', 'min.js']) {
  await esbuild.build({
    entryPoints: ['src/browser.ts'],
    bundle: true,
    minify: version === 'min.js',
    platform: "browser",
    format: "iife",
    target: "es2020",
    outfile: `./dist/maribel.${version}`,
  });
}
