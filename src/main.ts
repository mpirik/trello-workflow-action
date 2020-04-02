import * as core from '@actions/core';
import { context, GitHub } from '@actions/github';
import { processGithubEvent } from './processGithubEvent';
import { GitHubWithTrelloApi } from './types/GitHubWithTrelloApi';

async function main(): Promise<void> {
  const githubToken = core.getInput('github-token', { required: true });
  const debug = core.getInput('debug') === 'true';
  const userAgent = core.getInput('user-agent');
  const trelloKey = core.getInput('trello-key', { required: true });
  const trelloToken = core.getInput('trello-token', { required: true });
  const trelloBoardName = core.getInput('trello-board-name', { required: true });
  const workingOnDestinationList = core.getInput('working-on-destination-list');
  const prReadyDestinationList = core.getInput('pr-ready-destination-list');
  const prMergedDestinationList = core.getInput('pr-merged-destination-list');
  const prMergedCloseMilestone = core.getInput('pr-merged-close-milestone') === 'true';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: {[key: string]: any} = {};
  if (debug) {
    opts.log = console;

    console.log(`GitHub Payload: \n${JSON.stringify(context.payload)}`);
  }

  if (userAgent != null) {
    opts.userAgent = userAgent;
  }

  const github = new GitHub(githubToken, opts) as GitHubWithTrelloApi;

  github.registerEndpoints({
    trello: {
      listBoards: {
        method: 'GET',
        url: 'https://api.trello.com/1/members/me/boards?key=:key&token=:token&lists=all&fields=name',
        params: {
          key: {
            required: true,
            type: 'string',
          },
          token: {
            required: true,
            type: 'string',
          },
        },
      },
      getCard: {
        method: 'GET',
        url: 'https://api.trello.com/1/boards/:boardId/cards/:cardNumber?key=:key&token=:token',
        params: {
          key: {
            required: true,
            type: 'string',
          },
          token: {
            required: true,
            type: 'string',
          },
          boardId: {
            required: true,
            type: 'string',
          },
          cardNumber: {
            required: true,
            type: 'string',
          },
        },
      },
      moveCard: {
        method: 'PUT',
        url: 'https://api.trello.com/1/cards/:cardId',
        params: {
          key: {
            required: true,
            type: 'string',
          },
          token: {
            required: true,
            type: 'string',
          },
          cardId: {
            required: true,
            type: 'string',
          },
          idList: {
            required: true,
            type: 'string',
          },
        },
      },
      addAttachmentToCard: {
        method: 'POST',
        url: 'https://api.trello.com/1/cards/:cardId/attachments',
        params: {
          key: {
            required: true,
            type: 'string',
          },
          token: {
            required: true,
            type: 'string',
          },
          cardId: {
            required: true,
            type: 'string',
          },
          name: {
            required: true,
            type: 'string',
          },
          url: {
            required: true,
            type: 'string',
          },
        },
      },
      addCommentToCard: {
        method: 'POST',
        url: 'https://api.trello.com/1/cards/:cardId/actions/comments',
        params: {
          key: {
            required: true,
            type: 'string',
          },
          token: {
            required: true,
            type: 'string',
          },
          cardId: {
            required: true,
            type: 'string',
          },
          text: {
            required: true,
            type: 'string',
          },
        },
      },
    },
  });

  const result = await processGithubEvent({
    github,
    context,
    trelloKey,
    trelloToken,
    trelloBoardName,
    workingOnDestinationList,
    prReadyDestinationList,
    prMergedDestinationList,
    prMergedCloseMilestone,
  });

  core.setOutput('result', JSON.stringify(result));
}

function handleError(err: Error | {} | null | undefined): void {
  console.error(err);

  if (err && (err as Error).message) {
    core.setFailed((err as Error).message);
  } else {
    core.setFailed(`Unhandled error: ${err}`);
  }
}

process.on('unhandledRejection', handleError);
main().catch(handleError);
