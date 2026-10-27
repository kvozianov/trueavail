from pathlib import Path

VERSION = "0.2.0"

# Synthetic demo clock: history ends on this date, the forecast starts the day after.
DEFAULT_AS_OF = "2026-05-18"
DEMO_HISTORY_SEED = 42
DEFAULT_FORECAST_HORIZON_DAYS = 14
DEFAULT_HISTORY_DAYS = 120
DEFAULT_ACCOUNTS = 5
MAX_ACCOUNTS = 12
MIN_HISTORY_DAYS_PER_ACCOUNT = 30

MAD_ZSCORE_THRESHOLD = 4.0
EWMA_ALPHA = 0.35
HHI_ALERT_THRESHOLD = 0.25
DOWNGRADE_SCORE_DELTA = 25
OPTIMIZER_EPSILON = 1e-6

# Alert severity: red if the gap exceeds this share of the required buffer.
RED_GAP_SHARE_OF_BUFFER = 0.10

PACKAGE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = PACKAGE_DIR.parent
DATA_DIR = BACKEND_DIR / "data"
REFERENCE_DIR = DATA_DIR / "reference"
SAMPLES_DIR = DATA_DIR / "samples"

CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
