/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Only transform files in the tests directory that have .test.js suffix
  // Exclude the full-integration tests that require loading the ESM app
  testMatch: [
    '<rootDir>/tests/**/*unit*.test.js',
    '<rootDir>/tests/**/*Unit*.test.js',
  ],
  // Transform all .js test files with babel for ESM support
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: ['@babel/preset-env'] }],
  },
};