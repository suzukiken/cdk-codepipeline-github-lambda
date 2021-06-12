```
python -m venv test/env
source test/env/bin/activate
pip install boto3
pip install python-lambda-local
source test/setenv.sh
python-lambda-local -f lambda_handler lambda/build.py test/event.json
```