import { Observable, timer } from 'rxjs';
import { retryWhen, retry, scan, delay } from 'rxjs/operators';
import { Logger } from '@nestjs/common';

export default function handleRetry(
  retryAttempts: number = 3,
  retryDelay: number = 3000,
): <T>(source: Observable<T>) => Observable<T> {
  return <T>(source: Observable<T>) =>
    source.pipe(
      // Instead of `retryWhen(() => notify$)`, use: `retry({ delay: () => notify$ })`.
      retry({
        count: retryAttempts,
        delay: (error: Error, retryCount: number) => {
          Logger.error(`Unable to connect to amqp server. Retrying`, error);
          return timer(1000);
        },
        resetOnSuccess: true,
      }),

      // retryWhen((e) =>
      //   e.pipe(
      //     scan((acc: number, error: Error) => {
      //       Logger.error(
      //         `Unable to connect to amqp server. Retrying`,
      //         error.stack,
      //         'AmqpModule',
      //       );
      //       if (acc + 1 >= retryAttempts) {
      //         throw error;
      //       }
      //       return acc + 1;
      //     }, 0),
      //     delay(retryDelay),
      //   ),
      // ),
    );
}
