import { AMQP_CONNECTION_NAME } from '../amqp.constants';

export const createConnectionToken = (name: string): string => {
  const result = `${AMQP_CONNECTION_NAME}_${name}`;
  return result;
};
