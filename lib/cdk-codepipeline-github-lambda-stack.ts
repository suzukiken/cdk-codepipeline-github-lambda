import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as lambda from '@aws-cdk/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python';
import * as iam from '@aws-cdk/aws-iam';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';

export class CdkCodepipelineGithubLambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const basename = this.node.tryGetContext('basename')
    const repository = this.node.tryGetContext('repository')
    const owner = this.node.tryGetContext('owner')
    const branch = this.node.tryGetContext('branch')
    const secretname = this.node.tryGetContext('github_connection_codestararn_secretname')
    
    const codestararn = secretsmanager.Secret.fromSecretNameV2(this, 'Secret', secretname).secretValue.toString()
    
    // bucket
    
    const bucket = new s3.Bucket(this, 'bucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
      publicReadAccess: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.HEAD,
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          exposedHeaders: [
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2",
            "ETag",
          ],
          maxAge: 3000,
        },
      ],
    })
    
    // code pipeline
    
    const source_output = new codepipeline.Artifact()
    
    // To use GitHub version 2 source action
    // https://github.com/aws/aws-cdk/issues/11582
    const source_action = new codepipeline_actions.BitBucketSourceAction({
      actionName: basename + '-sourceaction',
      owner: owner,
      repo: repository,
      connectionArn: codestararn,
      output: source_output,
      branch: branch,
    })
    
    // Lambda to invalidate CloudFront cache
    
    const role = new iam.Role(this, "Role", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    })
    
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AWSCodePipelineCustomActionAccess",
      )
    )
    
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    )
    
    // Lambda of Dynamo Stream Poller
  
    const build_function = new PythonFunction(this, "Function", {
      entry: "lambda",
      index: "build.py",
      handler: "lambda_handler",
      runtime: lambda.Runtime.PYTHON_3_8,
      role: role,
      timeout: cdk.Duration.seconds(100),
      environment: {
        BUCKET_NAME: bucket.bucketName
      }
    })
    
    bucket.grantReadWrite(build_function)
    
    const build_action = new codepipeline_actions.LambdaInvokeAction({
      lambda: build_function,
      inputs: [source_output],
      actionName: basename + '-build-action',
      
    })

    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: basename + '-pipeline',
      stages: [
        {
          stageName: 'source',
          actions: [source_action],
        },
        {
          stageName: 'build',
          actions: [build_action],
        }
      ],
    })
    
    new cdk.CfnOutput(this, 'OutputDeploy', { value: bucket.bucketName })
    //new cdk.CfnOutput(this, 'OutputSource', { value: source_output.bucketName })
    //new cdk.CfnOutput(this, 'OutputBuild', { value: build_output.bucketName })
    
  }
}