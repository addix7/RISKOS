from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
import app.models  # Ensure all models are registered
from app.services.risk_engine import load_model

from app.routers import (
    auth,
    transactions,
    risk,
    spikes,
    investigations,
    graph,
    counterfactual,
    decision,
    reviews,
    chargebacks,
    model_health,
    dashboard,
    campaigns,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if they do not exist
    try:
        Base.metadata.create_all(bind=engine)
        print("[DATABASE] Schema checked / tables created.")
    except Exception as e:
        print(f"[DATABASE] Schema initialization note: {e}")

    # Load ML risk model artifact
    try:
        load_model()
    except Exception as e:
        print(f"[ML] Model load warning: {e}")

    yield

    # Shutdown
    print("[SHUTDOWN] RISKOS backend shutting down.")


app = FastAPI(
    title="RISKOS - AI Payment Risk Engine",
    description="Autonomous payment fraud detection, AI investigation, entity graph, and counterfactual simulation platform.",
    version="1.0.0",
    lifespan=lifespan,
)

# Standardized Error Handlers for Frontend Integration
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    headers = exc.headers or {}
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "path": str(request.url.path),
            }
        },
        headers=headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    formatted_errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        formatted_errors.append({
            "field": field,
            "message": err.get("msg", "Invalid value"),
            "type": err.get("type", "value_error"),
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": 422,
                "message": "Input validation failed. Please check your request parameters.",
                "details": formatted_errors,
                "path": str(request.url.path),
            }
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    print(f"[SERVER ERROR] {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": 500,
                "message": "An internal server error occurred while processing your request.",
                "path": str(request.url.path),
            }
        },
    )


# CORS middleware for frontend communication (supports Stitch, Vite, Next.js dev servers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(risk.router)
app.include_router(spikes.router)
app.include_router(investigations.router)
app.include_router(graph.router)
app.include_router(counterfactual.router)
app.include_router(decision.router)
app.include_router(reviews.router)
app.include_router(chargebacks.router)
app.include_router(model_health.router)
app.include_router(dashboard.router)
app.include_router(campaigns.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "system": "RISKOS",
        "version": "1.0.0",
        "status": "online",
        "mode": settings.env,
        "docs_url": "/docs",
        "openapi_url": "/openapi.json",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}