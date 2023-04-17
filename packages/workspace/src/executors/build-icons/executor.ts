import { ExecutorContext, readCachedProjectGraph } from '@nrwl/devkit';
import {
    calculateProjectDependencies,
    computeCompilerOptionsPaths
} from '@nrwl/workspace/src/utilities/buildable-libs-utils';

import { spawn } from 'child_process';
import { readdirSync, renameSync, unlinkSync } from 'fs';
import { join } from 'path';

import { buildFilePaths } from '../utils/paths';

export interface ExecutorOptions {
    iconsPath: string;
    outputPath: string;
    tsConfig: string;
}

function executor(options: ExecutorOptions, context: ExecutorContext) {
    const { iconsPath, outputPath } = options;

    const projectGraph = readCachedProjectGraph();
    const { dependencies } = calculateProjectDependencies(
        projectGraph,
        context.root,
        context.projectName,
        context.targetName,
        context.configurationName,
        true
    );
    const tsPaths = computeCompilerOptionsPaths(options.tsConfig, dependencies);
    const location = buildFilePaths(iconsPath, context.root, tsPaths);
    const srcPath = context.workspace.projects.workspace.sourceRoot;
    const indexTemplate = join(srcPath, 'executors/build-icons/templates/index-template.js');
    const iconTemplate = join(srcPath, 'executors/build-icons/templates/icon-template.js');
    readdirSync(outputPath).forEach((file: string) => {
        unlinkSync(`${outputPath}/${file}`);
    });

    return new Promise((resolve, reject) => {
        const buildIcons = spawn(
            'svgr',
            [
                location,
                '-d',
                outputPath,
                '--typescript',
                '--template',
                iconTemplate,
                '--index-template',
                indexTemplate,
                '--filename-case=kebab'
            ],
            {
                shell: true
            }
        );
        buildIcons.stdout.on('end', () => {
            const files = readdirSync(outputPath);
            files.forEach((file) => {
                renameSync(`${outputPath}${file}`, `${outputPath}/${file.replace('mc-', 'svg-')}`);
            });
            resolve({ success: true });
        });
        buildIcons.stdout.on('error', () => {
            reject({ success: false });
        });
    });
}

export default executor;
