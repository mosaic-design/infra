import { readFileSync } from 'fs';


/** Extracts the release notes for a specific release from a given changelog file. */
export function extractReleaseNotes(changelogPath: string, versionName: string): any {
    const changelogContent = readFileSync(changelogPath, 'utf8');
    const escapedVersion = versionName.replace('.', '\\.');

    // Regular expression that matches the release notes for the given version. Note that we specify
    // the "s" RegExp flag so that the line breaks will be ignored within our regex. We determine the
    // section of a version by starting with the release header which can either use the markdown
    // "h1" or "h2" syntax. The end of the section will be matched by just looking for the first
    // subsequent release header.
    const titleWithDate = '( "[\\w\\s]+")? \\(\\d{4}-\\d{2}-\\d{2}\\)';
    const anyVersion = '\\d+\\.\\d+\\.\\d+';
    const releaseNotesRegex = new RegExp(
        `##? (${escapedVersion}${titleWithDate})(((.*?)##? (${anyVersion}${titleWithDate}))|.+)`, 's'
    );
    const matches = releaseNotesRegex.exec(changelogContent);

    return matches ? {
        // tslint:disable:no-magic-numbers
        releaseTitle: matches[1],
        releaseNotes: matches[3].trim()
    } : null;
}
