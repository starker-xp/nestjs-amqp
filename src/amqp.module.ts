import { Module, DynamicModule, Provider } from '@nestjs/common';
import { AmqpModuleOptions, AmqpModuleAsyncOptions } from './amqp.options';
import { createConnectionToken } from './utils/create.tokens';
import { catchError, defer, lastValueFrom } from 'rxjs';
import * as amqp from 'amqplib';
import handleRetry from './utils/retry';
import { AMQP_MODULE_OPTIONS } from './amqp.constants';
import { AmqpCoreModule } from './amqp-core.module';

@Module({})
export class AmqpModule {

  static forRoot(
    options: AmqpModuleOptions /*| AmqpModuleOptions[],*/,
  ): DynamicModule {
    return {
      module: AmqpModule,
      imports: [AmqpCoreModule.forRoot(options)],
    };
  }

  static forRootAsync(options: AmqpModuleAsyncOptions): DynamicModule {
    return {
      module: AmqpModule,
      imports: [AmqpCoreModule.forRootAsync(options)],
    };
  }

  private static createAmqpProvider(options: AmqpModuleOptions): Provider {
    const {
      name,
      retryAttempts,
      retryDelay,
      connectionFactory,
      connectionErrorFactory,
      ...amqpOptions
    } = options;

    const amqpConnectionName = createConnectionToken(name);

    const amqpConnectionFactory =
      connectionFactory || ((connection, name) => connection);

    const amqpConnectionError = connectionErrorFactory || ((error) => error);

    return {
      provide: createConnectionToken(options.name),
      //TODO resolve host url: do I need to? Seems to work aready? Just verify

      useFactory: async (config: AmqpModuleOptions): Promise<any> =>
        await lastValueFrom(
          defer(async () =>
            amqpConnectionFactory(
              await amqp.connect(config.name),
              amqpConnectionName,
            ),
          ).pipe(
            handleRetry(retryAttempts, retryDelay),
            catchError((error) => {
              throw amqpConnectionError(error);
            }),
          ),
        ),
      inject: [AMQP_MODULE_OPTIONS],
    };
  }

  public static forFeature(
    options: AmqpModuleOptions /*| AmqpModuleOptions[]*/,
  ): DynamicModule {
    const provider = this.createAmqpProvider(options);
    return {
      module: AmqpModule,
      providers: [provider],
      exports: [provider],
    };
  }
}
