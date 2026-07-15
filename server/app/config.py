from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./app.db"
    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 7 * 24 * 60
    LLM_PROVIDER: str = "deepseek"
    UPLOAD_DIR: str = "uploads"

    # DeepSeek
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com/v1"
    DEEPSEEK_MODEL: str = "deepseek-v4-pro"

    # Embedding
    # provider: hash / openai_compatible
    EMBEDDING_PROVIDER: str = "hash"
    EMBEDDING_API_KEY: str = ""
    EMBEDDING_BASE_URL: str = "https://api.openai.com/v1"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_TIMEOUT_SECONDS: float = 30.0

    class Config:
        env_file = ".env"


settings = Settings()
