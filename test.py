import asyncio
import main as scan
import daemon

async def run_script_a():
    scan.main()

async def run_script_b():
    await daemon.main()
    # Wait for Script B to finish processing its queue
    await asyncio.sleep(0)

async def main():
    # Start running Script A and Script B concurrently
    tasks = [asyncio.create_task(run_script_a()), asyncio.create_task(run_script_b())]
    # Wait for both tasks to finish
    await asyncio.gather(*tasks)

# Start the event loop and run the main coroutine
asyncio.run(main())
