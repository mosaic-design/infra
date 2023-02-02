module.exports = {
    displayName: 'release',
    preset: '../../jest.preset.js',
    transform: { '^.+\\.ts?$': 'ts-jest' },
    moduleFileExtensions: ['ts', 'js'],
    coverageDirectory: '../../coverage/libs/release',
};
