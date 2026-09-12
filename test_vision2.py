import httpx
import asyncio
import base64

async def test():
    img_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="
    payload = {
        "messages": [
            {"role": "user", "content": "What is this image?", "images": [img_b64]}
        ],
        "stream": True
    }
    
    async with httpx.AsyncClient() as client:
        async with client.stream("POST", "http://localhost:8000/api/chat/", json=payload, timeout=60.0) as r:
            print("Status:", r.status_code)
            async for chunk in r.aiter_text():
                print(chunk)

asyncio.run(test())
