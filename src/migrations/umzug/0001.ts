import { DataTypes } from "sequelize";

export async function up({ context }: { context: any }) {
  await context.createTable("userap", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    login: { type: DataTypes.STRING, unique: true },
    fullName: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    avatar: { type: DataTypes.STRING },
    passwordHashed: { type: DataTypes.STRING },
    timezone: { type: DataTypes.STRING },
    expires: { type: DataTypes.STRING },
    locale: { type: DataTypes.STRING },
    isDeleted: { type: DataTypes.BOOLEAN },
    isActive: { type: DataTypes.BOOLEAN },
    isAdministrator: { type: DataTypes.BOOLEAN },
    widgets: { type: DataTypes.JSON },
    isConfirmed: { type: DataTypes.BOOLEAN },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await context.createTable("groupap", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    name: { type: DataTypes.STRING, unique: true },
    description: { type: DataTypes.STRING },
    tokens: { type: DataTypes.JSON },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await context.createTable("mediamanagerap", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    parentId: { type: DataTypes.UUID, allowNull: true, references: { model: "mediamanagerap", key: "id" } },
    mimeType: { type: DataTypes.STRING },
    path: { type: DataTypes.STRING },
    size: { type: DataTypes.INTEGER },
    group: { type: DataTypes.STRING },
    tag: { type: DataTypes.STRING },
    url: { type: DataTypes.STRING },
    filename: { type: DataTypes.STRING },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await context.createTable("mediamanagermetaap", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    key: { type: DataTypes.STRING },
    value: { type: DataTypes.JSON },
    isPublic: { type: DataTypes.BOOLEAN },
    parentId: { type: DataTypes.UUID, allowNull: true, references: { model: "mediamanagerap", key: "id" } },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await context.createTable("mediamanagerassociationsap", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    mediaManagerId: { type: DataTypes.STRING },
    model: { type: DataTypes.STRING },
    modelId: { type: DataTypes.INTEGER },
    widgetName: { type: DataTypes.STRING },
    sortOrder: { type: DataTypes.INTEGER },
    fileId: { type: DataTypes.UUID, allowNull: true, references: { model: "mediamanagerap", key: "id" } },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await context.createTable("notificationap", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    title: { type: DataTypes.STRING },
    message: { type: DataTypes.STRING },
    notificationClass: { type: DataTypes.STRING },
    channel: { type: DataTypes.STRING },
    metadata: { type: DataTypes.JSON },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await context.createTable("usernotificationap", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    userId: { type: DataTypes.INTEGER },
    notificationIdId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "notificationap", key: "id" } },
    read: { type: DataTypes.BOOLEAN },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await context.createTable("navigationap", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    label: { type: DataTypes.STRING, unique: true },
    tree: { type: DataTypes.JSON },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await context.createTable("groupapuserap", {
    UserAPId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "userap", key: "id" } },
    GroupAPId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "groupap", key: "id" } },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });
  await context.addConstraint("groupapuserap", {
    fields: ["GroupAPId", "UserAPId"],
    type: "unique",
    name: "groupapuserap_groupapid_userapid_unique",
  });
}

export async function down({ context }: { context: any }) {
  await context.dropTable("groupapuserap");
  await context.dropTable("usernotificationap");
  await context.dropTable("mediamanagermetaap");
  await context.dropTable("mediamanagerassociationsap");
  await context.dropTable("mediamanagerap");
  await context.dropTable("navigationap");
  await context.dropTable("notificationap");
  await context.dropTable("groupap");
  await context.dropTable("userap");
}
