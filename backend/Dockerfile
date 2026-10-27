FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DATABASE_URL=sqlite:////app/var/trueavail.db

# libgomp1: OpenMP runtime required by the LightGBM wheel
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY trueavail ./trueavail
COPY data ./data
COPY scripts ./scripts

RUN useradd --create-home --uid 1000 app && mkdir -p /app/var && chown -R app:app /app/var
USER app

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:%s/health' % __import__('os').environ.get('PORT', '8000'), timeout=4).status == 200 else 1)"

CMD ["sh", "-c", "uvicorn trueavail.api:app --host 0.0.0.0 --port ${PORT:-8000}"]
