import { AppManager, CollectionHandler } from "@nodeknit/app-manager";
import {AbstractApp} from "@nodeknit/app-manager/lib/AbstractApp";
import { AbstractCollectionHandler, CollectionItem } from "@nodeknit/app-manager/lib/CollectionStorage";
import { Adminizer, AdminpanelConfig, SequelizeAdapter } from "adminizer"
// import * as adminpanelConfig from "./adminizerConfig"

class ConfigProcessor {
  adminizer: Adminizer
  defaultConfig: AdminpanelConfig = {}

  preRunConfig = {}

  isInitialized = false
  init(adminizer: Adminizer) {
    this.adminizer = adminizer
    this.defaultConfig = JSON.parse(JSON.stringify(adminizer.config));
    this.isInitialized = true
    this.adminizer.config =  {...this.defaultConfig, ...this.preRunConfig}
  }


  updateConfig(config: AdminpanelConfig){
    if(this.isInitialized) {
      this.adminizer.config  = {...this.defaultConfig, ...config}
    } else {
      this.preRunConfig = {...this.defaultConfig, ...config}
    }
  }
}


export class AppAdminizer extends AbstractApp {
  appId: string;
  name: string;

  configProcessor = new ConfigProcessor()
  sequelizeAdapter = new SequelizeAdapter(this.appManager.sequelize)
  adminizer = new Adminizer([this.sequelizeAdapter]);


  @CollectionHandler('adminizerConfigs')
  adminizerConfigHandler: AdminizerConfigHandler = new AdminizerConfigHandler(this.configProcessor)

  constructor(appManager: AppManager) {
    super(appManager);
   }

  async mount(): Promise<void> {
    const routePrefix = '/adminizer';
    await SequelizeAdapter.registerSystemModels(this.appManager.sequelize)
    this.adminizer.init({} as unknown as AdminpanelConfig)

    const adminizerHandler = this.adminizer.getMiddleware();

    this.appManager.app.use('/', this.adminizer.app);
    this.configProcessor.init(this.adminizer)


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
    console.log(22244,data)
    data.forEach((item)=>{
      this.configProcessor.updateConfig(item.item);
    })
  }
  async unprocess(appManager: AppManager, data: CollectionItem[]): Promise<void> {
    console.log(data)
  }
}