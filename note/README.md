+++
title="CodePipelineでLambdaを利用する"
tags=["CodePipeline", "Lambda"]
date="2021-06-13"
+++


Githubに記事を投稿するとLambdaが動いて機械的に「編集」してS3 Bucketに反映する、という仕組みを作ろうと思っているのだが、どう作るのが正しい方法なのか知らない。

もう少し詳しく書くと「知らない」の箇所は、Githubのリポジトリのコミットイベントを機械的にAWS側で認識する仕組みと、そのリポジトリの中に置いてある記事をAWSで取り出す仕組み、両方についてどう作るのが妥当なのか、を知らないという意味。

多分GithubにはWebhookみたいなものがあるだろうし、リポジトリの中の記事はAPIで取り出せることは知っているから、それをAPI  GatewayとLambdaを使って作ればいいんじゃないかというのは想像できる。

もう1つの方法はCodePipelineを使って、ソースとしてGithubのリポジトリを指定しておいて、デプロイの仕組みにLambdaを挟むというもの。

で、経験値を貯めたいのでどちらかというとどうやって実現するのかよくわからないCodePipelineの方で作ってみた。

CodePipelineのデータソースがGithubのリポジトリで、リポジトリにコミットがあるとS3バケットにzip圧縮されたリポジトリの中身が置かれるので、それをLambdaで開封して中の記事群をS3に移動するということをしてみている。「編集」的な機能は時間がなくてまだ作れていない。

[このプロジェクトのGithubのリポジトリ](https://github.com/suzukiken/cdk-codepipeline-github-lambda)

自分が知らなかったことで今回作って知ったこと。

* リポジトリにコミットがあるとソースのArtifactとして指定したS3バケットにリポジトリの中身がzip圧縮された状態で置かれる
* そのzip圧縮されたオブジェクトを取り出すには、Lambdaのイベント情報として得られるIAM権限を利用する
* Lambdaの処理完了は[put-job-success-result](https://github.com/suzukiken/cdk-codepipeline-github-lambda/blob/ed79ca8ddf3a64556d9c567d43e033ab8ebecec3/lambda/build.py#L62)を使ってCodePipelineに伝える

やっていることはかなり異なるけれど参考にした[AWSのドキュメント](https://docs.aws.amazon.com/ja_jp/codepipeline/latest/userguide/actions-invoke-lambda-function.html)
