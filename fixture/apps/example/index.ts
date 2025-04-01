import {AbstractApp} from "../../../dist/lib/AbstractApp.js";
import {AppManager} from "../../../dist/lib/AppManager.js";
import {Collection, CollectionHandler} from "../../../dist/lib/decorators/appUtils.js";

import {ExampleModel} from "./models/ExampleModel.js";
import ExampleController from "./controllers/ExampleController.js";
import {AbstractCollectionHandler} from "../../../dist/lib/CollectionStorage.js";
import {CollectionItem} from "../../../dist/lib/CollectionStorage.js";
import {ExampleSetting} from "./settings/exampleSetting.js";

class Resolver {
  name: string = "ExampleResolver";
}

class ResolverHandler extends AbstractCollectionHandler {
  async process(appManager: AppManager, data: CollectionItem[]): Promise<void> {
    console.log("ResolverHandler processed")
  }

  async unprocess(appManager: AppManager, data: CollectionItem[]): Promise<void> {
    console.log("ResolverHandler unprocessed")
  }
}

/**
 * Developer can decide which fields he needs to be appended to appManager by using decorator
 * */
export default class ExampleApp extends AbstractApp {
  appId = "example";
  name = "Example";

  @Collection
  controllers = [{route: "/example", controller: ExampleController}];

  @Collection
  models = [ExampleModel];

  @Collection
  settings = [ExampleSetting];

  @Collection
  resolvers = [Resolver];

  @CollectionHandler('resolvers')
  resolverHandler = new ResolverHandler();

  constructor(appManager: AppManager) {
    super(appManager);
  }

  mount(): Promise<void> {
    console.log("Example app mounted")
    return Promise.resolve();
  }

  unmount(): Promise<void> {
    console.log("Example app unmounted")
    return Promise.resolve();
  }
}
