import { AppManager, CollectionHandler, AbstractApp, Collection } from "@nodeknit/app-manager";
import { Adminizer, AdminizerConfig, AdminpanelConfig, Migration, SequelizeAdapter, migrations } from "adminizer"
import path from 'path';
import serveStatic from 'serve-static';
import { Request, Response, NextFunction } from 'express';
import { AbstractModelConfig } from "./abstract/AbstractModelConfig";

// Local minimal typings to avoid relying on internal exports of app-manager
type LocalCollectionItem = { appId: string; item: any };
// import * as adminpanelConfig from "./adminizerConfig"

function safeCloneConfig<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => safeCloneConfig(item)) as T;
  }

  if (value && typeof value === "object") {
    const cloned: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      cloned[key] = safeCloneConfig(entry);
    }
    return cloned as T;
  }

  return value;
}

class ConfigProcessor {
  adminizer!: Adminizer
  appDefaultConfig!: AdminizerConfig

  preRunConfig = {}

  isInitialized = false
  init(adminizer: Adminizer) {
    this.adminizer = adminizer
    this.appDefaultConfig = safeCloneConfig(adminizer.config);
    this.isInitialized = true
    this.adminizer.config = { ...this.adminizer.defaultConfig, ...this.appDefaultConfig, ...this.preRunConfig }
    // console.log(this.adminizer.config)
  }

  updateModelConfig(config: AbstractModelConfig) {
    this.adminizer.config.models[config.modelname] = config.config
  }

  updateConfig(config: AdminpanelConfig) {
    console.log(this.isInitialized, "this.isInitialized")

    if (this.isInitialized) {
      this.adminizer.config = { ...this.appDefaultConfig, ...config }
      console.log(this.adminizer.config, "preRunConfig", config)

    } else {
      this.preRunConfig = { ...this.appDefaultConfig, ...config }
    }
  }
}


export class AppAdminizer extends AbstractApp {
  readonly appId: string = "app-adminizer";
  readonly name: string = "Adminizer";
  public config: AdminizerConfig = {} as AdminizerConfig
  configProcessor = new ConfigProcessor()
  sequelizeAdapter = new SequelizeAdapter(this.appManager.sequelize)
  adminizer = new Adminizer([this.sequelizeAdapter]);

  @Collection
  migrations: Migration[] = migrations.umzug
  @CollectionHandler('adminizerModelConfigs')
  adminizerModelConfigs: AdminizerModelConfigHandler = new AdminizerModelConfigHandler(
    this.adminizer,
    this.sequelizeAdapter,
    this.configProcessor
  );

  @CollectionHandler('adminizerConfigs')
  adminizerConfigHandler: AdminizerConfigHandler = new AdminizerConfigHandler(this.configProcessor)
  /**
   * Register custom middleware on the Adminizer Express app
   */
  @CollectionHandler('adminizerMiddlewares')
  adminizerMiddlewareHandler: AdminizerMiddlewareHandler = new AdminizerMiddlewareHandler(this.adminizer)

  constructor(appManager: AppManager, config?: AdminizerConfig) {
    super(appManager);
    if (config) {
      this.config = config
    }

  }

  private async normalizeSqliteDatetimeColumns(): Promise<void> {
    if (this.appManager.sequelize.getDialect() !== "sqlite") {
      return;
    }

    await this.appManager.sequelize.query(`
      UPDATE navigationap
      SET
        "createdAt" = CASE
          WHEN typeof("createdAt") = 'integer'
          THEN strftime('%Y-%m-%d %H:%M:%f +00:00', "createdAt" / 1000, 'unixepoch')
          ELSE "createdAt"
        END,
        "updatedAt" = CASE
          WHEN typeof("updatedAt") = 'integer'
          THEN strftime('%Y-%m-%d %H:%M:%f +00:00', "updatedAt" / 1000, 'unixepoch')
          ELSE "updatedAt"
        END
      WHERE typeof("createdAt") = 'integer' OR typeof("updatedAt") = 'integer'
    `);
  }

  async mount(): Promise<void> {
    // Register system models but skip sync when using migrations
    await SequelizeAdapter.registerSystemModels(this.appManager.sequelize, process.env.ORM_ALTER !== 'false');
    await this.normalizeSqliteDatetimeColumns();
    // Ensure Adminizer is fully initialized (inertia, routes, etc.) before applying custom logic


    this.adminizer.defaultMiddleware = this.adminizerMiddlewareHandler.getMiddleware()
    await this.adminizer.init(this.config as unknown as AdminizerConfig);

    // Serve custom Inertia modules built by Vite
    this.appManager.app.use(
      `${this.adminizer.config.routePrefix}/modules`,
      serveStatic(path.resolve(process.cwd(), 'dist/modules'))
    );

    // Mount Adminizer strictly under its routePrefix to avoid bleeding middleware (e.g., CSRF) into other routes like /graphql
    const routePrefix = this.adminizer.config.routePrefix || '';
    if (routePrefix) {
      this.appManager.app.use(routePrefix, this.adminizer.getMiddleware());
    } else {
      // Fallback: keep existing behavior but this should not happen in production
      this.appManager.app.use(this.adminizer.getMiddleware());
    }
    // Initialize config processor and apply any model/config collections
    this.configProcessor.init(this.adminizer);
    this.adminizerModelConfigs;
  }

  async unmount(): Promise<void> {
    return Promise.resolve(undefined);
  }
}


class AdminizerConfigHandler {
  configProcessor: ConfigProcessor
  constructor(configProcessor: ConfigProcessor) {
    this.configProcessor = configProcessor
  }
  async process(appManager: AppManager, data: LocalCollectionItem[]): Promise<void> {
    data.forEach((item) => {
      this.configProcessor.updateConfig(item.item);
    })
  }
  async unprocess(appManager: AppManager, data: LocalCollectionItem[]): Promise<void> {
    console.log(data)
  }
}

export type AdminizerModelConfigCollectionItem = LocalCollectionItem & {
  item: AbstractModelConfig
}

class AdminizerModelConfigHandler {
  adminizer: Adminizer
  sequelizeAdapter: SequelizeAdapter
  configProcessor: ConfigProcessor
  constructor(
    adminizer: Adminizer,
    sequelizeAdapter: SequelizeAdapter,
    configProcessor: ConfigProcessor
  ) {
    this.adminizer = adminizer;
    this.sequelizeAdapter = sequelizeAdapter;
    this.configProcessor = configProcessor;
  }
  // init(adminizer: Adminizer, sequelizeAdapter: SequelizeAdapter, configProcessor: ConfigProcessor ) {
  //   this.adminizer = adminizer
  //   this.sequelizeAdapter = sequelizeAdapter
  // }
  async process(appManager: AppManager, data: AdminizerModelConfigCollectionItem[]): Promise<void> {
    data.forEach(async (collectionItem) => {
      let item: AbstractModelConfig = collectionItem.item
      // console.log(item)


      this.configProcessor.updateModelConfig(item);
      const registeredModel = this.sequelizeAdapter.getModel(item.modelname);
      const model = new this.sequelizeAdapter.Model(item.modelname, registeredModel);
      this.adminizer.modelHandler.add(item.modelname, model);
      await this.adminizer.router.bindModelRoutes(item.modelname)
      this.adminizer.accessRightsHelper.registerModelTokens(item.modelname)
      // need add routes for CRUD model
    })
    const config = safeCloneConfig(this.adminizer.config);
    const adminizerAny = this.adminizer as any;
    adminizerAny.config = undefined;
    this.adminizer.config = config
    // Sync menuHelper reference after config object replacement
    if (adminizerAny.menuHelper) {
      adminizerAny.menuHelper.config = this.adminizer.config;
    }

    // this.adminizer.init(config)
  }

  async unprocess(appManager: AppManager, data: AdminizerModelConfigCollectionItem[]): Promise<void> {
    data.forEach(async (collectionItem) => {
      let item: AbstractModelConfig = collectionItem.item
      await this.adminizer.router.unbindModelRoutes(item.modelname)
    });
  }
}
/**
 * Collection handler for registering custom middleware on the Adminizer Express app
 */
class AdminizerMiddlewareHandler {
  private adminizer: Adminizer;
  private middlewares: LocalCollectionItem[] = [];

  constructor(adminizer: Adminizer) {
    this.adminizer = adminizer;
  }

  public getMiddleware() {
    return this.middlewareDispatcher();
  }

  /**
   * Центральный обработчик всех зарегистрированных middleware
   */
  private middlewareDispatcher() {
    return (req: Request, res: Response, next: NextFunction) => {
      // adminizer.app routes are registered with full path (routePrefix + route),
      // so req.path contains the full path e.g. /dashboard/integrations.
      // item.route is the short route e.g. /integrations — prepend routePrefix for comparison.
      const routePrefix = this.adminizer?.config?.routePrefix || '';
      const method = req.method.toLowerCase();
      const stack = this.middlewares
        .map(({ item }) => {
          if (typeof item === 'function') {
            return item;
          }

          if (
            item &&
            typeof item === 'object' &&
            typeof item.handler === 'function'
          ) {
            const fullRoute = item.route ? `${routePrefix}${item.route}` : null;
            const routeMatch = !fullRoute || req.path === fullRoute || req.path.startsWith(fullRoute + '/');
            const methodMatch =
              !item.method ||
              item.method.toLowerCase() === method ||
              item.method.toLowerCase() === 'use';

            if (routeMatch && methodMatch) {
              return item.handler;
            }
          }

          return null;
        })
        .filter(Boolean);

      let index = 0;
      const run = (err?: any) => {
        if (err) return next(err);
        const middleware = stack[index++];
        if (!middleware) return next();
        try {
          middleware(req, res, run); // теперь run — это next
        } catch (e) {
          next(e);
        }
      };

      run();
    };
  }

  /**
   * Добавление middleware из коллекции
   */
  async process(appManager: AppManager, data: LocalCollectionItem[]): Promise<void> {
    this.middlewares.push(...data);

    // Register explicit routes on adminizer.app so Express doesn't 404 them
    const routePrefix = this.adminizer?.config?.routePrefix || '';
    for (const { item } of data) {
      if (item && typeof item === 'object' && typeof item.handler === 'function' && item.route) {
        const fullPath = `${routePrefix}${item.route}`;
        const method: string = item.method?.toLowerCase() ?? 'use';
        if (typeof (this.adminizer.app as any)[method] === 'function') {
          (this.adminizer.app as any)[method](fullPath, (_req: Request, _res: Response, next: NextFunction) => {
            // handled by middlewareDispatcher via defaultMiddleware
            next();
          });
        }
      }
    }
  }

  /**
   * Удаление middleware по id
   */
  async unprocess(appManager: AppManager, data: LocalCollectionItem[]): Promise<void> {
    const appIdsToRemove = data.map(d => d.appId);
    this.middlewares = this.middlewares.filter(mw => !appIdsToRemove.includes(mw.appId));
  }
}
