# DiRT (De-duplication in Real Time)

DiRT monitors the filesystem for changes as they happen, providing near real-time identification of duplicate files in UnRAID shares while prioritizing low resource usage.

## Purpose

The main goal of DiRT is to prevent file duplication across your UnRAID shares. It actively monitors file system events, and when a new file is added, it checks if the file already exists elsewhere. If a duplicate is found, it provides an interface to either delete the duplicate or replace it with a hardlink to the original file, thus saving space.

## Architecture

DiRT consists of two main components:

1.  **Node.js Backend**: A powerful backend that does the heavy lifting.
    *   It uses a WebSocket server to communicate with the frontend.
    *   It leverages `bullmq` queues to process file scanning and hashing in the background, ensuring the UI remains responsive.
    *   It uses `redis-om` to store file metadata in a Redis database, allowing for efficient querying of duplicate files.
    *   It uses the fast `blake3` hashing algorithm to identify duplicate files.
    *   It includes a Unix socket listener to receive file system events from other processes.

2.  **PHP/JavaScript Frontend**: A user-friendly web interface to manage duplicate files.
    *   It's built using PHP, but the main logic is in a JavaScript module.
    *   It uses `Tabulator.js` to display duplicate file information in an interactive table.
    *   It communicates with the backend via a WebSocket connection to send user actions and receive updates.

## Setup

### Prerequisites

*   UnRAID server
*   Node.js and npm
*   Redis

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/your-repository.git
    ```

2.  **Install Node.js dependencies**:
    ```bash
    cd <repository-directory>/nodejs
    npm install
    ```

3.  **Configure the plugin**:
    *   Copy the plugin files to the appropriate directories on your UnRAID server.
    *   The main configuration file is located at `/boot/config/plugins/bobbintb.system.dirt/dirt.cfg`. You can edit this file to specify the shares to monitor and other settings.

### Running the Application

1.  **Start the Node.js backend**:
    ```bash
    cd <repository-directory>/nodejs
    node dirt.js
    ```
    The WebSocket server will start on port 3000.

2.  **Access the frontend**:
    *   Open the DiRT page in your UnRAID web interface.

## Usage

The main interface of DiRT is a table that displays groups of duplicate files. For each group, you can perform the following actions:

*   **Select an original file**: Use the radio button to select one file as the "original". The other files in the group will be considered duplicates.
*   **Mark for deletion**: Use the trash can icon to mark a duplicate file for deletion.
*   **Mark for linking**: Use the link icon to mark a duplicate file to be replaced with a hardlink to the original file.

Once you have marked the files, you can use the "Process" button to execute the actions. The "Clear" button will clear all pending actions.
