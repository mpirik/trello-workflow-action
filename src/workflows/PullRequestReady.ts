import {
  IWorkflowBaseParams,
  WorkflowBase,
} from './WorkflowBase';

interface IPullRequestReadyParams extends IWorkflowBaseParams {
  destinationList: string;
}

export class PullRequestReady extends WorkflowBase {
  public destinationList: string;

  public constructor(params: IPullRequestReadyParams) {
    super(params);

    this.destinationList = params.destinationList;
  }

  public async execute(): Promise<string> {
    if (!this.context.payload.pull_request) {
      throw new Error(`There were no pull_request details with payload: ${JSON.stringify(this.context.payload)}`);
    }

    const board = await this.getBoard(this.trelloBoardName);
    const list = this.getList(board, this.destinationList);

    const branchName = this.context.payload.pull_request.head.ref.trim().replace(/\W+/g, '-').toLowerCase();
    const cardNumberMatches = /\d+/g.exec(branchName);
    let cardNumber;
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

    // Update issue with card link and apply labels
    let body = this.context.payload.pull_request.body || '';
    if (!body.includes(card.shortUrl)) {
      if (body) {
        body += '\n\n';
      }

      body += card.shortUrl;
    }

    const labels = new Set<string>();
    for (const label of (this.context.payload.pull_request.labels || [])) {
      labels.add(label.name);
    }

    try {
      console.log('Getting labels for repository');
      const githubRepoLabels = await this.github.issues.listLabelsForRepo({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
      });

      for (const label of card.labels) {
        const labelName = label.name.toLowerCase();
        for (const githubLabel of githubRepoLabels.data) {
          if (labelName === githubLabel.name.toLowerCase()) {
            console.log(`Adding label: ${githubLabel.name}`);
            labels.add(githubLabel.name);
            break;
          }
        }
      }
    } catch (ex) {
      // Not critical if assigning labels fails
      console.error(ex);
    }

    try {
      console.log('Updating PR with card url and labels');
      await this.github.issues.update({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        // eslint-disable-next-line @typescript-eslint/camelcase
        issue_number: this.context.payload.pull_request.number,
        body,
        labels: Array.from(labels),
      });
    } catch (ex) {
      // Not critical if updating github PR fails
      console.error(ex);
    }

    let comment: string | undefined;
    if (this.context.payload.sender) {
      comment = `Pull request ${this.context.payload.action || 'opened'} by [${this.context.payload.sender.login}](${this.context.payload.sender.html_url})`;
    } else {
      comment = `Pull request ${this.context.payload.action || 'opened'} by ${this.context.actor}`;
    }

    if (this.context.payload.pull_request.html_url) {
      comment += ` - ${this.context.payload.pull_request.html_url}`;
    }

    await this.moveCard({
      card,
      list,
      comment,
    });

    return 'Success';
  }
}
