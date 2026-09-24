# Multi-stage Dockerfile for Open CAF FastAPI Backend
FROM python:3.11-slim as builder

WORKDIR /app

# Install build tools & libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final runtime image
FROM python:3.11-slim as runner

WORKDIR /app

# Install runtime dependencies (libpq and curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Create non-root app user
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/storage_data && \
    chown -R appuser:appuser /app

COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
