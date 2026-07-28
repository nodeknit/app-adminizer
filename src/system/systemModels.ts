import { DataTypes, Sequelize, ModelStatic } from "sequelize";
import { SYSTEM_MODEL_NAMES } from "adminizer";
import type { SystemModelName, SystemModelBindings } from "adminizer";
import { getSystemModelOverride, buildSystemModelBindings } from "./systemModelRegistry";

export { buildSystemModelBindings } from "./systemModelRegistry";

/**
 * @deprecated Prefer `buildSystemModelBindings()` which also honours
 * `@AdminizerSystemModel` overrides. Kept as the plain default map.
 */
export const SEQUELIZE_SYSTEM_MODELS: SystemModelBindings = Object.fromEntries(
  SYSTEM_MODEL_NAMES.map((name) => [name, `${name}AP`]),
);

function systemModelOptions(modelName: string) {
  return {
    tableName: modelName.toLowerCase(),
    timestamps: true,
  };
}

type ModelMap = Record<SystemModelName, ModelStatic<any>>;

/**
 * Built-in `<Name>AP` definitions for each Adminizer system model. Returns the
 * defined model so callers can wire associations against it. These mirror
 * `fixture/models/sequelize/systemModels.ts` from the Adminizer package and
 * must satisfy `SYSTEM_MODEL_CONTRACTS`.
 */
function defineDefaultSystemModel(orm: Sequelize, name: SystemModelName): ModelStatic<any> {
  switch (name) {
    case "User":
      return orm.define(
        "UserAP",
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          login: { type: DataTypes.STRING, allowNull: false, unique: true },
          fullName: { type: DataTypes.STRING, allowNull: false },
          email: DataTypes.STRING,
          avatar: DataTypes.STRING,
          passwordHashed: DataTypes.STRING,
          timezone: DataTypes.STRING,
          expires: DataTypes.STRING,
          locale: DataTypes.STRING,
          isDeleted: DataTypes.BOOLEAN,
          isActive: DataTypes.BOOLEAN,
          isAdministrator: DataTypes.BOOLEAN,
          widgets: DataTypes.JSON,
          isConfirmed: DataTypes.BOOLEAN,
          apiKey: { type: DataTypes.STRING, field: "userApiKey" },
        },
        systemModelOptions("UserAP"),
      );
    case "Group":
      return orm.define(
        "GroupAP",
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          name: { type: DataTypes.STRING, allowNull: false, unique: true },
          description: DataTypes.STRING,
          tokens: DataTypes.JSON,
        },
        systemModelOptions("GroupAP"),
      );
    case "Filter":
      return orm.define(
        "FilterAP",
        {
          id: { type: DataTypes.STRING, primaryKey: true },
          name: { type: DataTypes.STRING, allowNull: false },
          description: DataTypes.STRING,
          modelName: { type: DataTypes.STRING, allowNull: false },
          conditions: DataTypes.JSON,
          sortField: DataTypes.STRING,
          sortDirection: DataTypes.STRING,
          visibility: DataTypes.STRING,
          ownerId: DataTypes.INTEGER,
          groupIds: DataTypes.JSON,
          apiEnabled: DataTypes.BOOLEAN,
          apiKey: DataTypes.STRING,
          icon: DataTypes.STRING,
          color: DataTypes.STRING,
          version: DataTypes.INTEGER,
        },
        systemModelOptions("FilterAP"),
      );
    case "FilterColumn":
      return orm.define(
        "FilterColumnAP",
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          fieldName: { type: DataTypes.STRING, allowNull: false },
          order: DataTypes.INTEGER,
        },
        systemModelOptions("FilterColumnAP"),
      );
    case "HistoryActions":
      return orm.define(
        "HistoryActionsAP",
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          modelId: { type: DataTypes.STRING, allowNull: false },
          modelName: { type: DataTypes.STRING, allowNull: false },
          action: DataTypes.STRING,
          data: DataTypes.JSON,
          diff: DataTypes.JSON,
          isCurrent: DataTypes.BOOLEAN,
          preview: DataTypes.BOOLEAN,
        },
        systemModelOptions("HistoryActionsAP"),
      );
    case "Notification":
      return orm.define(
        "NotificationAP",
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          title: DataTypes.STRING,
          message: DataTypes.STRING,
          notificationClass: DataTypes.STRING,
          channel: DataTypes.STRING,
          metadata: DataTypes.JSON,
        },
        systemModelOptions("NotificationAP"),
      );
    case "UserNotification":
      return orm.define(
        "UserNotificationAP",
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
          userId: { type: DataTypes.INTEGER, allowNull: false },
          read: { type: DataTypes.BOOLEAN, defaultValue: false },
        },
        systemModelOptions("UserNotificationAP"),
      );
  }
}

/**
 * Wire the relations required by the Adminizer system-model contracts. Works
 * against either built-in `<Name>AP` models or host override classes, since
 * both are Sequelize `ModelStatic`s.
 *
 * Override classes must already be registered on the ORM (e.g. the host added
 * its domain models before mounting Adminizer) so their association targets
 * resolve.
 */
function wireSystemAssociations(models: ModelMap): void {
  const { User, Group, Filter, FilterColumn, HistoryActions, Notification, UserNotification } = models;

  User.belongsToMany(Group, {
    through: "groupapuserap",
    as: "groups",
    foreignKey: "UserAPId",
    otherKey: "GroupAPId",
  });
  Group.belongsToMany(User, {
    through: "groupapuserap",
    as: "users",
    foreignKey: "GroupAPId",
    otherKey: "UserAPId",
  });

  Filter.hasMany(FilterColumn, { as: "columns", foreignKey: "FilterAPId" });
  FilterColumn.belongsTo(Filter, { as: "filter", foreignKey: "FilterAPId" });

  HistoryActions.belongsTo(User, { as: "user", foreignKey: "userId" });
  UserNotification.belongsTo(Notification, { as: "notificationId", foreignKey: "notificationIdId" });
}

/**
 * Media manager is not a logical Adminizer system model, but its tables are
 * owned by Adminizer. Keep their Sequelize definitions here so hosts using
 * sync() get the same schema as hosts using Adminizer migrations.
 */
function registerMediaManagerModels(orm: Sequelize): void {
  const media = orm.models.MediaManagerAP ?? orm.define(
    "MediaManagerAP",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      parentId: { type: DataTypes.UUID, allowNull: true },
      mimeType: DataTypes.STRING,
      path: DataTypes.STRING,
      size: DataTypes.INTEGER,
      group: DataTypes.STRING,
      tag: DataTypes.STRING,
      url: DataTypes.STRING,
      filename: DataTypes.STRING,
    },
    systemModelOptions("MediaManagerAP"),
  );
  const meta = orm.models.MediaManagerMetaAP ?? orm.define(
    "MediaManagerMetaAP",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      key: DataTypes.STRING,
      value: DataTypes.JSON,
      isPublic: DataTypes.BOOLEAN,
      parentId: DataTypes.UUID,
    },
    systemModelOptions("MediaManagerMetaAP"),
  );
  const associations = orm.models.MediaManagerAssociationsAP ?? orm.define(
    "MediaManagerAssociationsAP",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      mediaManagerId: DataTypes.STRING,
      model: DataTypes.STRING,
      modelId: DataTypes.STRING,
      widgetName: DataTypes.STRING,
      sortOrder: DataTypes.INTEGER,
      fileId: DataTypes.UUID,
    },
    systemModelOptions("MediaManagerAssociationsAP"),
  );

  media.hasMany(media, { as: "variants", foreignKey: "parentId" });
  media.hasMany(meta, { as: "meta", foreignKey: "parentId" });
  media.hasMany(associations, { as: "modelAssociation", foreignKey: "fileId" });
}

/**
 * Define Adminizer's system models on the host Sequelize instance.
 *
 * Replaces the removed `SequelizeAdapter.registerSystemModels()` static. For
 * each logical system model it either reuses a host model declared with
 * `@AdminizerSystemModel(...)` or defines the built-in `<Name>AP` fallback,
 * then wires the contract relations. Returns the logical → host name map for
 * the adapter (same result as `buildSystemModelBindings()`).
 */
export function registerSequelizeSystemModels(orm: Sequelize): SystemModelBindings {
  const models = {} as ModelMap;

  for (const name of SYSTEM_MODEL_NAMES) {
    const override = getSystemModelOverride(name) as ModelStatic<any> | undefined;
    if (override) {
      // Host owns this system model. It must already be on the ORM so its own
      // associations (e.g. to other domain models) are resolvable.
      const registered = orm.models[override.name];
      if (!registered) {
        throw new Error(
          `Model "${override.name}" is declared as Adminizer system model "${name}" via ` +
            `@AdminizerSystemModel but is not registered on the Sequelize instance. ` +
            `Register your domain models before mounting Adminizer.`,
        );
      }
      models[name] = registered as ModelStatic<any>;
    } else {
      models[name] = defineDefaultSystemModel(orm, name);
    }
  }

  wireSystemAssociations(models);
  registerMediaManagerModels(orm);
  return buildSystemModelBindings();
}
