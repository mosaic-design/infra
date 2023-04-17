import { writeJsonFile } from '@nrwl/devkit';
import { createFilter, FilterPattern } from '@rollup/pluginutils';
import { withCustomConfig } from 'react-docgen-typescript';
import type { Plugin, ModuleInfo } from 'rollup';

import path from 'path';

export type RollupOptions = {
    outputPath: string;
    rootDir: string;
    srcPath: string;
    tsConfig: string;
    include?: FilterPattern;
    exclude?: FilterPattern;
};

type RollupPluginSwc = (options?: RollupOptions) => Plugin;

export const docgen: RollupPluginSwc = (pluginOptions) => {
    const { include, exclude, outputPath, srcPath, rootDir, tsConfig } = pluginOptions;
    const filter = createFilter(include || [], exclude || []);

    const parser = withCustomConfig(path.join(rootDir, tsConfig), {
        shouldExtractLiteralValuesFromEnum: true,
        shouldExtractValuesFromUnion: true,
        savePropValueAsString: false
    });

    return {
        name: 'docgen',
        moduleParsed(moduleInfo: ModuleInfo) {
            if (!filter(moduleInfo.id)) return null;

            let pathSegment = moduleInfo.id.replace(path.basename(moduleInfo.id), '').replace(rootDir, '');
            pathSegment = pathSegment
                .substring(1, pathSegment.length - 1)
                .split(path.sep)
                .join(path.posix.sep)
                .replace(srcPath, '');

            const doc = parser.parse(moduleInfo.id);

            const fileNameParts = path.basename(moduleInfo.id).split('.');
            fileNameParts.pop();
            fileNameParts.push('props', 'json');

            writeJsonFile(path.join(outputPath, pathSegment, fileNameParts.join('.')), doc);
        }
    };
};
