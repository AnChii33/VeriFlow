const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Wraps the default config with NativeWind's CSS processing
module.exports = withNativeWind(config, { input: "./global.css" });