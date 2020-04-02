import { Context } from '@actions/github/lib/context';
import { GitHubWithTrelloApi } from '../types/GitHubWithTrelloApi';
import {
  IDataResponse,
  IErrorResponse,
} from '../types/IExtendedGitHub';
import {
  IBoard,
  ICard,
  IList,
} from '../types/trello';

export interface IWorkflowBaseParams {
  github: GitHubWithTrelloApi;
  context: Context;
  trelloKey: string;
  trelloToken: string;
  trelloBoardName: string;
}

interface IGetCardParams {
  boardId: string;
  cardNumber: string;
}

interface IMoveCardParams {
  card: ICard;
  list: IList;
  comment?: string;
}

export abstract class WorkflowBase {
  protected github: GitHubWithTrelloApi;

  protected context: Context;

  protected trelloKey: string;

  protected trelloToken: string;

  protected trelloBoardName: string;

  public constructor({
    github,
    context,
    trelloKey,
    trelloToken,
    trelloBoardName,
  }: IWorkflowBaseParams) {
    this.github = github;
    this.context = context;
    this.trelloKey = trelloKey;
    this.trelloToken = trelloToken;
    this.trelloBoardName = trelloBoardName;
  }

  public abstract execute(): Promise<string>;

  protected assertValidTrelloResponse<T>(response: IDataResponse<T> | IErrorResponse, errorMessage: string): asserts response is IDataResponse<T> {
    if (!(response as IDataResponse<T>).data) {
      const errorResponse = response as IErrorResponse;
      throw new Error(`${errorMessage}: ${errorResponse.error}\n${errorResponse.message}`);
    }
  }

  protected async getBoard(name: string): Promise<IBoard> {
    const listBoardsResponse = await this.github.trello.listBoards({
      key: this.trelloKey,
      token: this.trelloToken,
    });

    this.assertValidTrelloResponse(listBoardsResponse, 'Unable to fetch boards');

    const boards = listBoardsResponse.data.filter((board) => board.name === name);
    if (boards.length !== 1) {
      throw new Error(`Unable to find board: ${name}`);
    }

    const board = boards[0];
    console.log(`Found board: ${board.id}`);

    return board;
  }

  protected getList(board: IBoard, listName: string): IList {
    const lists = board.lists.filter((list) => list.name === listName && !list.closed);
    if (lists.length !== 1) {
      throw new Error(`Unable to find list: ${listName}`);
    }

    const list = lists[0];
    console.log(`Found list: ${list.id} - ${list.name}`);

    return list;
  }

  protected async getCard({
    boardId,
    cardNumber,
  }: IGetCardParams): Promise<ICard> {
    const cardResponse = await this.github.trello.getCard({
      key: this.trelloKey,
      token: this.trelloToken,
      boardId,
      cardNumber,
    });

    this.assertValidTrelloResponse(cardResponse, 'Unable to get card details');

    const card = cardResponse.data;

    console.log(`Found card: ${card.id}`);
    return card;
  }

  protected async moveCard({
    card,
    list,
    comment,
  }: IMoveCardParams): Promise<void> {
    if (card.idList === list.id) {
      console.log('Card already in list');
      return;
    }

    console.log(`Moving card to list: ${list.name}`);
    await this.github.trello.moveCard({
      key: this.trelloKey,
      token: this.trelloToken,
      cardId: card.id,
      idList: list.id,
    });

    if (comment) {
      try {
        await this.github.trello.addCommentToCard({
          key: this.trelloKey,
          token: this.trelloToken,
          cardId: card.id,
          text: comment,
        });
      } catch (ex) {
        // Log, but ignore since this is a bonus and not the primary action
        console.error(ex);
      }
    }

    console.log(`Moved card ${card.id} to list: ${list.name}`);
  }
}
