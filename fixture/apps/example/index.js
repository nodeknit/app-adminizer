var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { AbstractApp } from "../../../dist/lib/AbstractApp.js";
import { Collection, CollectionHandler } from "../../../dist/lib/decorators/appUtils.js";
import { ExampleModel } from "./models/ExampleModel.js";
import ExampleController from "./controllers/ExampleController.js";
import { AbstractCollectionHandler } from "../../../dist/lib/CollectionStorage.js";
import { ExampleSetting } from "./settings/exampleSetting.js";
class Resolver {
    name = "ExampleResolver";
}
class ResolverHandler extends AbstractCollectionHandler {
    async process(appManager, data) {
        console.log("ResolverHandler processed");
    }
    async unprocess(appManager, data) {
        console.log("ResolverHandler unprocessed");
    }
}
/**
 * Developer can decide which fields he needs to be appended to appManager by using decorator
 * */
export default class ExampleApp extends AbstractApp {
    appId = "example";
    name = "Example";
    controllers = [{ route: "/example", controller: ExampleController }];
    models = [ExampleModel];
    settings = [ExampleSetting];
    resolvers = [Resolver];
    resolverHandler = new ResolverHandler();
    constructor(appManager) {
        super(appManager);
    }
    mount() {
        console.log("Example app mounted");
        return Promise.resolve();
    }
    unmount() {
        console.log("Example app unmounted");
        return Promise.resolve();
    }
}
__decorate([
    Collection,
    __metadata("design:type", Object)
], ExampleApp.prototype, "controllers", void 0);
__decorate([
    Collection,
    __metadata("design:type", Object)
], ExampleApp.prototype, "models", void 0);
__decorate([
    Collection,
    __metadata("design:type", Object)
], ExampleApp.prototype, "settings", void 0);
__decorate([
    Collection,
    __metadata("design:type", Object)
], ExampleApp.prototype, "resolvers", void 0);
__decorate([
    CollectionHandler('resolvers'),
    __metadata("design:type", Object)
], ExampleApp.prototype, "resolverHandler", void 0);
