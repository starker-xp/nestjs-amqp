import {
  DynamicModule,
  Global,
  Inject,
  Module,
  OnApplicationShutdown,
  Provider,
  Type,
} from '@nestjs/common';
import { AmqpModuleOptions, AmqpModuleAsyncOptions } from './amqp.options';
import { createConnectionToken } from './utils/create.tokens';
import * as amqp from 'amqplib';
import handleRetry from './utils/retry';
import { defer, lastValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AMQP_CONNECTION_NAME, AMQP_MODULE_OPTIONS } from './amqp.constants';
import { ModuleRef } from '@nestjs/core';
import { AmqpOptionsFactory } from './amqp.options';

@Global()
@Module({})
export class AmqpCoreModule implements OnApplicationShutdown {
  constructor(
    @Inject(AMQP_MODULE_OPTIONS) private readonly connectionName: string,
    private readonly moduleRef: ModuleRef,
  ) {}

  public static forRoot(options: AmqpModuleOptions = {}): DynamicModule {
    const {
      name,
      retryAttempts,
      retryDelay,
      connectionFactory,
      connectionErrorFactory,
      ...amqpOptions
    } = options;

    const amqpConnectionFactory =
      connectionFactory || ((connection, name) => connection);

    const amqpConnectionError = connectionErrorFactory || ((error) => error);

    const amqpConnectionName = createConnectionToken(name);
    const amqpConnectionNameProvider = {
      provide: AMQP_CONNECTION_NAME,
      useValue: amqpConnectionName,
    };

    const connectionProvider = {
      provide: amqpConnectionName,
      useFactory: async (): Promise<any> =>
        await lastValueFrom(
          defer(async () =>
            amqpConnectionFactory(
              await amqp.connect(amqpOptions),
              amqpConnectionName,
            ),
          ).pipe(
            handleRetry(retryAttempts, retryDelay),
            catchError((error) => {
              throw amqpConnectionError(error);
            }),
          ),
        ),
    };

    return {
      module: AmqpCoreModule,
      providers: [connectionProvider, amqpConnectionNameProvider],
      exports: [connectionProvider],
    };
  }

  public static forRootAsync(options: AmqpModuleAsyncOptions): DynamicModule {

    const amqpConnectionName = createConnectionToken(options.name);
    const amqpConnectionNameProvider = {
      provide: AMQP_CONNECTION_NAME,
      useValue: amqpConnectionName,
    };

    const connectionProvider = {
      provide: amqpConnectionName,
      useFactory: async (moduleOptions: AmqpModuleOptions): Promise<any> => {
        const {
          // name,
          // retryAttempts,
          // retryDelay,
          // connectionFactory,
          // connectionErrorFactory,
          ...amqpOptions
        } = moduleOptions;

        const name = 'default';
        const retryAttempts = 3;
        const retryDelay = 1000;

        const amqpConnectionFactory =  ((connection, name) => connection);

        const amqpConnectionError =  ((error) => error);

        return await lastValueFrom(
          defer(async () =>
            amqpConnectionFactory(
              await amqp.connect(amqpOptions),
              amqpConnectionName,
            ),
          ).pipe(
            handleRetry(retryAttempts, retryDelay),
            catchError((error) => {
              throw amqpConnectionError(error);
            }),
          ),
        );
      },
      inject: [AMQP_MODULE_OPTIONS],
    };

    const asyncProviders = this.createAsyncProviders(options);
    return {
      module: AmqpCoreModule,
      imports: options.imports,
      providers: [
        ...asyncProviders,
        connectionProvider,
        amqpConnectionNameProvider,
      ],
      exports: [connectionProvider],
    };
  }

  private static createAsyncProviders(
    options: AmqpModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<AmqpOptionsFactory>;
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: AmqpModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: AMQP_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    // `as Type<AmqpOptionsFactory>` is a workaround for microsoft/TypeScript#31603
    const inject = [
      (options.useClass || options.useExisting) as Type<AmqpOptionsFactory>,
    ];
    return {
      provide: AMQP_MODULE_OPTIONS,
      useFactory: async (optionsFactory: AmqpOptionsFactory) =>
        await optionsFactory.createAMQPOptions(),
      inject,
    };
  }

  async onApplicationShutdown() {
    const connection = this.moduleRef.get<amqp.Channel>(this.connectionName);
    connection && (await connection.close());
  }
}
