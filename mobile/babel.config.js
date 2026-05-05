const path = require('path');

module.exports = function (api) {
  api.cache(true);
  return {
    // Hermes does not support `import.meta`; shared `frontend/src/lib/apiClient.ts` uses it for Vite.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@astralis/lib': path.resolve(__dirname, '../frontend/src/lib'),
          },
          extensions: ['.ios.ts', '.android.ts', '.ts', '.ios.tsx', '.android.tsx', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
    ],
  };
};
