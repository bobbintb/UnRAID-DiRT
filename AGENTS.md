# Agent Instructions

This document provides instructions and guidelines for AI agents working in this repository.

## Prerequisites and Initial Setup

The development environment is pre-configured to emulate an Unraid production system. The following services are running by default, meaning **no initial action is required** unless instructed otherwise.

### Core Prerequisites (Running by Default)

- **Repository Location:** The cloned repository is symlinked to the Unraid plugin directory: `/usr/local/emhttp/plugin/bobbintb.system.dirt/`.

- **Web Server & PHP**: The environment includes a running **nginx** web server (serving from `/usr/local/emhttp/`) and an **php8.3-fpm** server. These services are controlled by `systemd` and are enabled by default.

- **Redis/RediSearch**: This project requires a running Redis-compatible server with the RediSearch module (`redis-stack-server`). This service is controlled by `systemd` and is enabled by default.


_Troubleshooting Note:_ All core services are managed by `systemd`. If a service is suspected to be inactive, agents should use standard `systemctl` commands (e.g., `start`, `stop`, `status`) to manage them.

### Initial Setup (Action Required)

Before starting any development task, you **must** set up the Node.js environment by running the preparation script.

1. **Prepare the environment**: Run the `prep` script to install all dependencies and seed the Redis database. This only needs to be run **once per session**.

    ```
    npm run prep
    ```


## Running the Application

### Starting the Server

The Node.js server is the backend for the Unraid plugin.

- **To start the server for development:** Run this command from the project root. The underlying script starts the server in the background and redirects all output to the log file, `dirt_server.log`.

    ```
    npm start
    ```

- **To kill a running server process:** A dedicated script is provided to find and kill any running instances of the server.

    ```
    npm run stop
    ```


### Seeding the Database

To populate the Redis database with test data for development, use the seed script. **Note:** Use this script **after initial `npm run prep`** if the test data has been corrupted or needs to be refreshed **without reinstalling all dependencies.**

```
npm run seed
```

## 📋 Individual Scripts (Grouped)

The following scripts are available in `package.json` and can be run individually as needed.

### Primary Workflow Scripts (Multi-step)

These scripts manage common, compound tasks and are typically used in the normal development workflow.

- `npm run prep`: Installs all necessary dependencies (`npm install` and `playwright install`) and seeds the database. **This should be run only once before starting development.**

- `npm run restart`: A convenience script that stops and then restarts the server.

- `npm test`: Runs the entire test suite, which includes cleaning (`npm run clean`), preparing UI files (`npm run unraid-workaround`), starting the server (`npm start`), running tests (`pytest`), and stopping the server (`npm run stop`).


### Single-Purpose Utility Scripts

These scripts are useful for specific actions, troubleshooting, or maintenance.

- `npm start`: Starts the Node.js server, runs it in the background, and redirects all output to `dirt_server.log`.

- `npm run stop`: Stops any running Node.js server processes.

- `npm run seed`: Populates the Redis database with test data.

- `npm run unraid-workaround`: Removes the Unraid-specific frontmatter from the `.page` files, creating testable `index.php` files.

- `npm run clean`: Removes temporary files like `dirt_server.log` and `index.php`.


## 🧪 Frontend Testing and Environment Emulation

### Frontend Preparation (Unraid Workaround)

The frontend for this Unraid plugin consists of `.page` files, which are `php` files that contain a custom frontmatter header that **must** be stripped for local testing. The **`unraid-workaround` script** handles this conversion automatically by reading the `.page` files and creating testable `index.php` files.

- **Frontmatter Example:**

    ```
    Menu="pluginSettings:2"
    Title="DataTables"
    ---
    ```


### Frontend Libraries

This project uses Tabulator 6.3.1. Before implementing new features or customizations, **you must** consult the official documentation to see if a built-in solution exists. This is to avoid complication as well as wasted time and effort custom coding functions or features that are already natively handled by the Tabulator library.

- **`dirt-tables.page`**:

    - **Library**: Tabulator v6.3.1

    - **Documentation**: [https://tabulator.info/docs/6.3](https://tabulator.info/docs/6.3 "null")

- **FontAwesome**:

    - FontAwesome is loaded globally by the Unraid OS. You do **not** need to add it to `.page` files.


### Running Tests (Playwright)

This project uses **Playwright for Python** for end-to-end frontend testing.

- **Full Test Suite:** **Agents should prioritize using `npm test` for all full-suite verification.** This command is mandatory as it manages all prerequisites: cleaning the workspace, running the Unraid workaround script, managing the server lifecycle (start/stop), and running the tests.

    ```
    npm test
    ```

- **Running Specific Tests:** To run a specific test file for debugging, you can use the `pytest` command directly:

    ```
    pytest tests/your_test_file_test.py
    ```


### Test File Location and Naming

- **Test Scripts**: All test scripts are located in the `tests/` directory.

- **File Naming**: Test files must end with `_test.py` for the test runner to discover them.

- **Helper Modules**: Reusable test functions and helpers are stored in `tests/helpers/`.


### Scripting Standards

1. **Documentation**: Scripts should be well-documented with comments explaining their purpose and key steps.

2. **Reusability**: Common tasks should be abstracted into reusable functions and stored in the `tests/helpers` directory.


## Pre-commit Checklist

Do not run the full test suite (`npm test` or `pytest`) unless requested. Before using the `submit` tool, ensure that any requested tests have been run and have passed.
