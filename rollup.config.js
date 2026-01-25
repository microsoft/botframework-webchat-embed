import terser from '@rollup/plugin-terser';

export default [
  // UMD build (for CDN/browser usage)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/webchat-embed.js',
      format: 'iife',
      name: 'WebChatEmbed'
    }
  },
  // Minified UMD build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/webchat-embed.min.js',
      format: 'iife',
      name: 'WebChatEmbed'
    },
    plugins: [terser()]
  },
  // ESM build (for bundlers)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/webchat-embed.esm.js',
      format: 'es'
    }
  }
];
