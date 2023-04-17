import { normalizeAssets } from '@nrwl/web/src/utils/normalize';

import { basename, dirname } from 'path';

import { LibraryExecutorOptions, NormalizedOptions } from '../executor';

export function normalizeOptions(options: LibraryExecutorOptions, root: string, sourceRoot: string): NormalizedOptions {
    const assets = options.assets ? normalizeAssets(options.assets, root, sourceRoot) : [];
    const entryFile = `${root}/${options.entryFile}`;
    const entryRoot = dirname(entryFile);
    const project = `${root}/${options.project}`;
    const projectRoot = dirname(project);
    const outputPath = `${root}/${options.outputPath}`;
    const styles = options.styles.map((style) => {
        if (typeof style === 'string') {
            const bundleName = basename(style).split('.');
            bundleName.pop();

            return {
                input: `${root}/${style}`,
                bundleName: bundleName.join('.'),
                keepFormat: false
            };
        } else {
            return {
                ...style,
                input: `${root}/${style.input}`,
                keepFormat: !!style.keepFormat
            };
        }
    });

    return {
        ...options,
        styles,
        assets,
        entryFile,
        entryRoot,
        project,
        projectRoot,
        outputPath
    };
}
