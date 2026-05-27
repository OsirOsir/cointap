import os
from datetime import timedelta


class BaseConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # M-Pesa
    MPESA_CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY", "")
    MPESA_CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET", "")
    MPESA_SHORTCODE = os.getenv("MPESA_SHORTCODE", "174379")
    MPESA_PASSKEY = os.getenv("MPESA_PASSKEY", "")
    MPESA_CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL", "")
    MPESA_B2C_SHORTCODE = os.getenv("MPESA_B2C_SHORTCODE", "")
    MPESA_B2C_INITIATOR_NAME = os.getenv("MPESA_B2C_INITIATOR_NAME", "")
    MPESA_B2C_SECURITY_CREDENTIAL = os.getenv("MPESA_B2C_SECURITY_CREDENTIAL", "")
    MPESA_B2C_RESULT_URL = os.getenv("MPESA_B2C_RESULT_URL", "")
    MPESA_B2C_TIMEOUT_URL = os.getenv("MPESA_B2C_TIMEOUT_URL", "")
    MPESA_ENVIRONMENT = os.getenv("MPESA_ENVIRONMENT", "sandbox")

    # App defaults
    MIN_WITHDRAWAL = float(os.getenv("MIN_WITHDRAWAL", "200"))
    REFERRAL_BONUS_PERCENT = float(os.getenv("REFERRAL_BONUS_PERCENT", "3"))
    SOLDOUT_FLOOR = float(os.getenv("SOLDOUT_FLOOR", "50000"))
    BATCH_SIZE = float(os.getenv("BATCH_SIZE", "500000"))


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "postgresql://cointap:cointap@localhost:5432/cointap")


class ProductionConfig(BaseConfig):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
