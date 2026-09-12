import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True, 
        reload_dirs=[
            r"c:\SIH\backend\app",
            r"c:\SIH\models",
            r"c:\SIH\agent",
            r"c:\SIH\audit",
            r"c:\SIH\network_monitor",
            r"c:\SIH\rag",
            r"c:\SIH\document_processing"
        ],
        reload_excludes=["*.db", "*.sqlite", "*sandbox*", "*uploads*"]
    )

