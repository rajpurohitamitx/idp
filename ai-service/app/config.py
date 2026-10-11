from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    port: int = 8001
    model_path: str = "./app/models/weights"
    backend_url: str = "http://localhost:4000"
    model_backend: str = "heuristic"
    model_name: str = "ppe-hazard-model"
    model_version: str = "1.0.0-heuristic"

    class Config:
        env_file = ".env"

settings = Settings()
