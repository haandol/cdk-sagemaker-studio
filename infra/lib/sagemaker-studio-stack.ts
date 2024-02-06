import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sm from 'aws-cdk-lib/aws-sagemaker';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface IProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly domainName: string;
}

export class SagemakerStudioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id, props);

    const securityGroup = this.newSecurityGroup(props.vpc);
    const executionRole = this.newExecutionRole();

    const domain = new sm.CfnDomain(this, 'SageMakerDomain', {
      authMode: 'IAM',
      defaultUserSettings: {
        executionRole: executionRole.roleArn,
        spaceStorageSettings: {
          defaultEbsStorageSettings: {
            defaultEbsVolumeSizeInGb: 5,
            maximumEbsVolumeSizeInGb: 1024,
          },
        },
        securityGroups: [securityGroup.securityGroupId],
      },
      defaultSpaceSettings: {
        executionRole: executionRole.roleArn,
        kernelGatewayAppSettings: {
          defaultResourceSpec: {
            instanceType: 'ml.g5.2xlarge',
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
        spaceStorageSettings: {
          defaultEbsStorageSettings: {
            defaultEbsVolumeSizeInGb: 5,
            maximumEbsVolumeSizeInGb: 2048,
          },
        },
      },
    });
    userProfile.addDependency(domain);

    this.createVpcEndpoints(props.vpc, securityGroup);
  }

  private newSecurityGroup(vpc: ec2.IVpc): ec2.ISecurityGroup {
    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', { vpc });
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
    return securityGroup;
  }

  // https://docs.aws.amazon.com/sagemaker/latest/dg/studio-notebooks-and-internet-access.html
  private createVpcEndpoints(
    vpc: ec2.IVpc,
    securityGroup: ec2.ISecurityGroup
  ): void {
    new ec2.InterfaceVpcEndpoint(this, 'StudioVpcEndpoint', {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SAGEMAKER_STUDIO,
      securityGroups: [securityGroup],
      privateDnsEnabled: true,
    });

    new ec2.InterfaceVpcEndpoint(this, 'SagemakerAPIVpcEndpoint', {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SAGEMAKER_API,
      securityGroups: [securityGroup],
      privateDnsEnabled: true,
    });

    new ec2.InterfaceVpcEndpoint(this, 'SagemakerRuntimeVpcEndpoint', {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SAGEMAKER_RUNTIME,
      securityGroups: [securityGroup],
      privateDnsEnabled: true,
    });

    new ec2.GatewayVpcEndpoint(this, 'S3VpcEndpoint', {
      vpc,
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [
        {
          subnets: vpc.privateSubnets,
        },
      ],
    });

    new ec2.InterfaceVpcEndpoint(this, 'ServiceCatalogVpcEndpoint', {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SERVICE_CATALOG,
      securityGroups: [securityGroup],
      privateDnsEnabled: true,
    });

    new ec2.InterfaceVpcEndpoint(this, 'StsVpcEndpoint', {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.STS,
      securityGroups: [securityGroup],
      privateDnsEnabled: true,
    });

    new ec2.InterfaceVpcEndpoint(this, 'CloudwatchVpcEndpoint', {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      securityGroups: [securityGroup],
      privateDnsEnabled: true,
    });

    // Rekognition
    new ec2.InterfaceVpcEndpoint(this, 'RekognitionVpcEndpoint', {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.REKOGNITION,
      securityGroups: [securityGroup],
      privateDnsEnabled: true,
    });
  }

  private newExecutionRole() {
    const role = new iam.Role(this, 'SageMakerExecutionRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonSageMakerCanvasFullAccess'
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonSageMakerCanvasAIServicesAccess'
        ),
        // For ECR
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonEC2ContainerRegistryFullAccess'
        ),
        // For Codecommit
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodeCommitPowerUser'),
        // For Rekognition
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonRekognitionReadOnlyAccess'
        ),
        // For S3
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
      ],
    });
    // For CodeWhisperer
    role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['codewhisperer:GenerateRecommendations'],
        resources: ['*'],
      })
    );
    return role;
  }
}
