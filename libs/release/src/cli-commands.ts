import { program } from 'commander';
import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';

import { PublishReleaseCITask } from './release/publish-release-ci';
import { PublishReleaseFromDistTask } from './release/publish-release-from-dist';
import { PublishReleaseCIGitlabTask } from './release/publish-release-gitlab-ci';
import { StageReleaseTask } from './release/stage-release';
import { StageReleaseCommitTask } from './release/stage-release-commit';


const ROOT_DIR = process.env['INIT_CWD'] ?? process.cwd();
const DIST_DIR = join(ROOT_DIR, 'dist');
enum CommandTypes {
    Stage = 'stage',
    StageCommit = 'stage-commit',
    PublishCi = 'publish-ci',
    PublishDist = 'publish-dist',
    PublishCIGitlab = 'publish-ci-gitlab'
}

export const runCliCommands = () => {
    dotenvConfig();

    program
        .command('release')
        .arguments('<action>')
        .option('-p, --project-dir <string>', 'project root directory', process.env['MOSAIC_RELEASE_PROJECT'] ?? ROOT_DIR)
        .option('-d, --dist-dir <string>', 'packages dist directory', process.env['MOSAIC_RELEASE_DIST'] ?? DIST_DIR)
        .option('-c, --changelog-scope <string>', 'default changelog scope', process.env['MOSAIC_CHANGELOG_SCOPE'] ?? 'mosaic')
        .option('-n, --without-references', 'exclude changelog links', false)
        .option('-n, --without-notification', 'cancel mattermost notifications', false)
        .option('-o, --repo-owner <string>', 'github owner name', process.env['MOSAIC_REPO_OWNER'] ?? 'mosaic')
        .option('-n, --repo-name <string>', 'github repo name', process.env['MOSAIC_REPO_NAME'] ?? 'mosaic-design')
        .option('-u, --repo-url <string>', 'github repo name', process.env['MOSAIC_REPO_URL'])
        .action((subcommand, options) => {
            // tslint:disable-next-line:switch-default
            switch (subcommand) {
                case CommandTypes.Stage:
                    new StageReleaseTask(options).run();
                    break;
                case CommandTypes.StageCommit:
                    new StageReleaseCommitTask(options).run();
                    break;
                case CommandTypes.PublishCi:
                    new PublishReleaseCITask(options).run();
                    break;
                case CommandTypes.PublishDist:
                    new PublishReleaseFromDistTask(options).run();
                    break;
                case CommandTypes.PublishCIGitlab:
                    new PublishReleaseCIGitlabTask(options).run();
            }
        });

    program.parse();
};
