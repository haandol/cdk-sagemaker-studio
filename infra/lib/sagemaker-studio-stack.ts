import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sm from 'aws-cdk-lib/aws-sagemaker';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface IProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
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
    // For CodeWhisperer
    executionRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['codewhisperer:GenerateRecommendations'],
        resources: ['*'],
      })
    );

    // TODO: change removal policy for production
    const bucket = new s3.Bucket(this, 'Bucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    bucket.grantReadWrite(executionRole);

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
      subnetIds: props.vpc.privateSubnets.map((subnet) => subnet.subnetId),
      vpcId: props.vpc.vpcId,
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

    this.createVpcEndpoints(props);
  }

  private createVpcEndpoints(props: IProps) {
    const securityGroup = new ec2.SecurityGroup(this, 'VpceSecurityGroup', {
      vpc: props.vpc,
    });
    securityGroup.connections.allowInternally(
      ec2.Port.tcp(443),
      'internal SDK'
    );
    securityGroup.connections.allowInternally(
      ec2.Port.tcp(2049),
      'internal NFS'
    );
    securityGroup.connections.allowInternally(
      ec2.Port.tcpRange(8192, 65535),
      'internal KernelGateway'
    );

    new ec2.InterfaceVpcEndpoint(this, 'StudioVpcEndpoint', {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SAGEMAKER_STUDIO,
      subnets: {
        subnets: props.vpc.privateSubnets,
      },
      securityGroups: [securityGroup],
      privateDnsEnabled: true,
    });

    new ec2.InterfaceVpcEndpoint(this, 'SagemakerAPIVpcEndpoint', {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SAGEMAKER_API,
      subnets: {
        subnets: props.vpc.privateSubnets,
      },
      securityGroups: [securityGroup],
      privateDnsEnabled: true,
    });

    new ec2.InterfaceVpcEndpoint(this, 'SagemakerRuntimeVpcEndpoint', {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SAGEMAKER_RUNTIME,
      subnets: {
        subnets: props.vpc.privateSubnets,
      },
      securityGroups: [securityGroup],
      privateDnsEnabled: true,
    });

    new ec2.GatewayVpcEndpoint(this, 'S3VpcEndpoint', {
      vpc: props.vpc,
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [
        {
          subnets: props.vpc.privateSubnets,
        },
      ],
    });

    new ec2.InterfaceVpcEndpoint(this, 'ServiceCatalogVpcEndpoint', {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SERVICE_CATALOG,
      subnets: {
        subnets: props.vpc.privateSubnets,
      },
      securityGroups: [securityGroup],
      privateDnsEnabled: true,
    });

    new ec2.InterfaceVpcEndpoint(this, 'StsVpcEndpoint', {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.STS,
      subnets: {
        subnets: props.vpc.privateSubnets,
      },
      securityGroups: [securityGroup],
      privateDnsEnabled: true,
    });

    new ec2.InterfaceVpcEndpoint(this, 'CloudwatchVpcEndpoint', {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: {
        subnets: props.vpc.privateSubnets,
      },
      securityGroups: [securityGroup],
      privateDnsEnabled: true,
    });
  }
}
