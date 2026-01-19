// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Block the functions directory from being resolved by Metro
// This prevents Metro from trying to bundle Node.js-specific code
config.resolver = {
  ...config.resolver,
  blockList: [
    // Block the functions directory and its compiled output
    new RegExp(path.join(__dirname, 'functions').replace(/\\/g, '/') + '/.*'),
    /functions\/lib\/.*/,
    /functions\/src\/.*/,
  ],
};

module.exports = config;

