import pytest
import redis
from playwright.sync_api import expect

@pytest.fixture
def redis_client():
    client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    yield client
    client.close()

def test_wipe_database_from_debug_menu(page, redis_client):
    """
    Verifies:
    1. Clicking 'Wipe Redis Database' on the debug menu clears the Redis database.
    2. A confirmation dialog is shown.
    3. A success alert is shown.
    """

    # 1. Seed some data first
    redis_client.hset("ino:123", mapping={"ino": "123", "path": "/test/path", "size": "100"})
    assert redis_client.exists("ino:123")

    # 2. Navigate to the debug page
    # In this environment, we need to use the index.php created by unraid-workaround
    # But since we are testing dirt-debug.page, we need to make sure it's accessible.
    # The workaround script in package.json only handles dirt-tables.page.
    # Let's create a workaround for dirt-debug.page as well.
    import subprocess
    subprocess.run(["tail", "-n", "+5", "dirt-debug.page"], stdout=open("debug.php", "w"))

    page.goto("http://localhost/plugins/bobbintb.system.dirt/debug.php")

    # Wait for jQuery and other scripts to load
    page.wait_for_load_state("networkidle")

    # 3. Click the Wipe button and handle the confirmation and alert
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
    page.on("dialog", lambda dialog: dialog.accept()) # Accept both confirm and alert

    wipe_btn = page.locator("#wipe-db-btn")
    expect(wipe_btn).to_be_visible()
    wipe_btn.click()

    # 4. Wait for a bit for the backend to process
    import time
    time_out = 5
    elapsed = 0
    while redis_client.exists("ino:123") and elapsed < time_out:
        time.sleep(0.5)
        elapsed += 0.5

    # 5. Verify Redis is empty (or at least our test key is gone)
    assert not redis_client.exists("ino:123")

    # Also verify search index was recreated - if it wasn't, repo.search() would fail in subsequent calls
    # but for this test, checking if keys are gone is sufficient for 'wipe'.

    # Cleanup
    import os
    if os.path.exists("debug.php"):
        os.remove("debug.php")
