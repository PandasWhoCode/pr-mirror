export interface PrMirrorOptions {
  base: string;
  number: number;
  org: string;
  repo: string;
  sync: boolean;
}

export interface GitHubAuth {
  token: string;
  username: string;
}
