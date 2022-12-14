---
title: Transit Gateway Demo
description:
author: haimtran
publishedDate: 25/10/2022
date: 25-10-2022
---

## Introduction

[GitHub](https://github.com/cdk-entest/transit-gateway-demo) shows how to

- Inter-connect multiple VPC using TGW
- Inter-region peering VPC using TGW
- TGW table associationn and progpogation
- TGW table static routes

## Architecture

![aws_devops-Expriment drawio(1)](https://user-images.githubusercontent.com/20411077/174024131-7f08741d-0c6a-4ed8-86b1-4e7b4af69002.png)

# Transit Gateway Peering

This demo follows the below references:

- [AWS Example - AWS TGW Inter-Region Peering](https://github.com/aws-samples/aws-cdk-transit-gateway-peering)
- [AWS Networking Workshop](https://networking.workshop.aws/beginner/lab1/030_tgw/_index_en.html)

Customers

- [TREND MICRO](https://aws.amazon.com/transit-gateway/customers/)

When to use/use cases?

- [A central hub which connects many VPCs](https://aws.amazon.com/transit-gateway/?whats-new-cards.sort-by=item.additionalFields.postDateTime&whats-new-cards.sort-order=desc)
- [Inter-region peering](https://aws.amazon.com/transit-gateway/?whats-new-cards.sort-by=item.additionalFields.postDateTime&whats-new-cards.sort-order=desc)
- VPN - Customer Gateway
- [Direct Connect - Direct Connect GW - TGW](https://docs.aws.amazon.com/whitepapers/latest/aws-vpc-connectivity-options/aws-direct-connect-aws-transit-gateway.html) Transit VIF
- [Direct Connect - TGW](https://docs.aws.amazon.com/whitepapers/latest/aws-vpc-connectivity-options/aws-direct-connect-aws-transit-gateway-vpn.html) Public VIF (VPN)

Best practices

- [Quota](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html#bandwidth-quotas): 5000 attachments, 50Gbps per VPC attachment, and ...
- [Direct connection location](https://aws.amazon.com/directconnect/locations/)
- [docs aws](https://docs.aws.amazon.com/) **RECOMMENDED**
- [TGW FAQ](https://aws.amazon.com/transit-gateway/faqs/)

## Deploy Order

- step 1. deploy network stacks in us-east-1 and us-west-1, take note

  - RouteTableIdUsEast1, TgwAttachmentIdUsEast1
  - RouteTableIdWest1, TgwAttachmentIdUsWest1

- step 2. deploy ec2 stacks in us-east-2 and us-west-2

- step 3. deploy tgw peering from us-east-1 to us-west-1 (acceptor)

- step 4. manuall approval

- step 5. update tgw route table

## Entire Network Stack

vpc in us-east-1 including a tgw

```tsx
const networkStackUsEast1 = new VpcNetworkSack(app, "VpcNetworkSackUsEast1", {
  asn: 64512,
  cidr: "172.16.0.0/24",
  env: {
    region: "us-east-1",
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});
```

vpc in us-west-1 including a tgw

```tsx
const networkStackUsWest1 = new VpcNetworkSack(app, "VpcNetworkStackUsWest1", {
  asn: 64513,
  cidr: "172.16.1.0/24",
  env: {
    region: "us-west-1",
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});
```

ec2 in us-east-1 for ping

```tsx
const ec2UsEast1 = new Ec2Stack(app, "Ec2StackUsEast1", {
  vpcNetworkStack: networkStackUsEast1,
  env: {
    region: "us-east-1",
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

ec2UsEast1.addDependency(networkStackUsEast1);
```

ec2 in us-west-1 for ping

```tsx
const ec2UsWest1 = new Ec2Stack(app, "Ec2StackUsWest1", {
  vpcNetworkStack: networkStackUsWest1,
  env: {
    region: "us-west-1",
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

ec2UsWest1.addDependency(networkStackUsWest1);
```

tgw peering attachment

```tsx
export class TgwPeering extends Stack {
  constructor(scope: Construct, id: string, props: TgwPeeringProps) {
    super(scope, id, props);

    new aws_ec2.CfnTransitGatewayPeeringAttachment(
      this,
      "TransitGatewayPeeringAttachmentDemo",
      {
        transitGatewayId: props.transitGatewayId,
        peerTransitGatewayId: props.transitGatewayId,
        peerRegion: props.peerRegion,
        peerAccountId: props.peerAccountId,
      }
    );
  }
}
```

tgw peering acceptance

```tsx
manually accept by clicking mouse
```

tgw routes update

```tsx
export class TgwRouteTable extends Stack {
  constructor(scope: Construct, id: string, props: TgwRouteTableProps) {
    super(scope, id, props);

    new aws_ec2.CfnTransitGatewayRoute(
      this,
      `TgwRoutTable-${this.region}`,
      {
        transitGatewayRouteTableId: props.routeTableId,
        blackhole: false,
        destinationCidrBlock: props.destCidr,
        transitGatewayAttachmentId: props.attachmentId
      }
    )
  }
```

## Network Stack Per Region

create a vpc with one private-isolated subnet

```tsx
this.vpc = new aws_ec2.Vpc(this, "VpcTgwDemo", {
  vpcName: "VpcTgwDemo",
  maxAzs: 1,
  cidr: props.cidr,
  subnetConfiguration: [
    {
      cidrMask: 25,
      name: "Isolated",
      subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED,
    },
  ],
});
```

create a tgw

```tsx
this.tgw = new aws_ec2.CfnTransitGateway(this, "TgwDemo", {
  // 64512 to 65534 for 16-bit ASNs. The default is 64512.
  amazonSideAsn: props.asn,
  autoAcceptSharedAttachments: "enable",
  defaultRouteTableAssociation: "enable",
  defaultRouteTablePropagation: "enable",
});
```

create tgw vpc attachment

```tsx
const tgwAttachment = new aws_ec2.CfnTransitGatewayAttachment(
  this,
  "TgwAttach",
  {
    transitGatewayId: this.tgw.ref,
    vpcId: this.vpc.vpcId,
    subnetIds: this.vpc.isolatedSubnets.map((subnet) => subnet.subnetId),
  }
);
```

vpc endpoint ssm (need 3)

```tsx
new aws_ec2.InterfaceVpcEndpoint(this, "SsmVpcEndpoint", {
  service: aws_ec2.InterfaceVpcEndpointAwsService.SSM,
  privateDnsEnabled: true,
  vpc: this.vpc,
});

new aws_ec2.InterfaceVpcEndpoint(this, "Ec2Message", {
  service: aws_ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
  privateDnsEnabled: true,
  vpc: this.vpc,
});

new aws_ec2.InterfaceVpcEndpoint(this, "SsmMessage", {
  service: aws_ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
  privateDnsEnabled: true,
  vpc: this.vpc,
});
```

## EC2 Stack

role for ec2

```tsx
const role = new aws_iam.Role(this, "RoleForEc2TgwDemo", {
  roleName: `RoleForEc2Ec2TgwDemo${this.region}`,
  assumedBy: new aws_iam.ServicePrincipal("ec2.amazonaws.com"),
  managedPolicies: [
    aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
      "AmazonSSMManagedInstanceCore"
    ),
  ],
  description: "this is a custome role for assuming ssm role",
});
```

security group - open icmp for ping

```tsx
const sg = new aws_ec2.SecurityGroup(this, "SecurityGroupForEc2TgwDemo", {
  securityGroupName: "SecurityGroupForEc2TgwDemo",
  vpc: props.vpcNetworkStack.vpc,
});

sg.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.allIcmp());
```

create an ec2

```tsx
new aws_ec2.Instance(this, "Ec2InstanceTgwDemo", {
  vpc: props.vpcNetworkStack.vpc,
  instanceType: aws_ec2.InstanceType.of(
    aws_ec2.InstanceClass.BURSTABLE3_AMD,
    aws_ec2.InstanceSize.NANO
  ),
  machineImage: new aws_ec2.AmazonLinuxImage({
    generation: aws_ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
  }),
  securityGroup: sg,
  role: role,
});
```

routes for subnets - nice looop

```tsx
for (var subnet of props.vpcNetworkStack.vpc.isolatedSubnets) {
  new aws_ec2.CfnRoute(this, "Route", {
    routeTableId: subnet.routeTable.routeTableId,
    destinationCidrBlock: "0.0.0.0/0",
    transitGatewayId: props.vpcNetworkStack.tgw.ref,
  });
```
