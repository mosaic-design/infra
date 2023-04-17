import {
    readJsonFile,
    writeJsonFile,
    ExecutorContext,
    ProjectGraphProjectNode,
    ProjectGraphExternalNode
} from '@nrwl/devkit';
import { DependentBuildableProjectNode } from '@nrwl/workspace/src/utilities/buildable-libs-utils';
import { PackageJson } from 'nx/src/utils/package-json';

import { relative } from 'path';

import { NormalizedOptions } from '../executor';

export type VersionsList = { [key: string]: string };

export function updatePackage(
    options: NormalizedOptions,
    context: ExecutorContext,
    dependencies: DependentBuildableProjectNode[]
): void {
    const packageJson: PackageJson = readJsonFile(options.project);
    const rootPackageJson: PackageJson = readJsonFile(`${context.root}/package.json`);
    const types = relative(options.entryRoot, options.entryFile).replace(/\.[jt]sx?$/, '.d.ts');
    const libPackages: VersionsList = dependencies
        .filter((item) => item.node.type === 'lib')
        .reduce((accum, item) => {
            const node = item.node as ProjectGraphProjectNode;
            const libPackageJson: PackageJson = readJsonFile(`${context.root}/${node.data.root}/package.json`);
            accum[libPackageJson.name] = rootPackageJson.version;

            return accum;
        }, {});

    const npmPackages: VersionsList = dependencies
        .filter((item) => item.node.type !== 'lib')
        .reduce((accum, item) => {
            const data = item.node.data as ProjectGraphExternalNode['data'];
            accum[data.packageName] = data.version;

            return accum;
        }, {});

    const versionsList = { ...libPackages, ...npmPackages };
    let exportsConfig;

    if (options.format) {
        exportsConfig = {
            ...(packageJson.exports as Record<any, any>),
            './*': {
                ...(options.format === 'commonjs' || !options.format ? { require: './*' } : {}),
                ...(options.format === 'module' || !options.format ? { import: './*' } : {}),
                default: './*'
            },
            '.': {
                ...(options.format === 'commonjs' || !options.format ? { require: `./index.js` } : {}),
                ...(options.format === 'module' || !options.format ? { import: `./index.js` } : {}),
                default: `./index.js`
            }
        };
    } else {
        exportsConfig = {
            ...(packageJson.exports as Record<any, any>),
            './*': {
                require: './cjs/*',
                import: './esm/*',
                default: './esm/*'
            },
            '.': {
                require: './cjs/index.cjs',
                import: './esm/index.mjs',
                default: './esm/index.mjs'
            }
        };
    }

    packageJson.version = rootPackageJson.version;
    packageJson.module = `${options.format ? '' : 'esm/'}index.${options.format ? 'js' : 'mjs'}`;
    packageJson.types = `types/${types}`;
    packageJson.exports = exportsConfig;
    if (options.format) {
        packageJson.type = options.format;
    }

    if (packageJson.peerDependencies) {
        Object.entries(packageJson.peerDependencies).forEach(([name, version]) => {
            packageJson.peerDependencies[name] = version.replace(options.versionPlaceholder, versionsList[name]);
        });
    }
    if (packageJson.devDependencies) {
        Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
            packageJson.devDependencies[name] = version.replace(options.versionPlaceholder, versionsList[name]);
        });
    }

    if (packageJson.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
            packageJson.dependencies[name] = version.replace(options.versionPlaceholder, versionsList[name]);
        });
    }

    writeJsonFile(`${options.outputPath}/package.json`, packageJson);
}
