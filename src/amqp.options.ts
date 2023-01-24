import { ModuleMetadata, Type } from '@nestjs/common';
import { Options } from 'amqplib';

export interface AmqpModuleOptions extends Partial<Options.Connect> {
  name?: string;
  retryAttempts?: number;
  retryDelay?: number;
  connectionFactory?: (connection: any, name: string) => any;
  connectionErrorFactory?: (error: Error) => Error;
}

export interface AmqpOptionsFactory {
  createAMQPOptions(): Promise<AmqpModuleOptions> | AmqpModuleOptions;
}

export interface AmqpModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  name?: string;
  useExisting?: Type<AmqpOptionsFactory>;
  useClass?: Type<AmqpOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<AmqpModuleOptions> | AmqpModuleOptions;
  inject?: any[];
}

export interface AmqpOptionsObjectInterface {
  [key: string]: AmqpModuleAsyncOptions;
}
