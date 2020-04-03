import type { Octokit } from '@octokit/rest';
import {
  IWorkflowBaseParams,
  WorkflowBase,
} from './WorkflowBase';

interface IPullRequestMergedParams extends IWorkflowBaseParams {
  destinationList: string;
  closeMilestone: boolean;
}

interface ICreateMilestoneParams {
  due: string;
  title?: string;
}

export class PullRequestMerged extends WorkflowBase {
  public destinationList: string;

  public closeMilestone: boolean;

  public constructor(params: IPullRequestMergedParams) {
    super(params);

    this.destinationList = params.destinationList;
    this.closeMilestone = params.closeMilestone;
  }

  public async execute(): Promise<string> {
    if (!this.context.payload.pull_request) {
      throw new Error(`There were no pull_request details with payload: ${JSON.stringify(this.context.payload)}`);
    }

    const board = await this.getBoard(this.trelloBoardName);
    const list = this.getList(board, this.destinationList);

    const branchName = this.context.payload.pull_request.head.ref.trim().replace(/\W+/g, '-').toLowerCase();
    const cardNumberMatches = /\d+/g.exec(branchName);
    let cardNumber: string | undefined;
    if (cardNumberMatches && cardNumberMatches.length) {
      [cardNumber] = cardNumberMatches;
    }

    if (!cardNumber) {
      console.log(JSON.stringify(this.context.payload));
      return 'Could not find card number in branch name';
    }

    const card = await this.getCard({
      boardId: board.id,
      cardNumber,
    });

    let comment: string;
    if (this.context.payload.sender) {
      comment = `Pull request merged by [${this.context.payload.sender.login}](${this.context.payload.sender.html_url})`;
    } else {
      comment = `Pull request merged by ${this.context.actor}`;
    }

    await this.moveCard({
      card,
      list,
      comment,
    });

    try {
      const now = new Date().toISOString();
      const milestone = await this.createMilestone({
        due: now,
      });

      console.log('Assigning PR to milestone');
      await this.github.issues.update({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        // eslint-disable-next-line @typescript-eslint/camelcase
        issue_number: this.context.payload.pull_request.number,
        milestone: milestone.number,
      });

      console.log('Determining release name');
      const releaseNameMatches = now.match(/^([0-9]+)-([0-9]+)-([0-9]+)T([0-9]+):([0-9]+):([0-9]+)/);
      if (releaseNameMatches) {
        let releaseName = '';
        for (let i = 1; i < releaseNameMatches.length; i += 1) {
          releaseName += releaseNameMatches[i];
        }

        console.log(`Creating github release: ${releaseName}`);
        await this.github.repos.createRelease({
          owner: this.context.repo.owner,
          repo: this.context.repo.repo,
          // eslint-disable-next-line @typescript-eslint/camelcase
          tag_name: releaseName,
          name: releaseName,
          body: `* [${card.name}](${card.shortUrl})`,
        });
        console.log('Done creating github release!');
      } else {
        console.error('Could not figure out how to name the release :(');
      }

      console.log('Adding milestone as card attachment');
      await this.github.trello.addAttachmentToCard({
        key: this.trelloKey,
        token: this.trelloToken,
        cardId: card.id,
        name: 'github-milestone',
        url: milestone.html_url,
      });
    } catch (ex) {
      console.error(ex);
    }

    return 'Success';
  }

  private async createMilestone({
    due,
    title = `Deploy ${due}`,
  }: ICreateMilestoneParams): Promise<Octokit.IssuesCreateMilestoneResponse> {
    const milestoneResponse = await this.github.issues.createMilestone({
      owner: this.context.repo.owner,
      repo: this.context.repo.repo,
      title,
      state: this.closeMilestone ? 'closed' : 'open',
      // eslint-disable-next-line @typescript-eslint/camelcase
      due_on: due,
    });

    const milestone = milestoneResponse.data;
    if (!milestone) {
      throw new Error(`Unable to get newly created milestone: ${JSON.stringify(milestoneResponse)}`);
    }

    console.log(`Milestone created: ${milestone.id}`);
    return milestone;
  }
}
