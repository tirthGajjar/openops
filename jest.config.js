/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages/shared/test'],
  moduleNameMapper: {
    '^@openops/shared(.*)$': '<rootDir>/packages/shared/src$1'
  }
};