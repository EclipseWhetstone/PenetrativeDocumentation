from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json
import time
import subprocess
import os

try:
    from scanner import run_all_scans
except ImportError:
    def run_all_scans():  # pragma: no cover - fallback for missing scanner module
        return ["ERROR: scanner.py not found or contains an error."]

from intelligence_agent import AdaptiveIntelligence

# --- VirtualBox Configuration ---
VM_NAME = "Windows 10 Dev"  # The name of our VM
SNAPSHOT_NAME = "CleanInstall"   # The name of the snapshot to revert to
VBOXMANAGE_PATH = "C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe"

# --- GUEST VM CONFIGURATION ---
GUEST_USERNAME = "VMUsername"
GUEST_PASSWORD = "VMPassword"
GUEST_PYTHON_PATH = "C:\\Users\\VMUsername\\AppData\\Local\\Programs\\Python\\Python39\\python.exe"
GUEST_SCRIPT_PATH = "C:\\Users\\VMUsername\\Desktop\\client\\main.py"

app = Flask(__name__)
CORS(app)

@app.get("/")
def index():
    return {"ok": True, "service": "PenetrativeDocumentation API",
            "routes": ["/api/report", "/health"]}, 200

@app.get("/health")
def health():
    return "ok", 200

intelligence_agent = AdaptiveIntelligence()


def run_vbox_command(args):
    """Helper function to run VBoxManage commands."""
    command = [VBOXMANAGE_PATH] + args
    print(f"Running command: {' '.join(command)}")
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        return True, result.stdout
    except FileNotFoundError:
        error_msg = f"Error: VBoxManage.exe not found at '{VBOXMANAGE_PATH}'. Please check the path."
        print(error_msg)
        return False, error_msg
    except subprocess.CalledProcessError as exc:
        error_msg = f"Error executing command: {exc}\n{exc.stderr}"
        print(error_msg)
        return False, error_msg
    except subprocess.TimeoutExpired:
        error_msg = "Error: VBoxManage command timed out after 2 minutes."
        print(error_msg)
        return False, error_msg


def revert_to_snapshot():
    """Reverts the VM to the clean snapshot."""
    return run_vbox_command(["snapshot", VM_NAME, "restore", SNAPSHOT_NAME])


def start_vm():
    """Starts the VM without pulling up the window."""
    return run_vbox_command(["startvm", VM_NAME, "--type", "headless"])


def stop_vm():
    """Shuts down the VM."""
    return run_vbox_command(["controlvm", VM_NAME, "poweroff"])


def run_in_guest():
    """Executes the Python client application inside the running guest VM."""
    args = [
        "guestcontrol", VM_NAME, "run",
        "--username", GUEST_USERNAME,
        "--password", GUEST_PASSWORD,
        "--exe", GUEST_PYTHON_PATH,
        "--", GUEST_SCRIPT_PATH,
        "--headless",
    ]
    return run_vbox_command(args)


@app.route('/api/scan', methods=['GET'])
def get_scan_results():
    """Runs the host vulnerability scanner."""
    print("Received request to /api/scan. Running scanner...")
    try:
        results = run_all_scans()
        print(f"Scan complete. Found {len(results)} items.")
        return jsonify(results)
    except Exception as exc:  # pragma: no cover - defensive logging for unexpected issues
        print(f"An error occurred during scan: {exc}")
        return jsonify({"error": "An internal server error occurred during the scan."}), 500


@app.route('/api/simulate', methods=['POST'])
def start_simulation():
    """Runs the simulation pipeline and streams updates back to the UI."""

    def event_stream():
        yield "data: Reverting VM to clean snapshot...\n\n"
        success, output = revert_to_snapshot()
        if not success:
            yield f"data: ERROR: {output}\n\n"
            yield "data: FINISHED\n\n"
            return
        yield "data: Revert successful.\n\n"
        time.sleep(1)

        yield "data: Starting virtual machine... (this may take a moment)\n\n"
        success, output = start_vm()
        if not success:
            yield f"data: ERROR: {output}\n\n"
            yield "data: FINISHED\n\n"
            return
        yield "data: VM started successfully in the background.\n\n"
        time.sleep(30)

        yield "data: Executing the client application inside the VM...\n\n"
        success, output = run_in_guest()
        if not success:
            yield f"data: ERROR during guest execution: {output}\n\n"
        else:
            yield "data: Client execution complete. Parsing results...\n\n"
            try:
                scan_results = json.loads(output)
                if scan_results.get("status") == "success":
                    vulnerabilities = scan_results.get("vulnerabilities", [])
                    if vulnerabilities:
                        yield "data: --- SIMULATION RESULTS ---\n\n"
                        for vuln in vulnerabilities:
                            yield f"data: {vuln.replace('\\n', ' ')}\n\n"
                    else:
                        yield "data: Scan completed inside VM. No vulnerabilities found.\n\n"
                else:
                    error_msg = scan_results.get('message', 'Unknown error in client.')
                    yield f"data: ERROR from client: {error_msg}\n\n"
            except json.JSONDecodeError:
                yield "data: ERROR: Failed to parse JSON response from the client script in the VM.\n\n"
                print(f"Raw output from guest: {output}")

        yield "data: Shutting down the VM...\n\n"
        success, output = stop_vm()
        if not success:
            yield f"data: ERROR: {output}\n\n"
        else:
            yield "data: VM powered off.\n\n"

        yield "data: FINISHED\n\n"

    return Response(event_stream(), mimetype='text/event-stream')


@app.route('/api/intelligence', methods=['GET'])
def load_intelligence():
    """Expose the adaptive intelligence summary to the React frontend."""
    return jsonify(intelligence_agent.get_summary())


@app.route('/api/intelligence', methods=['POST'])
def record_intelligence():
    """Record the outcome of an infiltration attempt to continuously tune strategy."""
    payload = request.get_json(silent=True) or {}
    technique = payload.get("technique")
    target = payload.get("target")
    success = payload.get("success")
    dwell_time = payload.get("dwellTime")
    notes = payload.get("notes")

    if not technique or target is None or success is None:
        return jsonify({
            "error": "Fields 'technique', 'target', and 'success' are required to record intelligence."
        }), 400

    if isinstance(success, str):
        normalized_success = success.strip().lower() in {"true", "success", "1", "win"}
    else:
        normalized_success = bool(success)

    record = intelligence_agent.record_attempt(
        technique=technique,
        target=str(target),
        success=normalized_success,
        dwell_time=dwell_time,
        notes=notes,
    )
    return jsonify(record), 201


if __name__ == '__main__':
    debug_flag = bool(int(os.environ.get("FLASK_DEBUG", "1")))
    app.run(debug=debug_flag, port=5000)
