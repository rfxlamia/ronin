/**
 * esbuild configuration for Lambda bundling
 * Target: <1MB bundle size for fast cold starts
 */

import * as esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['index.mjs'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: 'dist/index.mjs',
    minify: true,
    sourcemap: false,
    external: [
        '@aws-sdk/*',  // Included in Lambda runtime
        'awslambda'    // Lambda runtime module
    ],
    banner: {
        js: '// Ronin Demo Mode Proxy - Bundled with esbuild'
    }
});

console.log('✅ Lambda bundle created at dist/index.mjs');
