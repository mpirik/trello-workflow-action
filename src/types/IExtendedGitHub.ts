import {
  IAttachment,
  IBoard,
  ICard,
} from './trello';

export interface IDataResponse<T> {
  data: T;
}

export interface IErrorResponse {
  error: string;
  message: string;
}

interface IKeyAndTokenParams {
  key: string;
  token: string;
}

interface IGetCardParams extends IKeyAndTokenParams {
  boardId: string;
  cardNumber: string;
}

interface IMoveCardParams extends IKeyAndTokenParams {
  cardId: string;
  idList: string;
}

interface IAddAttachmentToCardParams extends IKeyAndTokenParams {
  cardId: string;
  name: string;
  url: string;
}

interface IAddCommentToCardParams extends IKeyAndTokenParams {
  cardId: string;
  text: string;
}

export interface IExtendedGitHub {
  trello: {
    listBoards(params: IKeyAndTokenParams): Promise<IErrorResponse | IDataResponse<IBoard[]>>;
    getCard(params: IGetCardParams): Promise<IErrorResponse | IDataResponse<ICard>>;
    moveCard(params: IMoveCardParams): Promise<IErrorResponse | IDataResponse<ICard>>;
    addAttachmentToCard(params: IAddAttachmentToCardParams): Promise<IErrorResponse | IDataResponse<IAttachment>>;
    addCommentToCard(params: IAddCommentToCardParams): Promise<IErrorResponse | IDataResponse<void>>;
  };
}
