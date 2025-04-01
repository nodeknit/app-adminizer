import { Model } from 'sequelize-typescript';
import { InferAttributes, InferCreationAttributes } from "sequelize";
export declare class ExampleModel extends Model<InferAttributes<ExampleModel>, InferCreationAttributes<ExampleModel>> {
    title: string;
    description: string;
}
