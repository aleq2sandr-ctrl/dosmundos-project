module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-react'],
    },
  },
  settings: {
    react: {
      version: '18.2',
    },
  },
  rules: {
    'no-unused-vars': ['warn', {
      vars: 'all',
      args: 'after-used',
      ignoreRestSiblings: false,
      varsIgnorePattern: '^React$',
      argsIgnorePattern: '^_'
    }],
    'no-case-declarations': 'error',
    'no-dupe-class-members': 'error',
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
  overrides: [
    {
      files: ['vps-deployment/**/*.js', 'api/**/*.js', 'test-*.js'],
      env: {
        node: true,
        browser: false
      },
      rules: {
        'no-undef': 'off' // Allow Node.js globals like process, __dirname
      }
    }
  ]
};