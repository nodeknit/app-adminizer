export type Migration = {
  name: string;
  timestamp: number;
  up: (args: { context: any }) => Promise<unknown> | unknown;
  down: (args: { context: any }) => Promise<unknown> | unknown;
};
