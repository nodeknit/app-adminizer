import { Table, Column, Model, DataType } from 'sequelize-typescript';
import {InferAttributes, InferCreationAttributes} from "sequelize";

@Table({ tableName: 'example_models', timestamps: false })
export class ExampleModel extends Model<InferAttributes<ExampleModel>, InferCreationAttributes<ExampleModel>> {
  @Column(DataType.STRING)
  declare title: string;

  @Column(DataType.STRING)
  declare description: string;
}
