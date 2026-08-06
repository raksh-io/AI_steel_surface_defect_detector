FROM python:3.11-slim

# Install system dependencies for OpenCV and psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install ALL Python dependencies (web stack + AI stack)
# For Docker we install everything here; locally we reuse the AI venv.
COPY requirements-docker.txt .
RUN pip install --no-cache-dir -r requirements-docker.txt

# Copy application code and model
COPY app/ ./app/
COPY model/ ./model/

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
