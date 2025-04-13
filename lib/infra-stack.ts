import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { readFileSync } from 'fs';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC with both public and private subnets and NAT Gateway
    const vpc = new ec2.Vpc(this, 'MyVpc', {
      natGateways: 1,
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'public-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24
        },
        {
          name: 'private-subnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24
        }
      ]
    });

    // Create Security Group for EC2
    const sg = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: 'Allow all outbound traffic',
    });

    // IAM role for EC2 to access SSM
    const role = new iam.Role(this, 'EC2SSMRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
      ]
    });

    // Read userdata from local file
    const userData = readFileSync('C:/Users/swaroop.kori/ec2/infra/lib/userdata.sh', 'utf8');

    // Create EC2 instance in private subnet
    const ec2Instance = new ec2.Instance(this, 'MyPrivateEC2', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: sg,
      role: role,
    });

    ec2Instance.addUserData(userData);

    // Add SSM Association to run a document (optional but included for your request)
    new ssm.CfnAssociation(this, 'SSMAssociation', {
      name: 'AWS-RunShellScript',
      instanceId: ec2Instance.instanceId,
      parameters: {
        commands: ['echo "Hello from SSM Association!" > /tmp/ssm-test-output.txt']
      }
    });
  }
}


