import { ExecutorContext, logger, readCachedProjectGraph } from '@nrwl/devkit';
import {
    calculateProjectDependencies,
    DependentBuildableProjectNode,
} from '@nrwl/workspace/src/utilities/buildable-libs-utils';
import { FilterPattern } from '@rollup/pluginutils';
import { watch, rollup, RollupOptions } from 'rollup';
import { from, Observable, of } from 'rxjs';
import { eachValueFrom } from 'rxjs-for-await';
import { catchError, concatMap, last, scan, tap, map } from 'rxjs/operators';

import { resolve } from 'path';

import { createRollupOptions } from './utils/create-rollup-options';
import { normalizeOptions } from './utils/normilize-options';
import { updatePackage } from './utils/update-package';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { removeSync } = require('fs-extra');

export interface AssetGlobPattern {
    glob: string;
    input: string;
    output: string;
    ignore?: string[];
}

export interface StylesOptions {
    input: string;
    bundleName: string;
    keepFormat?: boolean;
}

export interface DocsGenOptions {
    srcPath: string;
    enabled: boolean;
    include: FilterPattern;
    exclude: FilterPattern;
}

export interface RollupCopyAssetOption {
    src: string;
    dest: string;
}

export interface ExecutorResult {
    success: boolean;
}

export interface Globals {
    moduleId: string;
    global: string;
}

export interface LibraryExecutorOptions {
    outputPath: string;
    tsConfig: string;
    versionPlaceholder: string;
    project: string;
    entryFile: string;
    deleteOutputPath: boolean;
    watch: boolean;
    format?: 'module' | 'commonjs';
    docsGen: DocsGenOptions;
    assets: AssetGlobPattern[];
    styles: (string | StylesOptions)[];
    globals: Globals[];
    external: string[];
    ignoreStyles: boolean;
    cssBundle: string;
}

export interface NormalizedOptions extends LibraryExecutorOptions {
    entryRoot: string;
    projectRoot: string;
    assets: AssetGlobPattern[];
    styles: StylesOptions[];
}

const DURATION_DIVIDER = 1_000_000_000;
const NPM_PREFIX_LENGTH = 4;

async function* executor(
    rawOptions: LibraryExecutorOptions,
    context: ExecutorContext
) {
    const project = context.workspace.projects[context.projectName];
    const sourceRoot = project.sourceRoot;
    const projectGraph = readCachedProjectGraph();
    const { dependencies } = calculateProjectDependencies(
        projectGraph,
        context.root,
        context.projectName,
        context.targetName,
        context.configurationName,
        true
    );
    const npmDeps = (projectGraph.dependencies[context.projectName] ?? [])
        .filter((d) => d.target.startsWith('npm:'))
        .map((d) => d.target.slice(NPM_PREFIX_LENGTH));

    const normalizedOptions = normalizeOptions(
        rawOptions,
        context.root,
        sourceRoot
    );
    const rollupOptions = createRollupOptions(
        normalizedOptions,
        context.root,
        dependencies,
        npmDeps
    );

    if (normalizedOptions.watch) {
        yield* watchSource(
            normalizedOptions,
            rollupOptions,
            dependencies,
            context
        );
    } else {
        return buildSource(
            normalizedOptions,
            rollupOptions,
            dependencies,
            context
        );
    }
}

function buildSource(
    normalizedOptions: NormalizedOptions,
    rollupOptions: RollupOptions[],
    dependencies: DependentBuildableProjectNode[],
    context: ExecutorContext
) {
    logger.info(`Bundling ${context.projectName}...`);
    const start = process.hrtime.bigint();

    if (normalizedOptions.deleteOutputPath) {
        const resolvedOutputPath = resolve(
            context.root,
            normalizedOptions.outputPath
        );
        if (resolvedOutputPath === context.root) {
            throw new Error('Output path MUST not be project root directory!');
        }

        removeSync(resolvedOutputPath);
    }

    return from(rollupOptions)
        .pipe(
            concatMap((opts) =>
                from(rollup(opts))
                    .pipe(
                        concatMap((bundle) => {
                            const outputOptions = Array.isArray(opts.output)
                                ? opts.output
                                : [opts.output];

                            return from(
                                Promise.all(
                                    outputOptions.map((o) => bundle.write(o))
                                )
                            );
                        }),
                        map(() => ({ success: true }))
                    )
                    .pipe(
                        catchError((e: string) => {
                            logger.error(`Error during bundle: ${e}`);

                            return of({ success: false });
                        })
                    )
            ),
            scan(
                (acc, result) => {
                    if (!acc.success) return acc;

                    return result;
                },
                { success: true }
            ),
            last(),
            tap({
                next: (result) => {
                    if (result.success) {
                        const end = process.hrtime.bigint();
                        const duration = `${(
                            Number(end - start) / DURATION_DIVIDER
                        ).toFixed(2)}s`;
                        updatePackage(normalizedOptions, context, dependencies);
                        logger.info(`⚡ Done in ${duration}`);
                    } else {
                        logger.error(`Bundle failed: ${context.projectName}`);
                    }
                },
            })
        )
        .toPromise();
}

async function* watchSource(
    normalizedOptions: NormalizedOptions,
    rollupOptions: RollupOptions[],
    dependencies: DependentBuildableProjectNode[],
    context: ExecutorContext
) {
    const watcher = watch(rollupOptions);

    yield* eachValueFrom<ExecutorResult>(
        new Observable<ExecutorResult>((observer) => {
            watcher.on('event', (data) => {
                switch (data.code) {
                    case 'START':
                        logger.info(`Bundling ${context.projectName}...`);
                        break;
                    case 'END':
                        updatePackage(normalizedOptions, context, dependencies);
                        logger.info(
                            'Bundle complete. Watching for file changes...'
                        );
                        observer.next({ success: true });
                        break;
                    case 'ERROR':
                        logger.error(
                            `Error during bundle: ${data.error.message}`
                        );
                        observer.next({ success: false });
                        break;
                }
            });

            return () => {
                watcher.close();
            };
        })
    );
}

export default executor;
