export interface Config {
  app: {
    nodeEnv: 'development' | 'test' | 'production';
    port: number;
  };

  infrastructure: {
    postgres: {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    };

    rabbitmq: {
      url: string;
      exchange: string;
    };
  };
}
