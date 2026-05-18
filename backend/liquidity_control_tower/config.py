from pathlib import Path

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

ROOT_DIR = Path(__file__).resolve().parents[2]
if load_dotenv is not None:
    load_dotenv(ROOT_DIR / ".env")

DEMO_NOW = "2026-05-18T09:00:00Z"
DEFAULT_FORECAST_HORIZON_DAYS = 14
DEFAULT_HISTORY_DAYS = 120
MAD_ZSCORE_THRESHOLD = 4.0
EWMA_ALPHA = 0.35
HHI_ALERT_THRESHOLD = 0.25
DOWNGRADE_SCORE_DELTA = 25
OPTIMIZER_EPSILON = 1e-6
DEFAULT_OPENAI_MODEL = "gpt-5.2"
AI_COUNCIL_TIMEOUT_SECONDS = 45

PACKAGE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = PACKAGE_DIR.parent
DATA_DIR = BACKEND_DIR / "data"
