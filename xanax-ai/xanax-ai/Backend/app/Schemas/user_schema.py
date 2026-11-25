from pydantic import BaseModel


class UserCreateSchema(BaseModel):
    username: str
    password: str


class LoginUserSchema(UserCreateSchema):
    pass
class UserCreateResponseSchema(BaseModel):
    id: int
    username: str


class AddApiKey(BaseModel):
    gemini_api_key: str
    openweather_api_key: str | None = None


class AddLocation(BaseModel):
    location: str | None = None


class UserSettingsResponseSchema(BaseModel):
    id: int
    username: str
    location: str | None = None
    gemini_api_key: str | None = None
    openweather_api_key: str | None = None
    has_gemini_key: bool = False
    has_openweather_key: bool = False
    gemini_key_passed: bool = False
    openweather_key_passed: bool = False


class TestApiKeysSchema(BaseModel):
    gemini_api_key: str | None = None
    openweather_api_key: str | None = None


class KeyTestResult(BaseModel):
    valid: bool
    message: str


class TestApiKeysResponseSchema(BaseModel):
    gemini: KeyTestResult | None = None
    openweather: KeyTestResult | None = None

