"""Shutdown handshake between the desktop launcher and the FastAPI app.

The packaged application runs the launcher and uvicorn in the same process, so a
simple in-process event is enough: closing the app from the frontend sets the
event, and the launcher then stops uvicorn and exits.
"""

from __future__ import annotations

import threading
import time

#: Set when the application should shut down.
shutdown_requested = threading.Event()

_lock = threading.Lock()
_active_sessions: int = 0
_last_heartbeat: float = time.monotonic()
_has_received_heartbeat: bool = False
_startup_time: float = time.monotonic()
_client_closed_time: float | None = None

#: Grace periods (seconds)
STARTUP_GRACE_SECONDS = 30.0
AUTO_SHUTDOWN_DELAY_SECONDS = 5.0
CLIENT_CLOSED_DELAY_SECONDS = 2.0


def request_shutdown() -> None:
    """Ask the desktop launcher to stop the server and exit."""
    shutdown_requested.set()


def record_heartbeat() -> None:
    """Called periodically by the frontend UI while open."""
    global _last_heartbeat, _has_received_heartbeat, _client_closed_time
    with _lock:
        _last_heartbeat = time.monotonic()
        _has_received_heartbeat = True
        _client_closed_time = None


def session_opened() -> None:
    """Called when a frontend client connects via WebSocket."""
    global _active_sessions, _has_received_heartbeat, _last_heartbeat, _client_closed_time
    with _lock:
        _active_sessions += 1
        _has_received_heartbeat = True
        _last_heartbeat = time.monotonic()
        _client_closed_time = None


def session_closed() -> None:
    """Called when a frontend client disconnects via WebSocket."""
    global _active_sessions, _last_heartbeat
    with _lock:
        if _active_sessions > 0:
            _active_sessions -= 1
        _last_heartbeat = time.monotonic()


def record_client_closed() -> None:
    """Called by beforeunload / pagehide sendBeacon when a tab/window is closing."""
    global _client_closed_time
    with _lock:
        _client_closed_time = time.monotonic()


def should_auto_shutdown() -> bool:
    """True if the browser window has been closed and the grace period elapsed."""
    with _lock:
        now = time.monotonic()
        if now - _startup_time < STARTUP_GRACE_SECONDS:
            return False

        if not _has_received_heartbeat:
            return False

        if _active_sessions > 0:
            return False

        if _client_closed_time is not None and (now - _client_closed_time > CLIENT_CLOSED_DELAY_SECONDS):
            return True

        if now - _last_heartbeat > AUTO_SHUTDOWN_DELAY_SECONDS:
            return True

        return False
