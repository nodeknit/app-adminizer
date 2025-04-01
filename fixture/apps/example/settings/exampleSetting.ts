import {ISettingSlot} from "../../../../dist/lib/SettingStorage";

export class ExampleSetting implements ISettingSlot {
  key = "example-setting"
  type: "number" = "number"
  name = "Example Setting"
  description = "This is an example setting"
  tooltip = "Only number"
  isRequired = true
}
