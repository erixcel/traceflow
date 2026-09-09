module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  roots: ['<rootDir>/packages/traceflow', '<rootDir>/packages/traceflow-kit/test'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          baseUrl: __dirname,
          paths: { 'traceflow/protocol': ['packages/traceflow/src/protocol.ts'] },
          target: 'ES2022',
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          types: ['node', 'jest'],
          strict: true,
        },
      },
    ],
  },
  testEnvironment: 'node',
  collectCoverageFrom: ['packages/traceflow/src/**/*.ts', '!packages/traceflow/src/**/*.d.ts'],
  coverageDirectory: 'coverage',
};
