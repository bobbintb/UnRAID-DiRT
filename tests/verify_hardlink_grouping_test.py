import time
import pytest
import redis
import re
from playwright.sync_api import expect

@pytest.fixture
def redis_client():
    client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    yield client
    client.close()

def test_path_grouping_for_hardlinks(page, redis_client):
    """
    Verifies:
    1. Hardlinked files (same inode, multiple paths) are GROUPED into a single row in the UI.
    2. Actions set on that row apply to the entire inode.
    3. Hardlinked files display the visual link indicator.
    """

    redis_client.flushdb()

    hash_val = "hash_hardlink_test"
    ino_hardlink = "999"

    # File 1: Hardlink A & B (Ino 999)
    # We emulate RedisOM's array storage with '|' separator
    redis_client.hset(f"ino:{ino_hardlink}", mapping={
        "ino": ino_hardlink,
        "path": "/mnt/user/share/hardlink1.txt|/mnt/user/share/hardlink2.txt",
        "size": 1024,
        "hash": hash_val,
        "nlink": 2,
        "mtime": 1600000000
    })

    # File 2: Duplicate (Ino 888)
    redis_client.hset("ino:888", mapping={
        "ino": "888",
        "path": "/mnt/user/share/duplicate.txt",
        "size": 1024,
        "hash": hash_val,
        "nlink": 1,
        "mtime": 1600000000
    })

    # Navigate to page
    page.goto("http://localhost/plugins/bobbintb.system.dirt/index.php")

    # Wait for table to load
    expect(page.locator("#left-table")).to_be_visible(timeout=30000)

    # Locate the row for the hardlinked group (Inode 999)
    # It should contain BOTH paths in the same row
    row_hardlink = page.locator(".nested-table-container .tabulator-row").filter(has_text="/mnt/user/share/hardlink1.txt")
    expect(row_hardlink).to_be_visible(timeout=10000)
    expect(row_hardlink).to_contain_text("/mnt/user/share/hardlink2.txt")

    # Locate the row for duplicate (Inode 888)
    row_duplicate = page.locator(".nested-table-container .tabulator-row").filter(has_text="/mnt/user/share/duplicate.txt")
    expect(row_duplicate).to_be_visible(timeout=10000)

    # Verify Link Icon on hardlinks
    icon_hardlink = row_hardlink.locator(".fa-link[style*='rotate(45deg)']")
    expect(icon_hardlink).to_be_attached()

    # Check row_duplicate (duplicate, nlink=1) - should NOT have the rotated icon
    icon_duplicate = row_duplicate.locator(".fa-link[style*='rotate(45deg)']")
    expect(icon_duplicate).not_to_be_attached()

    # Verify Actions on grouped paths
    # Click delete on hardlink group
    delete_btn = row_hardlink.locator(".fa-trash")
    # In sandbox environment, sometimes click() fails if it thinks it's not visible
    delete_btn.evaluate("element => element.click()")

    # Verify it is selected
    expect(delete_btn).to_have_class(re.compile("selected"))

    # Verify it appears in the right table (Action Queue) with both paths
    right_table = page.locator("#right-table")
    expect(right_table).to_contain_text("/mnt/user/share/hardlink1.txt")
    expect(right_table).to_contain_text("/mnt/user/share/hardlink2.txt")
