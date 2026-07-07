"""
Application Configuration
==========================
All environment-variable-driven settings using pydantic-settings.
Reads from a .env file or real environment variables (Docker / CI).
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── Database ───
    DATABASE_URL: str = "postgresql://steel_user:steel_pass_change_me@localhost:5432/steel_defects"

    # ─── JWT Auth ───
    JWT_SECRET: str = "change-me-to-a-long-random-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ─── Model ───
    MODEL_PATH: str = "/app/model/best_model.pt"
    NUM_CLASSES: int = 7

    # ─── File Upload ───
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # ─── CORS ───
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ─── Inference ───
    DEFECT_CONFIDENCE_THRESHOLD: float = 0.70   # min confidence to log webcam frames


settings = Settings()
