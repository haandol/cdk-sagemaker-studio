import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sm from 'aws-cdk-lib/aws-sagemaker';

interface IProps extends cdk.StackProps {
  readonly vpcId: string;
  readonly subnetIds: string[];
  readonly domainName: string;
}

export class SagemakerStudioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id, props);

    const executionRole = new iam.Role(this, 'SageMakerExecutionRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonSageMakerCanvasFullAccess'
        ),
      ],
    });

    const domain = new sm.CfnDomain(this, 'SageMakerDomain', {
      authMode: 'IAM',
      defaultUserSettings: {
        executionRole: executionRole.roleArn,
        jupyterServerAppSettings: {
          defaultResourceSpec: {
            instanceType: 'system',
          },
        },
      },
      domainName: props.domainName,
      subnetIds: props.subnetIds,
      vpcId: props.vpcId,
      appNetworkAccessType: 'PublicInternetOnly',
    });

    const userProfile = new sm.CfnUserProfile(this, 'SageMakerUserProfile', {
      domainId: domain.attrDomainId,
      userProfileName: 'default',
      userSettings: {
        executionRole: executionRole.roleArn,
      },
    });

    const notebookApp = new sm.CfnApp(this, 'JupyterServerApp', {
      appName: 'notebook',
      appType: 'JupyterServer',
      domainId: domain.attrDomainId,
      userProfileName: userProfile.userProfileName,
      resourceSpec: {
        instanceType: 'system',
      },
    });
  }
}
