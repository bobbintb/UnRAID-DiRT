from datetime import datetime
import pytest
from playwright.sync_api import Page

@pytest.mark.describe("DIRT Tabulator Page Screenshot")
def test_tabulator_screenshot(page: Page):
    # Go to the page
    page.goto("http://localhost/plugins/bobbintb.system.dirt/index.php")

    # Wait for 10 seconds to allow the page to load
    page.wait_for_timeout(10000)

    # Generate timestamped filename
    timestamp = datetime.now().isoformat().replace(":", "-").replace(".", "-")
    filename = f"test-results/screenshot-{timestamp}.png"

    # Take a full-page screenshot
    page.screenshot(path=filename, full_page=True)
