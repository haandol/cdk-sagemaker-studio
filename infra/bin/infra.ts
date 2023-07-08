#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SagemakerStudioStack } from '../lib/sagemaker-studio-stack';
import { Config } from '../config/loader';

const app = new cdk.App({
  context: {
    ns: Config.app.ns,
    stage: Config.app.stage,
  },
});

new SagemakerStudioStack(app, `${Config.app.ns}SagemakerStudioStack`, {
  vpcId: Config.vpc.id,
  subnetIds: Config.vpc.subnetIds,
  availabilityZones: Config.vpc.availabilityZones,
  domainName: Config.sagemaker.domainName,
});
