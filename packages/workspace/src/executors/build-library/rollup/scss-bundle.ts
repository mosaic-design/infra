import { Plugin } from 'rollup';
import { Bundler } from 'scss-bundle';

type RollupPluginScssBundle = () => Plugin;

export const scssBundle: RollupPluginScssBundle = () => {
    let content = '';

    return {
        name: 'scss-bundle',
        async transform(source, id) {
            if (/\.scss$/.test(id)) {
                const bundler = new Bundler();
                const { bundledContent } = await bundler.bundle(id);
                content = bundledContent;

                return { code: '' };
            }

            return { code: '' };
        },
        renderChunk() {
            return { code: content };
        }
    };
};
