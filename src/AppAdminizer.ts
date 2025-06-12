import { AppManager, CollectionHandler } from "@nodeknit/app-manager";
import {AbstractApp} from "@nodeknit/app-manager/lib/AbstractApp";
import { AbstractCollectionHandler, CollectionItem } from "@nodeknit/app-manager/lib/CollectionStorage";
import { Adminizer, AdminizerConfig, AdminpanelConfig, SequelizeAdapter } from "adminizer"
import path from 'path';
import serveStatic from 'serve-static';
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
      this.adminizer.config  = {...this.defaultConfig, ...config}
      console.log(this.adminizer.config, "preRunConfig", config)

    } else {
      this.preRunConfig = {...this.defaultConfig, ...config}
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
    const routePrefix = '/adminizer';
    await SequelizeAdapter.registerSystemModels(this.appManager.sequelize)
    this.adminizer.init(this.config as unknown as AdminizerConfig)

    const adminizerHandler = this.adminizer.getMiddleware();

    this.appManager.app.use('/', this.adminizer.app);
    // Serve custom Inertia modules built by Vite
    this.adminizer.app.use(
      `${this.adminizer.config.routePrefix}/modules`,
      serveStatic(path.resolve(process.cwd(), 'dist/modules'))
    );
    this.configProcessor.init(this.adminizer)
    this.adminizerModelConfigs

    // this.appManager.app.use(routePrefix, (req: { url: string; }, res: any) => {
    //   // Удаляем префикс из пути
    //   console.log(req.url, "1")
    //   req.url = req.url = routePrefix;
    //   console.log(req.url, "2")
      
    //   return adminizerHandler(req, res);
    // });
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
    private adminizer: Adminizer
    constructor(adminizer: Adminizer) {
      super()
      this.adminizer = adminizer
    }
    async process(appManager: AppManager, data: CollectionItem[]): Promise<void> {
      const prefix = this.adminizer.config.routePrefix || '';
      const router = (this.adminizer.app as any)._router;
      if (!router || !Array.isArray(router.stack)) {
        // Unable to retrieve router stack; fallback to simple registration
        data.forEach(({ item }) => {
          if (typeof item === 'function') {
            this.adminizer.app.use(item as any);
          } else if (item && typeof item === 'object' && 'route' in item && typeof (item as any).handler === 'function') {
            const mw = item as { route: string; handler: any; method?: string };
            const path = `${prefix}${mw.route}`;
            const method = (mw.method || 'use').toLowerCase();
            if (method === 'use') this.adminizer.app.use(path, mw.handler);
            else if (['all','get','post','put','delete','patch','options','head'].includes(method)) (this.adminizer.app as any)[method](path, mw.handler);
          }
        });
        return;
      }
      // For each middleware, register and move its layer before existing routes
      data.forEach(({ item }) => {
        if (typeof item === 'function') {
          // Global middleware without path
          this.adminizer.app.use(item as any);
          return;
        }
        if (!item || typeof item !== 'object' || !('route' in item) || typeof (item as any).handler !== 'function') {
          return;
        }
        const mw = item as { route: string; handler: any; method?: string };
        const fullPath = `${prefix}${mw.route}`;
        const method = (mw.method || 'use').toLowerCase();
        // Record original stack length
        const stack = router.stack;
        const origLen = stack.length;
        // Register middleware
        if (method === 'use') {
          this.adminizer.app.use(fullPath, mw.handler);
        } else if (['all','get','post','put','delete','patch','options','head'].includes(method)) {
          (this.adminizer.app as any)[method](fullPath, mw.handler);
        } else {
          this.adminizer.app.use(fullPath, mw.handler);
        }
        // Extract newly added layers
        const newLayers = stack.splice(origLen, stack.length - origLen);
        // Find first index of a layer with route defined
        const insertIdx = stack.findIndex((layer: any) => layer.route);
        const idx = insertIdx >= 0 ? insertIdx : stack.length;
        // Insert new layers before existing routes
        stack.splice(idx, 0, ...newLayers);
      });
    }
    async unprocess(appManager: AppManager, data: CollectionItem[]): Promise<void> {
      // No unmounting of middleware currently supported
    }
  }
