import type { AppManager } from "@nodeknit/app-manager";

/**
 * Локальная копия контракта MCP-инструмента.
 *
 * Дублируем интерфейс намеренно, чтобы app-adminizer не зависел от пакета
 * @nodeknit/app-mcp ради одного типа. app-mcp собирает эти инструменты через
 * коллекцию `mcpTools`; структурной совместимости (duck typing) достаточно.
 */
export type McpToolMode = "public" | "protected";

export interface IMcpContext {
  appManager: AppManager;
  req?: unknown;
}

export interface IMcpTool {
  name: string;
  description: string;
  mode: McpToolMode;
  inputSchema?: Record<string, unknown>;
  handler: (params: unknown, context: IMcpContext) => Promise<unknown>;
}
