import { generate } from "password-hash";
import type { IMcpTool } from "@nodeknit/app-mcp";

const MCP_DOC_REF = "docs/mcp-usage.md";

type UserAction = "read" | "create" | "update" | "delete";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapUser(item: any): Record<string, unknown> {
  return {
    id: item.id,
    login: item.login,
    fullName: item.fullName,
    email: item.email ?? null,
    isActive: item.isActive,
    isAdministrator: item.isAdministrator,
    isConfirmed: item.isConfirmed,
    groups: Array.isArray(item.GroupAPs) ? item.GroupAPs.map((g: any) => g.name) : undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

async function syncGroups(user: any, groupModel: any, groupNames: unknown): Promise<string[] | undefined> {
  if (!Array.isArray(groupNames) || !groupModel) return undefined;

  const names = groupNames.filter((n): n is string => typeof n === "string" && n.trim().length > 0).map((n) => n.trim());
  const groups = [];
  for (const name of names) {
    const group = await groupModel.findOne({ where: { name } });
    if (group) groups.push(group);
  }

  await user.setGroupAPs?.(groups);
  return groups.map((g: any) => g.name);
}

export const userTool: IMcpTool = {
  name: "adminizer.user",
  description: `Read/create/update/delete Adminizer users (UserAP). Optionally manage group (GroupAP) membership. MCP doc reference: ${MCP_DOC_REF}`,
  mode: "protected",
  inputSchema: {
    type: "object",
    required: ["action"],
    additionalProperties: false,
    properties: {
      action: {
        type: "string",
        enum: ["read", "create", "update", "delete"],
        description: "Operation type."
      },
      id: { type: "integer", description: "User id. Required for update/delete; optional single-item lookup for read." },
      login: { type: "string", description: "User login. Alternative single-item lookup for read; required for create." },
      filter: {
        type: "object",
        additionalProperties: false,
        description: "Used by read when id/login are not provided.",
        properties: {
          isActive: { type: "boolean", description: "Filter by active flag." },
          isAdministrator: { type: "boolean", description: "Filter by administrator flag." },
          isConfirmed: { type: "boolean", description: "Filter by confirmed flag." },
          loginLike: { type: "string", description: "Case-insensitive login contains filter." },
          fullNameLike: { type: "string", description: "Case-insensitive full name contains filter." }
        }
      },
      pagination: {
        type: "object",
        additionalProperties: false,
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 500, description: "Items per page, default 100." },
          offset: { type: "integer", minimum: 0, description: "Skip items, default 0." }
        }
      },
      data: {
        type: "object",
        additionalProperties: false,
        description: "Fields for create/update.",
        properties: {
          login: { type: "string", description: "Unique login (create only; logins are immutable here)." },
          password: { type: "string", description: "Plain password; will be hashed using AP_PASSWORD_SALT." },
          fullName: { type: "string", description: "Display name." },
          email: { type: "string", description: "Email address." },
          isActive: { type: "boolean" },
          isAdministrator: { type: "boolean" },
          isConfirmed: { type: "boolean" },
          groups: {
            type: "array",
            description: "Group names (GroupAP.name) the user should belong to. Replaces existing membership.",
            items: { type: "string" }
          }
        }
      }
    }
  },
  async handler(params, context) {
    const payload = isRecord(params) ? params : {};
    const action = String(payload.action || "") as UserAction;

    const sequelize = context.appManager.sequelize;
    const userModel = sequelize.models.UserAP as any;
    const groupModel = sequelize.models.GroupAP as any;

    if (!userModel) {
      throw new Error("UserAP model is not registered");
    }

    const include = groupModel ? [{ model: groupModel }] : [];

    if (action === "read") {
      const id = typeof payload.id === "number" ? payload.id : null;
      const login = typeof payload.login === "string" ? payload.login.trim() : "";

      if (id !== null || login) {
        const where = id !== null ? { id } : { login };
        const item = await userModel.findOne({ where, include });
        if (!item) {
          throw new Error("User not found");
        }
        return { action, item: mapUser(item), mcpDocRef: MCP_DOC_REF };
      }

      const filter = isRecord(payload.filter) ? payload.filter : {};
      const pagination = isRecord(payload.pagination) ? payload.pagination : {};
      const where: Record<string, unknown> = {};
      const { Op } = await import("sequelize");

      if (typeof filter.isActive === "boolean") where.isActive = filter.isActive;
      if (typeof filter.isAdministrator === "boolean") where.isAdministrator = filter.isAdministrator;
      if (typeof filter.isConfirmed === "boolean") where.isConfirmed = filter.isConfirmed;
      if (typeof filter.loginLike === "string" && filter.loginLike.trim()) {
        where.login = { [Op.iLike]: `%${filter.loginLike.trim()}%` };
      }
      if (typeof filter.fullNameLike === "string" && filter.fullNameLike.trim()) {
        where.fullName = { [Op.iLike]: `%${filter.fullNameLike.trim()}%` };
      }

      const limit = typeof pagination.limit === "number" ? Math.max(1, Math.min(500, pagination.limit)) : 100;
      const offset = typeof pagination.offset === "number" ? Math.max(0, pagination.offset) : 0;

      const rows = await userModel.findAll({
        where,
        include,
        order: [["id", "ASC"]],
        limit,
        offset
      });

      return {
        action,
        count: rows.length,
        pagination: { limit, offset },
        items: rows.map(mapUser),
        mcpDocRef: MCP_DOC_REF
      };
    }

    if (action === "create") {
      const login = typeof payload.login === "string" ? payload.login.trim() : "";
      const data = isRecord(payload.data) ? payload.data : {};
      const password = typeof data.password === "string" ? data.password : "";
      const fullName = typeof data.fullName === "string" ? data.fullName.trim() : "";

      if (!login || !password || !fullName) {
        throw new Error("login, data.password and data.fullName are required for create");
      }
      if (!process.env.AP_PASSWORD_SALT) {
        throw new Error("AP_PASSWORD_SALT is not set; cannot hash password");
      }

      const existing = await userModel.findOne({ where: { login } });
      if (existing) {
        throw new Error(`User with login '${login}' already exists`);
      }

      const passwordHashed = generate(login + password + process.env.AP_PASSWORD_SALT);

      const user = await userModel.create({
        login,
        password,
        passwordHashed,
        fullName,
        email: typeof data.email === "string" ? data.email : undefined,
        isActive: typeof data.isActive === "boolean" ? data.isActive : true,
        isAdministrator: typeof data.isAdministrator === "boolean" ? data.isAdministrator : false,
        isConfirmed: typeof data.isConfirmed === "boolean" ? data.isConfirmed : false
      });

      const groups = await syncGroups(user, groupModel, data.groups);

      return { action, item: { ...mapUser(user), groups }, mcpDocRef: MCP_DOC_REF };
    }

    if (action === "update") {
      const id = typeof payload.id === "number" ? payload.id : null;
      if (id === null) {
        throw new Error("id is required for update");
      }

      const user = await userModel.findByPk(id);
      if (!user) {
        throw new Error("User not found");
      }

      const data = isRecord(payload.data) ? payload.data : {};
      const updates: Record<string, unknown> = {};

      if (typeof data.fullName === "string" && data.fullName.trim()) updates.fullName = data.fullName.trim();
      if (typeof data.email === "string") updates.email = data.email;
      if (typeof data.isActive === "boolean") updates.isActive = data.isActive;
      if (typeof data.isAdministrator === "boolean") updates.isAdministrator = data.isAdministrator;
      if (typeof data.isConfirmed === "boolean") updates.isConfirmed = data.isConfirmed;

      if (typeof data.password === "string" && data.password) {
        if (!process.env.AP_PASSWORD_SALT) {
          throw new Error("AP_PASSWORD_SALT is not set; cannot hash password");
        }
        updates.password = data.password;
        updates.passwordHashed = generate(user.login + data.password + process.env.AP_PASSWORD_SALT);
      }

      if (Object.keys(updates).length > 0) {
        await user.update(updates);
      }

      const groups = await syncGroups(user, groupModel, data.groups);

      return { action, item: { ...mapUser(user), ...(groups ? { groups } : {}) }, mcpDocRef: MCP_DOC_REF };
    }

    if (action === "delete") {
      const id = typeof payload.id === "number" ? payload.id : null;
      if (id === null) {
        throw new Error("id is required for delete");
      }

      const user = await userModel.findByPk(id);
      if (!user) {
        throw new Error("User not found");
      }

      await user.destroy();
      return { action, deleted: true, id, mcpDocRef: MCP_DOC_REF };
    }

    throw new Error(`Unsupported action: ${action}`);
  }
};
