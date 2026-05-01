import type { Migration } from "adminizer";
import { up as up0001, down as down0001 } from "./umzug/0001";

export const umzugExports: Migration[] = [
  {
    name: "0001",
    timestamp: 1757930548596,
    up: up0001,
    down: down0001,
  },
];
