module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: false,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:tailwindcss/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
    tailwindcss: {
      callees: ['classnames', 'clsx', 'ctl'],
      config: 'tailwind.config.js',
    },
  },
  plugins: ['react', 'react-hooks', 'jsx-a11y', 'tailwindcss'],
  ignorePatterns: ['dist', 'vite.config.js', 'vitest.setup.js'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'tailwindcss/classnames-order': 'warn',
    'tailwindcss/no-custom-classname': 'off',
    'no-console': 'error',
  },
}









