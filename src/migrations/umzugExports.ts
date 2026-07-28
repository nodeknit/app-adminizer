import type { Migration } from "./types";
import { up as up0001, down as down0001 } from "./umzug/0001";
import { up as up0002, down as down0002 } from "./umzug/0002";

export const umzugExports: Migration[] = [
  {
    name: "0001",
    timestamp: 1757930548596,
    up: up0001,
    down: down0001,
  },
  {
    name: "0002",
    timestamp: 1758017000000,
    up: up0002,
    down: down0002,
  },
];
