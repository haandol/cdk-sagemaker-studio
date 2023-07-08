import * as path from 'path';
import * as joi from 'joi';
import * as toml from 'toml';
import * as fs from 'fs';

interface IConfig {
  app: {
    ns: string;
    stage: string;
  };
  vpc: {
    id: string;
    subnetIds: string[];
    availabilityZones: string[];
  };
  sagemaker: {
    domainName: string;
  };
}

const cfg = toml.parse(
  fs.readFileSync(path.resolve(__dirname, '..', '.toml'), 'utf-8')
);
console.log('loaded config', cfg);

const schema = joi
  .object({
    app: joi.object({
      ns: joi.string().required(),
      stage: joi.string().required(),
    }),
    vpc: joi.object({
      id: joi.string().required(),
      subnetIds: joi.array().items(joi.string()).required(),
      availabilityZones: joi.array().items(joi.string()).required(),
    }),
    sagemaker: joi.object({
      domainName: joi.string().required(),
    }),
  })
  .unknown();

const { error } = schema.validate(cfg);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const Config: IConfig = {
  ...cfg,
  app: {
    ...cfg.app,
    ns: `${cfg.app.ns}${cfg.app.stage}`,
  },
};
