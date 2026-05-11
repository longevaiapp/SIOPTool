import bcrypt, jwt
try:
    import email_validator
    ev = getattr(email_validator, "__version__", "?")
except ImportError:
    ev = "MISSING"
print(f"bcrypt={bcrypt.__version__} pyjwt={jwt.__version__} email_validator={ev}")
