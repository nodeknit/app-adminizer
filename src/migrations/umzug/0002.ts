import { DataTypes } from "sequelize";

export async function up({ context }: { context: any }) {
  const table = await context.describeTable("userap");
  if (table.userApiKey) return;
  await context.addColumn("userap", "userApiKey", { type: DataTypes.STRING, allowNull: true });
}

export async function down({ context }: { context: any }) {
  await context.removeColumn("userap", "userApiKey");
}
