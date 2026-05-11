from openai import OpenAI
from pydantic import BaseModel
from typing import TypeVar, Type
import os
from dotenv import load_dotenv

load_dotenv()

_client: OpenAI | None = None

T = TypeVar("T", bound=BaseModel)


def get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        _client = OpenAI(api_key=api_key)
    return _client


def call_openai(
    prompt: str,
    response_model: Type[T],
    model: str = "gpt-4o",
    temperature: float = 0.3,
    seed: int | None = None,
) -> T:
    """
    Call OpenAI and validate the response with a Pydantic model.

    IMPORTANT: AI recommends only — the caller must confirm before mutating
    any critical records (rule #5 in project rules).

    `seed`: when set with temperature=0, OpenAI returns near-deterministic
    output (same input → same output, best-effort).
    """
    client = get_openai_client()

    kwargs: dict = {
        "model": model,
        "temperature": temperature,
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
    }
    if seed is not None:
        kwargs["seed"] = seed

    response = client.chat.completions.create(**kwargs)

    content = response.choices[0].message.content
    if not content:
        raise ValueError("Empty response from OpenAI")

    return response_model.model_validate_json(content)
