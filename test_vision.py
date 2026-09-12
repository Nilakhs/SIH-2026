import httpx
import asyncio
import base64

async def test():
    # just create a dummy 1x1 png in base64
    img_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="
    payload = {
        "messages": [
            {"role": "user", "content": "What is this image?", "images": [img_b64]}
        ],
        "stream": False
    }
    
    async with httpx.AsyncClient() as client:
        r = await client.post("http://localhost:8000/api/chat/", json=payload, timeout=60.0)
        print("Status:", r.status_code)
        print("Response:", r.text)

asyncio.run(test())
