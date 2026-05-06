from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AI Resume ATS Optimizer"
    api_prefix: str = "/api/v1"
    debug: bool = False

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
    ]

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    session_ttl_seconds: int = 86400  # 24 hours
    embedding_ttl_seconds: int = 86400  # 24 hours

    # File upload limits
    max_file_size_bytes: int = 5 * 1024 * 1024  # 5MB

    # LLM
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_question_timeout_seconds: int = 60
    llm_suggestion_timeout_seconds: int = 90

    # LLM Recovery Engine (resume parser gap-filling)
    openai_api_key: str = ""
    parser_recovery_model: str = "gpt-4o-mini"
    parser_recovery_enabled: bool = True
    parser_recovery_timeout_seconds: int = 60  # per agent call

    # File storage
    generated_files_dir: str = "generated"
    download_base_url: str = "http://localhost:8000/api/v1"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
