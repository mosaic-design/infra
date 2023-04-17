import buildTokens from '@mosaic-design/tokens-builder/build';
import { logger, ExecutorContext, readCachedProjectGraph } from '@nrwl/devkit';
import {
    calculateProjectDependencies,
    computeCompilerOptionsPaths
} from '@nrwl/workspace/src/utilities/buildable-libs-utils';
import { copy } from 'fs-extra';

import { buildFilePaths } from '../utils/paths';

export interface TokensExecutorOptions {
    copy?: string[];
    outputPath: string;
    tsConfig: string;
    tokens: string[];
}

const DURATION_DIVIDER = 1_000_000_000;

function executor(options: TokensExecutorOptions, context: ExecutorContext) {
    if (options.tokens.length === 0) {
        logger.error('Build Failed. Please set theme inputs');

        return Promise.resolve({ success: false });
    }

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
    logger.info(`Bundling design tokens for ${context.projectName}...`);
    const start = process.hrtime.bigint();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    buildTokens([
        {
            outputPath: `${context.root}/${options.outputPath}`,
            buildPath: options.tokens.map((input) => buildFilePaths(input, context.root, tsPaths))
        }
    ]);

    const end = process.hrtime.bigint();
    const duration = `${(Number(end - start) / DURATION_DIVIDER).toFixed(2)}s`;
    logger.info(`⚡ Done in ${duration}`);

    return Promise.all(
        (options.copy ?? []).map((path) =>
            copy(buildFilePaths(path, context.root, tsPaths), `${context.root}/${options.outputPath}`)
        )
    )
        .then(() => ({ success: true }))
        .catch(() => ({ success: false }));
}

export default executor;
