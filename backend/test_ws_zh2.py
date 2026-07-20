import asyncio
import websockets
import json

async def test():
    uri = "ws://localhost:8000/ws/translate/"
    try:
        async with websockets.connect(uri) as ws:
            response = await ws.recv()
            print("Connected:", response)
            
            await ws.send(json.dumps({
                "text": "hello",
                "source_lang": "en",
                "target_lang": "zh-CN"
            }))
            
            response = await ws.recv()
            print("Response:", response)
    except Exception as e:
        print("Error:", e)

asyncio.run(test())
