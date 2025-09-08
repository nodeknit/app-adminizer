import { AppManager, CollectionHandler, AbstractApp, AbstractCollectionHandler, CollectionItem } from "@nodeknit/app-manager";
import { Adminizer, AdminizerConfig, AdminpanelConfig, SequelizeAdapter } from "adminizer"
import path from 'path';
import serveStatic from 'serve-static';
import { Request, Response, NextFunction } from 'express';
import { AbstractModelConfig } from "./abstract/AbstractModelConfig";
import { json } from "sequelize";
// import * as adminpanelConfig from "./adminizerConfig"

class ConfigProcessor {
  adminizer: Adminizer
  appDefaultConfig!: AdminizerConfig

  preRunConfig = {}

  isInitialized = false
  init(adminizer: Adminizer) {
    this.adminizer = adminizer
    this.appDefaultConfig = JSON.parse(JSON.stringify(adminizer.config));
    this.isInitialized = true
    this.adminizer.config =  {...this.adminizer.defaultConfig, ...this.appDefaultConfig,  ...this.preRunConfig}
    // console.log(this.adminizer.config)
  }

  updateModelConfig(config: AbstractModelConfig){
    this.adminizer.config.models[config.modelname.toLowerCase()] = config.config
  }

  updateConfig(config: AdminpanelConfig){
    console.log(this.isInitialized, "this.isInitialized")

    if(this.isInitialized) {
      this.adminizer.config  = {...this.appDefaultConfig, ...config}
      console.log(this.adminizer.config, "preRunConfig", config)

    } else {
      this.preRunConfig = {...this.appDefaultConfig, ...config}
    }
  }
}


export class AppAdminizer extends AbstractApp {
  appId: string;
  name: string;
  public config: AdminizerConfig = {} as AdminizerConfig
  configProcessor = new ConfigProcessor()
  sequelizeAdapter = new SequelizeAdapter(this.appManager.sequelize)
  adminizer = new Adminizer([this.sequelizeAdapter]);
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
    if(config) {
      this.config = config
    }

   }

  async mount(): Promise<void> {
    await SequelizeAdapter.registerSystemModels(this.appManager.sequelize);
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


class AdminizerConfigHandler extends AbstractCollectionHandler {
  configProcessor: ConfigProcessor 
  constructor(configProcessor: ConfigProcessor ) {
    super();
    this.configProcessor = configProcessor
  }
  async process(appManager: AppManager, data: CollectionItem[]): Promise<void> {
    data.forEach((item)=>{
      this.configProcessor.updateConfig(item.item);
    })
  }
  async unprocess(appManager: AppManager, data: CollectionItem[]): Promise<void> {
    console.log(data)
  }
}

export type AdminizerModelConfigCollectionItem = CollectionItem & {
  item: AbstractModelConfig
}

class AdminizerModelConfigHandler extends AbstractCollectionHandler {
  adminizer: Adminizer 
  sequelizeAdapter: SequelizeAdapter
  configProcessor: ConfigProcessor 
  constructor(
    adminizer: Adminizer,
    sequelizeAdapter: SequelizeAdapter,
    configProcessor: ConfigProcessor
  ) {
    super();
    this.adminizer = adminizer;
    this.sequelizeAdapter = sequelizeAdapter;
    this.configProcessor = configProcessor;
  }
  // init(adminizer: Adminizer, sequelizeAdapter: SequelizeAdapter, configProcessor: ConfigProcessor ) {
  //   this.adminizer = adminizer
  //   this.sequelizeAdapter = sequelizeAdapter
  // }
  async process(appManager: AppManager, data: AdminizerModelConfigCollectionItem[]): Promise<void> {
    data.forEach((collectionItem)=>{
      let item: AbstractModelConfig = collectionItem.item
      // console.log(item)


      this.configProcessor.updateModelConfig(item);
      // const registeredModel = this.sequelizeAdapter.getModel(item.modelname);
      // const model = new this.sequelizeAdapter.Model(item.modelname, registeredModel);
      // this.adminizer.modelHandler.add(item.modelname, model);
    }) 
    let config = JSON.parse(JSON.stringify(this.adminizer.config))
    delete this.adminizer.config
    this.adminizer.config = config
    // this.adminizer.init(config)
  }

    async unprocess(appManager: AppManager, data: AdminizerModelConfigCollectionItem[]): Promise<void> {
      console.log(data)
    }
  }
  /**
   * Collection handler for registering custom middleware on the Adminizer Express app
   */
class AdminizerMiddlewareHandler extends AbstractCollectionHandler {
  private adminizer: Adminizer;
  private middlewares: CollectionItem[] = [];

  constructor(adminizer: Adminizer) {
    super();
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
      // Ensure adminizer middlewares run only for requests under routePrefix
      const routePrefix = this.adminizer?.config?.routePrefix || '';
      if (routePrefix && !req.path.startsWith(routePrefix)) {
        return next();
      }
      const method = req.method.toLowerCase();
      console.log(this.middlewares)
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
            const routeMatch = !item.route || req.path.startsWith(item.route);
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
  async process(appManager: AppManager, data: CollectionItem[]): Promise<void> {
    this.middlewares.push(...data);
  }

  /**
   * Удаление middleware по id
   */
  async unprocess(appManager: AppManager, data: CollectionItem[]): Promise<void> {
    const appIdsToRemove = data.map(d => d.appId);
    this.middlewares = this.middlewares.filter(mw => !appIdsToRemove.includes(mw.appId));
  }
}
