import { ISettingSlot } from "../../../../dist/lib/SettingStorage";
export declare class ExampleSetting implements ISettingSlot {
    key: string;
    type: "number";
    name: string;
    description: string;
    tooltip: string;
    isRequired: boolean;
}
