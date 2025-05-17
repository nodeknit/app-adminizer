import { AppManager, CollectionHandler } from "@nodeknit/app-manager";
import {AbstractApp} from "@nodeknit/app-manager/lib/AbstractApp";
import { AbstractCollectionHandler, CollectionItem } from "@nodeknit/app-manager/lib/CollectionStorage";
import { Adminizer, AdminizerConfig, AdminpanelConfig, SequelizeAdapter } from "adminizer"
import { AbstractModelConfig } from "./abstract/AbstractModelConfig";
import { json } from "sequelize";
// import * as adminpanelConfig from "./adminizerConfig"

class ConfigProcessor {
  adminizer: Adminizer
  defaultConfig: AdminizerConfig = {} as AdminizerConfig

  preRunConfig = {}

  isInitialized = false
  init(adminizer: Adminizer) {
    this.adminizer = adminizer
    this.defaultConfig = JSON.parse(JSON.stringify(adminizer.config));
    this.isInitialized = true
    this.adminizer.config =  {...this.defaultConfig, ...this.preRunConfig}
    // console.log(this.adminizer.config)
  }

  updateModelConfig(config: AbstractModelConfig){
    this.adminizer.config.models[config.modelname] = config.config
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

  @CollectionHandler('adminizerModelConfigs')
  adminizerModelConfigs: AdminizerModelConfigHandler = new AdminizerModelConfigHandler(
    this.adminizer,
    this.sequelizeAdapter,
    this.configProcessor
  );

  @CollectionHandler('adminizerConfigs')
  adminizerConfigHandler: AdminizerConfigHandler = new AdminizerConfigHandler(this.configProcessor)

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
    this.adminizer.init(config)
  }

  async unprocess(appManager: AppManager, data: AdminizerModelConfigCollectionItem[]): Promise<void> {
    console.log(data)
  }
}

