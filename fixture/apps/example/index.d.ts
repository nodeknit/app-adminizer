import { AbstractApp } from "../../../dist/lib/AbstractApp.js";
import { AppManager } from "../../../dist/lib/AppManager.js";
import { ExampleModel } from "./models/ExampleModel.js";
import ExampleController from "./controllers/ExampleController.js";
import { AbstractCollectionHandler } from "../../../dist/lib/CollectionStorage.js";
import { CollectionItem } from "../../../dist/lib/CollectionStorage.js";
import { ExampleSetting } from "./settings/exampleSetting.js";
declare class Resolver {
    name: string;
}
declare class ResolverHandler extends AbstractCollectionHandler {
    process(appManager: AppManager, data: CollectionItem[]): Promise<void>;
    unprocess(appManager: AppManager, data: CollectionItem[]): Promise<void>;
}
/**
 * Developer can decide which fields he needs to be appended to appManager by using decorator
 * */
export default class ExampleApp extends AbstractApp {
    appId: string;
    name: string;
    controllers: {
        route: string;
        controller: typeof ExampleController;
    }[];
    models: (typeof ExampleModel)[];
    settings: (typeof ExampleSetting)[];
    resolvers: (typeof Resolver)[];
    resolverHandler: ResolverHandler;
    constructor(appManager: AppManager);
    mount(): Promise<void>;
    unmount(): Promise<void>;
}
export {};
