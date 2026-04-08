from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="LongevAI SIOP Tool API",
    description="AIaaS HealthTech Factory OS — Juntify Platform",
    version="0.1.0",
)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# Register routers here as modules are built:
# from routers import crm, rfq, contracts
# app.include_router(crm.router, prefix="/api/crm", tags=["CRM"])
