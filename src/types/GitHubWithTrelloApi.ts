import { GitHub } from '@actions/github';
import { IExtendedGitHub } from './IExtendedGitHub';

export type GitHubWithTrelloApi = GitHub & IExtendedGitHub;
