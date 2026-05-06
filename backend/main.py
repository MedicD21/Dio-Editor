from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import projects, jobs, audio

app = FastAPI(
    title="Dio Editor API",
    description="AI-powered automatic video editing pipeline",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(jobs.router)
app.include_router(audio.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "dio-editor-backend"}
