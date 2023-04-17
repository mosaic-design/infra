const path = require('path');

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function defaultIndexTemplate(filePaths) {
    const exportEntries = filePaths.map((filePath) => {
        const basename = path.basename(filePath, path.extname(filePath)).replace('mc-', 'svg-');
        const exportName = basename.replace('mc-', '').split('-').map(capitalizeFirstLetter).join('');

        return `export { default as ${exportName} } from './${basename}'`;
    });
    return exportEntries.join('\n');
}

module.exports = defaultIndexTemplate;
