import { ModelConfig } from "adminizer";

export interface AbstractModelConfig {
    /** It means model in ORM name eg. UserDevice instead userdevice */
    modelname: string
    config: ModelConfig
}