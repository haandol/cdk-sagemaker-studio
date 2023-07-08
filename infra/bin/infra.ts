#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SagemakerStudioStack } from '../lib/sagemaker-studio-stack';
import { Config } from '../config/loader';
import { VpcStack } from '../lib/vpc-stack';

const app = new cdk.App({
  context: {
    ns: Config.app.ns,
    stage: Config.app.stage,
  },
});

const vpcStack = new VpcStack(app, `${Config.app.ns}VpcStack`, {
  vpcId: Config.vpc?.id,
  availabilityZones: Config.vpc?.availabilityZones,
  env: {
    region: Config.aws.region,
  },
});

const studioStack = new SagemakerStudioStack(
  app,
  `${Config.app.ns}SagemakerStudioStack`,
  {
    vpc: vpcStack.vpc,
    domainName: Config.sagemaker.domainName,
    env: {
      region: Config.aws.region,
    },
  }
);
studioStack.addDependency(vpcStack);
