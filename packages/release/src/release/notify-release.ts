/* tslint:disable:no-console */
import chalk from 'chalk';
import request from 'request';


const HTTP_CODE_OK = 200;
const { green, red } = chalk;

export function notify(releaseData: any) {
    console.log(green('Start MM notification'));

    if (!verifyNotificationPossibility()) {
        return;
    }

    const matterMost = process.env['MATTERMOST_ENDPOINT_URL'];
    const channel = process.env['MATTERMOST_CHANNEL'];

    const headers = { 'Content-Type': 'application/json' };
    const body = {
        channel: `${channel}`,
        username: 'Wall-e',
        short: false,
        text: `## ${releaseData.releaseTitle}\n ${releaseData.releaseNotes}`
    };

    console.log('POST notification: ', { url: matterMost, headers, body: JSON.stringify(body) });

    //@ts-ignore
    request.post(
        // escape single quote
        { url: matterMost, headers, body: JSON.stringify(body) },
        (error, response, responseBody) => {
            if (error || response.statusCode !== HTTP_CODE_OK) {
                // tslint:disable-next-line:no-console
                console.error(red(`  ✘   Could not post notification in Mattermost.`));
                console.log(response.statusCode, responseBody);

                return;
            }

            console.info(green(`  ✓   Notification is posted in Mattermost.`));
        }
    );
}

export function verifyNotificationPossibility() {
    return process.env['MATTERMOST_ENDPOINT_URL'] && process.env['MATTERMOST_CHANNEL'];
}
