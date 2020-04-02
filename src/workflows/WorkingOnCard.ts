import {
  IWorkflowBaseParams,
  WorkflowBase,
} from './WorkflowBase';

interface IWorkingOnCardParams extends IWorkflowBaseParams {
  destinationList: string;
}

export class WorkingOnCard extends WorkflowBase {
  public destinationList: string;

  public constructor(params: IWorkingOnCardParams) {
    super(params);

    this.destinationList = params.destinationList;
  }

  public async execute(): Promise<string> {
    const board = await this.getBoard(this.trelloBoardName);
    const list = this.getList(board, this.destinationList);

    let comment: string | undefined;

    // NOTE: https://developer.github.com/v3/git/refs/#create-a-reference
    let branchName = this.context.ref.trim().replace(/\W+/g, '-').toLowerCase();
    if (this.context.payload.pull_request) {
      branchName = this.context.payload.pull_request.head.ref.trim().replace(/\W+/g, '-').toLowerCase();
      if (this.context.payload.sender) {
        comment = `Pull request closed by [${this.context.payload.sender.login}](${this.context.payload.sender.html_url})`;
      } else {
        comment = `Pull request closed by ${this.context.actor}`;
      }
    }

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

    await this.moveCard({
      card,
      list,
      comment,
    });

    return 'Success';
  }
}
