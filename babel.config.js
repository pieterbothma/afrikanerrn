module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo', require.resolve('nativewind/babel')],
    plugins: ['react-native-reanimated/plugin'],
  };
};

