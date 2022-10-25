#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import {
  Ec2Stack,
  VpcNetworkSack,
  TgwPeering,
  TgwRouteTable,
} from "../lib/transit-gateway-stack";

const app = new cdk.App();

// ====================== STEP 1: NETWORK & EC2 ==================
const DEV_REGION = "ap-northeast-1";
const PROD_REGION = "ap-northeast-2";
// cidr for vpc in us-east-1
const DEV_CIDR = "172.16.1.0/24";
// cidr for vpc in us-west-1
const PROD_CIDR = "172.16.2.0/24";
// peer tgw id - us-west-1 tgw
const PeerTransitGatewayId = "tgw-02d7a03b02abac430";

// ====================== STEP 2: TGW PEER ======================
// tgw route table id - us-east-1
const RouteTableIdDev = "tgw-rtb-0326034a4e3a60830";
// tgw rout table id - us-west-1
const RouteTableIdProd = "tgw-rtb-02a3c9160962c058e";

// ====================== STEP 3: TGW PEER ======================
// tgw-peer attachment id - us-east-1
const TgwAttachmentIdDev = "tgw-attach-0f186a645b84c652e";
// tgw-peer attachment id - us-west-1
const TgwAttachmentIdProd = "tgw-attach-0f186a645b84c652e";

// network stack us-east-1
const networkStackDev = new VpcNetworkSack(app, "VpcNetworkSackDev", {
  asn: 64512,
  cidr: DEV_CIDR,
  env: {
    region: DEV_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

// network us-west-1
const networkStackProd = new VpcNetworkSack(app, "VpcNetworkStackProd", {
  asn: 64513,
  cidr: PROD_CIDR,
  env: {
    region: PROD_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

// ec2 us-east-1
const ec2Dev = new Ec2Stack(app, "Ec2StackDev", {
  vpcNetworkStack: networkStackDev,
  env: {
    region: DEV_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

ec2Dev.addDependency(networkStackDev);

// ec us-west-1
const ec2Prod = new Ec2Stack(app, "Ec2StackProd", {
  vpcNetworkStack: networkStackProd,
  env: {
    region: PROD_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

ec2Prod.addDependency(networkStackProd);

// tgw peering attachment: us-east-1 to us-west-1 (acceptor)
const peer = new TgwPeering(app, "TransitGatewayPeering", {
  transitGatewayId: networkStackDev.tgw.ref,
  peerTransitGatewayId: PeerTransitGatewayId,
  peerRegion: PROD_REGION,
  peerAccountId: process.env.CDK_DEFAULT_ACCOUNT!.toString(),
  env: {
    region: DEV_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

// acceptance manually

// us-east-1 update tgw routes
new TgwRouteTable(app, "TgwRouteTableDev", {
  routeTableId: RouteTableIdDev,
  attachmentId: TgwAttachmentIdDev,
  destCidr: PROD_CIDR,
  env: {
    region: DEV_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

// us-west-1 update tgw routes
new TgwRouteTable(app, "TgwRouteTableProd", {
  routeTableId: RouteTableIdProd,
  attachmentId: TgwAttachmentIdProd,
  destCidr: DEV_CIDR,
  env: {
    region: PROD_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});
