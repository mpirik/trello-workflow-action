import { Context } from '@actions/github/lib/context';
import {
  PullRequestMerged, PullRequestReady,
  WorkingOnCard,
} from './workflows';
import { WorkflowBase } from './workflows/WorkflowBase';
import { GitHubWithTrelloApi } from './types/GitHubWithTrelloApi';

export function processGithubEvent({
  github,
  context,
  trelloKey,
  trelloToken,
  trelloBoardName,
  workingOnDestinationList,
  prReadyDestinationList,
  prMergedDestinationList,
  prMergedCloseMilestone,
}: {
  github: GitHubWithTrelloApi;
  context: Context;
  trelloKey: string;
  trelloToken: string;
  trelloBoardName: string;
  workingOnDestinationList: string;
  prReadyDestinationList: string;
  prMergedDestinationList: string;
  prMergedCloseMilestone: boolean;
}): Promise<string> {
  let workflow: WorkflowBase;
  if (context.payload.pull_request) {
    if (context.payload.action === 'closed') {
      if (context.payload.pull_request.merged) {
        workflow = new PullRequestMerged({
          github,
          context,
          trelloKey,
          trelloToken,
          trelloBoardName,
          destinationList: prMergedDestinationList,
          closeMilestone: prMergedCloseMilestone,
        });
      } else {
        // pull_request closed (not merged)
        workflow = new WorkingOnCard({
          github,
          context,
          trelloKey,
          trelloToken,
          trelloBoardName,
          destinationList: workingOnDestinationList,
        });
      }
    } else {
      // pull_request opened or reopened
      workflow = new PullRequestReady({
        github,
        context,
        trelloKey,
        trelloToken,
        trelloBoardName,
        destinationList: prReadyDestinationList,
      });
    }
  } else {
    // Branch created
    workflow = new WorkingOnCard({
      github,
      context,
      trelloKey,
      trelloToken,
      trelloBoardName,
      destinationList: workingOnDestinationList,
    });
  }

  return workflow.execute();
}
