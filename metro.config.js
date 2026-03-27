const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-svg' || moduleName === 'react-native-svg/') {
    return {
      type: 'sourceFile',
      filePath: path.join(
        projectRoot,
        'node_modules',
        'react-native-svg',
        'lib',
        'commonjs',
        'index.js'
      ),
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;