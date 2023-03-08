#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SagemakerStudioStack } from '../lib/sagemaker-studio-stack';
import { Config } from '../config/loader';

const app = new cdk.App({
  context: {
    ns: Config.ns,
    stage: Config.stage,
  },
});

new SagemakerStudioStack(app, `${Config.ns}SagemakerStudioStack`, {
  vpcId: Config.vpc.id,
  subnetIds: Config.vpc.subnetIds,
  domainName: Config.sagemaker.domainName,
});
