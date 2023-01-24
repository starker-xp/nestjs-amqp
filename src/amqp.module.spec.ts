import { Test, TestingModule } from '@nestjs/testing';
import { AmqpModule } from './index';
import { createConnectionToken } from './utils/create.tokens';
import { Module } from '@nestjs/common';
const ChannelModel = require('amqplib/lib/channel_model').ChannelModel;
// import { ConfigModule, ConfigService } from 'nestjs-config';
import { ConfigModule, ConfigService } from '@nestjs/config';

import * as path from 'path';
import { InjectAmqpConnection } from './decorators';

describe('AmqpModule', () => {
  it('Instace Amqp', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AmqpModule.forRoot({
          name: 'instance',
          hostname: '127.0.0.1',
          retryAttempts: 1,
        }),
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.init();

    const amqpModule = module.get(AmqpModule);

    expect(amqpModule).toBeInstanceOf(AmqpModule);

    await app.close();
  });

  it('Instace Amqp Connection provider', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AmqpModule.forRoot({
          name: 'first',
          hostname: '127.0.0.1',
          retryAttempts: 1,
        }),
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.init();

    const amqpConnection = module.get(createConnectionToken('first'));

    expect(amqpConnection).toBeInstanceOf(ChannelModel);
    await app.close();
  });

  /*xit('Multiple connection options', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AmqpModule.forRoot([
          {
            hostname: '127.0.0.1',
            name: 'test',
            retryAttempts: 1,
          },
          {
            hostname: '127.0.0.1',
            retryAttempts: 1,
          },
        ]),
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.init();

    const amqpConnectionTest = module.get(createConnectionToken('test'));
    const amqpConnection1 = module.get(createConnectionToken('1'));

    expect(amqpConnectionTest).toBeInstanceOf(ChannelModel);
    expect(amqpConnection1).toBeInstanceOf(ChannelModel);
    await app.close();
  });*/

  it('Connection options', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AmqpModule.forRoot({
          name: 'test2',
          hostname: '127.0.0.1',
          port: 5673,
          username: 'user',
          password: 'pass',
          retryAttempts: 1,
        }),
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.init();

    const amqpConnectionTest = module.get(createConnectionToken('test2'));

    expect(amqpConnectionTest).toBeInstanceOf(ChannelModel);
    await app.close();
  });

  it('Connections should build with AmqpAsyncOptionsInterface', async () => {
    class TestProvider {
      constructor(@InjectAmqpConnection('default') private readonly amqp) {}

      getAmqp() {
        return this.amqp;
      }
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [ 
            () =>  ({
              name: 'default',
              hostname: '127.0.0.1',
              port: 5672,
            })
          ]
        }),
        AmqpModule.forRootAsync({
          name: 'default',
          useFactory: async (config) => {
            let r = await config.get('default');
            console.log(r);
            return await config.get('amqp')
          },
          inject: [ConfigService],
        }),
      ],
      providers: [TestProvider],
    }).compile();

    const app = module.createNestApplication();
    await app.init();

    const provider = module.get(TestProvider);

    expect(provider.getAmqp()).toBeInstanceOf(ChannelModel);
    await app.close();
  });

  it('Connection available in submodule', async () => {
    @Module({
      imports: [
        
        AmqpModule.forFeature({
          name: 'default',
          hostname: '127.0.0.1',
          retryAttempts: 1,
        }),
      ],
    })
    class SubModule {}

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AmqpModule.forRoot({
          name: 'default',
          hostname: '127.0.0.1',
          retryAttempts: 1,
          retryDelay: 1000,
        }),
         SubModule,
      ],
    }).compile();

    const app = module.createNestApplication();
    await app.init();

    const amqpConnection = module.get(createConnectionToken('default'));
    expect(amqpConnection).toBeInstanceOf(ChannelModel);

    // const provider = module
    //   .select<SubModule>(SubModule)
    //   .get(createConnectionToken('subModule'));

    // expect(provider).toBeInstanceOf(ChannelModel);
    await app.close();
  });
});
