import { readJsonFile } from '@nrwl/devkit';
import { DependentBuildableProjectNode } from '@nrwl/workspace/src/utilities/buildable-libs-utils';
import resolve from '@rollup/plugin-node-resolve';
import autoprefixer from 'autoprefixer';
import { PackageJson } from 'nx/src/utils/package-json';
import { RollupOptions } from 'rollup';
import copy from 'rollup-plugin-copy';
import postcss from 'rollup-plugin-postcss';
import typescript from 'rollup-plugin-typescript2';

import { copyFileSync, rmdirSync } from 'fs';
import path, { basename, join } from 'path';

import { AssetGlobPattern, NormalizedOptions, RollupCopyAssetOption } from '../executor';
import { docgen } from '../rollup/docgen';
import { scssBundle } from '../rollup/scss-bundle';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { default: swc } = require('rollup-plugin-swc');

export function convertCopyAssetsToRollupOptions(
    outputPath: string,
    assets: AssetGlobPattern[]
): RollupCopyAssetOption[] {
    return assets
        ? assets.map((a) => ({
            src: join(a.input, a.glob).replace(/\\/g, '/'),
            dest: join(outputPath, a.output).replace(/\\/g, '/')
        }))
        : undefined;
}

export function createRollupOptions(
    buildOptions: NormalizedOptions,
    rootDir: string,
    dependencies: DependentBuildableProjectNode[],
    npmDeps: string[]
): RollupOptions[] {
    const packageJson: PackageJson = readJsonFile(buildOptions.project);
    const globals = buildOptions.globals
        ? buildOptions.globals.reduce(
            (acc, item) => {
                acc[item.moduleId] = item.global;

                return acc;
            },
            // eslint-disable-next-line @typescript-eslint/naming-convention
            { 'react/jsx-runtime': 'jsxRuntime' }
        )
        : // eslint-disable-next-line @typescript-eslint/naming-convention
        { 'react/jsx-runtime': 'jsxRuntime' };

    const externalPackages = dependencies
        .map((d) => d.name)
        .concat(buildOptions.external || [])
        .concat(Object.keys(packageJson.dependencies || {}));

    const rollupOptions: RollupOptions[] = [];
    addBaseOptions(buildOptions, rollupOptions, rootDir, globals, [...externalPackages, ...npmDeps]);
    addStylesOptions(buildOptions, rollupOptions);

    return rollupOptions;
}

export function addBaseOptions(
    buildOptions: NormalizedOptions,
    rollupOptions: RollupOptions[],
    rootDir: string,
    globals: { [key: string]: string },
    externals: string[]
) {
    const externalCheck = (id: string) => externals.some((name) => id === name || id.startsWith(`${name}/`));

    let outputConfig;
    if (buildOptions.format) {
        outputConfig = [
            {
                format: buildOptions.format,
                preserveModules: true,
                globals,
                dir: `${buildOptions.outputPath}`,
                entryFileNames: `[name].js`,
                name: 'source'
            }
        ];
    } else {
        outputConfig = [
            {
                format: 'module',
                preserveModules: true,
                globals,
                dir: `${buildOptions.outputPath}/esm`,
                entryFileNames: '[name].mjs',
                name: 'esm-source'
            },
            {
                format: 'commonjs',
                preserveModules: true,
                globals,
                dir: `${buildOptions.outputPath}/cjs`,
                entryFileNames: '[name].cjs',
                name: 'cjs-source'
            }
        ];
    }

    rollupOptions.push(
        {
            input: buildOptions.entryFile,
            output: outputConfig,
            external: externalCheck,
            plugins: [
                buildOptions.docsGen?.enabled &&
                docgen({
                    outputPath: buildOptions.outputPath,
                    tsConfig: buildOptions.tsConfig,
                    rootDir,
                    ...buildOptions.docsGen
                }),
                copy({
                    targets: convertCopyAssetsToRollupOptions(buildOptions.outputPath, buildOptions.assets)
                }),
                resolve({
                    extensions: ['.js', '.jsx', '.ts', '.tsx'],
                    preferBuiltins: true
                }),
                postcss({
                    parser: 'postcss-scss',
                    extract: buildOptions.cssBundle ?? true,
                    minimize: true,
                    name: ['asasf'],
                    modules: {
                        generateScopedName: 'mosaic-[local]_[hash:base64:5]'
                    },
                    plugins: [autoprefixer()]
                }),
                swc()
            ]
        },
        {
            input: buildOptions.entryFile,
            output: {
                globals,
                preserveModules: true,
                dir: `${buildOptions.outputPath}/types`,
                entryFileNames: '[name].d.ts',
                chunkFileNames: '[name].d.ts',
                name: 'types'
            },
            external: externalCheck,
            plugins: [
                {
                    name: 'move-styles',
                    buildEnd() {
                        if (!buildOptions.cssBundle || buildOptions.format) return;

                        copyFileSync(
                            path.resolve(`${buildOptions.outputPath}/cjs/${buildOptions.cssBundle}`),
                            path.resolve(`${buildOptions.outputPath}/${buildOptions.cssBundle}`)
                        );
                        rmdirSync(
                            path.dirname(path.resolve(`${buildOptions.outputPath}/cjs/${buildOptions.cssBundle}`)),
                            { recursive: true }
                        );
                        rmdirSync(
                            path.dirname(path.resolve(`${buildOptions.outputPath}/esm/${buildOptions.cssBundle}`)),
                            { recursive: true }
                        );
                    }
                },
                typescript({
                    check: true,
                    tsconfig: buildOptions.tsConfig,
                    tsconfigOverride: {
                        compilerOptions: {
                            rootDir: buildOptions.entryRoot
                        }
                    }
                })
            ]
        }
    );
}

export function addStylesOptions(buildOptions: NormalizedOptions, rollupOptions: RollupOptions[]) {
    if (buildOptions.styles.length > 0) {
        const toTranspile = buildOptions.styles.filter((style) => style.keepFormat === false);
        const keepScss = buildOptions.styles.filter((style) => style.keepFormat === true);

        toTranspile.forEach((style) => {
            rollupOptions.unshift({
                input: style.input,
                output: {
                    file: `${buildOptions.outputPath}/${style.bundleName}.css`
                },
                plugins: [
                    postcss({
                        parser: 'postcss-scss',
                        extract: true,
                        minimize: true,
                        modules: {
                            generateScopedName: 'mosaic-[local]_[hash:base64:5]'
                        },
                        plugins: [autoprefixer()]
                    })
                ]
            });
        });

        keepScss.forEach((style) => {
            const extension = basename(style.input).split('.').pop();
            rollupOptions.unshift({
                input: style.input,
                output: {
                    file: `${buildOptions.outputPath}/${style.bundleName}.${extension}`
                },
                plugins: [scssBundle()]
            });
        });
    }
}
