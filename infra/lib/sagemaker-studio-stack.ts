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
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonSageMakerCanvasAIServicesAccess'
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonRekognitionReadOnlyAccess'
        ),
      ],
    });
    executionRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:ListBucket',
        ],
        resources: ['arn:aws:s3:::*'],
      })
    );
    // For CodeWhisperer
    executionRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['codewhisperer:GenerateRecommendations'],
        resources: ['*'],
      })
    );

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
      appNetworkAccessType: 'VpcOnly',
    });

    const userProfile = new sm.CfnUserProfile(this, 'SageMakerUserProfile', {
      domainId: domain.attrDomainId,
      userProfileName: 'default',
      userSettings: {
        executionRole: executionRole.roleArn,
      },
    });
    userProfile.addDependency(domain);

    const app = new sm.CfnApp(this, 'DefaultJupyterServerApp', {
      appName: 'default',
      appType: 'JupyterServer',
      domainId: domain.attrDomainId,
      userProfileName: userProfile.userProfileName,
      resourceSpec: {
        instanceType: 'system',
      },
    });
    app.addDependency(userProfile);
  }
}
