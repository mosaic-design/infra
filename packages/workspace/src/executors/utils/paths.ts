import { MapLike } from 'typescript';

import { join } from 'path';

export const buildFilePaths = (path: string, rootDir: string, tsPaths: MapLike<string[]>): string => {
    const pathsDependency = Object.keys(tsPaths).find((configPath) => path.startsWith(configPath));
    let themePath = path;

    if (pathsDependency || themePath.startsWith('@')) {
        if (pathsDependency) {
            themePath = themePath.replace(pathsDependency, join(rootDir, tsPaths[pathsDependency][0]));
        }

        if (path.startsWith('@')) {
            themePath = join(rootDir, 'node_modules', themePath);
        }
    } else {
        themePath = join(rootDir, path);
    }

    return themePath;
};
