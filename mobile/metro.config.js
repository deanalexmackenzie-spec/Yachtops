const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @supabase/supabase-js v2.106+ ships an ESM build (dist/index.mjs) that contains
// a dynamic import(variable) for optional OpenTelemetry support. Hermes (Android)
// cannot compile dynamic imports with non-literal arguments, so the bundle fails
// with "Invalid expression encountered". Force Metro to use the CJS build instead,
// which has an equivalent require() call that compiles fine.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@supabase/supabase-js') {
    return {
      filePath: require.resolve('@supabase/supabase-js/dist/index.cjs'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
