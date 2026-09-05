from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

ENV_FILE_PATH = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH) if ENV_FILE_PATH.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    database_url: str = "sqlite:///./riskos.db"
    anthropic_api_key: str = ""
    jwt_secret: str = "dev-secret-change-in-production-riskos-2025"
    model_artifact_path: str = "./models/risk_model.pkl"
    env: str = "development"

    investigation_score_threshold: float = 50.0
    spike_std_multiplier: float = 2.5

    historical_fraud_loss_rate: float = 0.003
    verification_effectiveness: float = 0.85
    verification_dropout_rate: float = 0.08
    friction_cost_ceiling: int = 500000

    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()