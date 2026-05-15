FROM public.ecr.aws/lambda/python:3.11

# Copy requirements
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy function code
COPY lambda_ranking.py ${LAMBDA_TASK_ROOT}

# Set the handler
CMD ["lambda_ranking.lambda_handler"]
