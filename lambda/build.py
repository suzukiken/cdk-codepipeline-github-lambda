import boto3
import botocore
import zipfile
import tempfile
import os

def lambda_handler(event, context):
  print(event)
  
  key_id = event['CodePipeline.job']['data']['artifactCredentials']['accessKeyId']
  key_secret = event['CodePipeline.job']['data']['artifactCredentials']['secretAccessKey']
  session_token = event['CodePipeline.job']['data']['artifactCredentials']['sessionToken']
  
  session = boto3.session.Session(
    aws_access_key_id=key_id,
    aws_secret_access_key=key_secret,
    aws_session_token=session_token
  )
  
  s3_session = session.client('s3', config=botocore.client.Config(signature_version='s3v4'))

  source_bucket = event['CodePipeline.job']['data']['inputArtifacts'][0]['location']['s3Location']['bucketName']
  source_key = event['CodePipeline.job']['data']['inputArtifacts'][0]['location']['s3Location']['objectKey']
  
  '''
  with tempfile.NamedTemporaryFile() as tmpfile:
    s3_session.download_file(source_bucket, source_key, tmpfile.name)
    with zipfile.ZipFile(tmpfile.name, 'r') as zip:
      with zip.open('buildspec.yml') as buildspec:
        content = buildspec.read()
        print(content)
      for n in zip.namelist():
        if n.startswith('content/aws/') and n.endswith('.md'):
          print(n)
  '''
  
  tmpfile = tempfile.NamedTemporaryFile()
  s3_session.download_file(source_bucket, source_key, tmpfile.name)
  zipf = zipfile.ZipFile(tmpfile.name, 'r')
  
  s3_client = boto3.client('s3')
  dest_bucket = os.environ.get('BUCKET_NAME')
  dir_name = 'content/aws/'

  for n in zipf.namelist():
    if n.startswith(dir_name) and n.endswith('.md'):
      content = zipf.open(n).read()
      # print(content)
  
      dest_key = n.replace(dir_name, '')
      
      response = s3_client.put_object(
        Body=content,
        Bucket=dest_bucket,
        Key=dest_key
      )
      
      print(response)
  
  pipeline = boto3.client('codepipeline')
  
  response = pipeline.put_job_success_result(
      jobId=event['CodePipeline.job']['id']
  )
  
  return response
